/**
 * 주문 저장 API
 * POST /api/save-order
 *
 * 결제 완료 후 프론트에서 호출
 * customers upsert → orders insert → 쿠폰 카운터 증가
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    orderId, planKey, planName, amount,
    couponCode, couponDiscount,
    buyerName, buyerContact, games, memo,
    kakaoId,
  } = req.body;

  if (!orderId || !planName || !amount) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Supabase 환경변수가 설정되지 않았습니다.');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    let customerId = null;

    // 1. customers upsert (kakaoId 있을 때만)
    if (kakaoId) {
      const { data: customer, error: custErr } = await supabase
        .from('customers')
        .upsert(
          { kakao_id: kakaoId, nickname: buyerName || null, phone: buyerContact || null },
          { onConflict: 'kakao_id' }
        )
        .select('id')
        .single();

      if (custErr) {
        console.error('Customer upsert 오류:', custErr);
        // customer 오류가 order 저장을 막지 않음
      } else if (customer) {
        customerId = customer.id;
      }
    }

    // 2. orders insert
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        order_id: orderId,
        customer_id: customerId,
        plan_key: planKey || null,
        plan_name: planName,
        amount,
        original_price: amount + (couponDiscount || 0),
        coupon_code: couponCode || null,
        coupon_discount: couponDiscount || 0,
        buyer_name: buyerName || null,
        buyer_contact: buyerContact || null,
        games: games || null,
        memo: memo || null,
        status: 'pending',
        pay_status: 'paid',
      })
      .select('id')
      .single();

    if (orderErr) {
      console.error('Order insert 오류:', orderErr);
      return res.status(500).json({ error: 'Failed to save order', details: orderErr.message });
    }

    // 3. 쿠폰 used_count 증가 (RPC)
    if (couponCode) {
      const { error: rpcErr } = await supabase.rpc('increment_coupon_uses', {
        p_code: couponCode,
      });

      if (rpcErr) {
        console.error('Coupon counter 증가 오류:', rpcErr);
        // coupon 오류가 order 저장 결과에 영향 없음
      }
    }

    return res.status(200).json({
      success: true,
      orderId: order.id,
      message: 'Order saved successfully',
    });
  } catch (err) {
    console.error('Save-order API 오류:', err);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
}
