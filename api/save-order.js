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
    kakaoId, payMethod,
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
    console.log('[save-order] Supabase 연결됨');

    let customerId = null;

    // 1. customers upsert (kakaoId 있을 때만)
    if (kakaoId) {
      console.log('[save-order] Customer upsert 시도:', { kakaoId, buyerName, buyerContact });
      const { data: customer, error: custErr } = await supabase
        .from('customers')
        .upsert(
          { kakao_id: kakaoId, nickname: buyerName || null, phone: buyerContact || null },
          { onConflict: 'kakao_id' }
        )
        .select('id')
        .single();

      if (custErr) {
        console.error('[save-order] Customer upsert 오류:', custErr);
        // customer 오류가 order 저장을 막지 않음
      } else if (customer) {
        customerId = customer.id;
        console.log('[save-order] Customer 저장됨:', customerId);
      }
    }

    // 2. orders insert
    console.log('[save-order] Order insert 시도:', { orderId, planName, amount, customerId });
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

    // 2-1. 텔레그램 알림 (환경변수 없으면 스킵, 실패해도 주문 저장엔 영향 없음)
    try {
      const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
      const TG_CHAT_RAW = process.env.TELEGRAM_CHAT_ID || '';
      const chatIds = TG_CHAT_RAW.split(',').map(s => s.trim()).filter(Boolean);
      if (TG_TOKEN && chatIds.length) {
        const isBank = (orderId || '').startsWith('BANK-');
        const payLabel = isBank ? '무통장입금 (확인 대기)' : (payMethod || '카드/간편결제');
        const gamesStr = Array.isArray(games) ? games.join(', ') : (games || '-');
        const lines = [
          `🔔 <b>새 주문이 들어왔습니다</b>`,
          ``,
          `📦 주문번호: <code>${orderId}</code>`,
          `🧾 상품: ${planName}`,
          `💰 결제금액: ₩${Number(amount).toLocaleString()}`,
          couponCode ? `🎟️ 쿠폰: ${couponCode} (-₩${Number(couponDiscount||0).toLocaleString()})` : null,
          `💳 결제수단: ${payLabel}`,
          `👤 이름: ${buyerName || '-'}`,
          `📞 연락처: ${buyerContact || '-'}`,
          `🎮 게임: ${gamesStr}`,
          memo ? `📝 메모: ${memo}` : null,
          ``,
          `🔗 https://www.gameboostpro.co.kr/admin`,
        ].filter(Boolean);
        const text = lines.join('\n');

        const results = await Promise.allSettled(chatIds.map(chatId =>
          fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text,
              parse_mode: 'HTML',
              disable_web_page_preview: true,
            }),
          }).then(async r => {
            if (!r.ok) throw new Error(`${r.status} ${await r.text().catch(() => '')}`);
            return chatId;
          })
        ));
        results.forEach((r, i) => {
          if (r.status === 'rejected') console.error(`[save-order] Telegram 발송 실패 (${chatIds[i]}):`, r.reason?.message || r.reason);
          else console.log(`[save-order] Telegram 알림 발송됨 (${chatIds[i]})`);
        });
      } else {
        console.log('[save-order] TELEGRAM_BOT_TOKEN/CHAT_ID 미설정 — 알림 스킵');
      }
    } catch (tgErr) {
      console.error('[save-order] Telegram 예외:', tgErr);
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
