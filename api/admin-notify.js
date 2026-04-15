/**
 * 관리자 카카오톡 알림 발송 API
 * POST /api/admin-notify
 */

import { createClient } from '@supabase/supabase-js';

async function verifyAdmin(req) {
  const token = (req.headers['authorization'] || '').replace('Bearer ', '').trim();
  if (!token) return false;
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  return !error && !!user;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://www.gameboostpro.co.kr');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!await verifyAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });

  const { orderId, buyerName, status, message } = req.body;

  if (!orderId || !message) {
    return res.status(400).json({ success: false, message: '필수 정보가 없습니다.' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
  const KAKAO_APP_KEY = process.env.KAKAO_REST_API_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Supabase 환경변수가 설정되지 않았습니다.');
    return res.status(500).json({ success: false, message: '서버 설정 오류' });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // 1. 주문 정보 조회 (order_id로)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, customer_id, order_id')
      .eq('order_id', orderId)
      .single();

    if (orderError || !order) {
      return res.status(404).json({ success: false, message: '주문을 찾을 수 없습니다.' });
    }

    // 2. 고객의 카카오 액세스 토큰 조회
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('kakao_access_token')
      .eq('id', order.customer_id)
      .single();

    if (customerError || !customer || !customer.kakao_access_token) {
      return res.status(400).json({
        success: false,
        message: '고객의 카카오톡 정보를 찾을 수 없습니다.'
      });
    }

    // 3. 카카오 API로 메모 발송
    const templateObject = {
      object_type: 'text',
      text: `GameBoost Pro 주문 알림\n\n주문번호: ${orderId}\n상태: ${status}\n\n${message}`,
      link: {
        web_url: 'https://www.gameboostpro.co.kr'
      }
    };

    const kakaoRes = await fetch('https://kapi.kakao.com/v2/api/talk/memo/default/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${customer.kakao_access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ template_object: JSON.stringify(templateObject) })
    });

    if (!kakaoRes.ok) {
      const errorData = await kakaoRes.json();
      console.error('Kakao API error:', errorData);

      // 토큰 만료 시 안내
      if (kakaoRes.status === 401) {
        return res.status(401).json({
          success: false,
          message: '고객의 카카오톡 토큰이 만료되었습니다. 고객이 다시 로그인해야 합니다.'
        });
      }

      return res.status(500).json({
        success: false,
        message: '카카오톡 알림 발송에 실패했습니다.'
      });
    }

    return res.status(200).json({
      success: true,
      message: '카카오톡 알림이 발송되었습니다.'
    });

  } catch (err) {
    console.error('Admin notify error:', err);
    return res.status(500).json({
      success: false,
      message: '알림 발송 실패'
    });
  }
}
