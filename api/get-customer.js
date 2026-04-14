/**
 * 고객 정보 조회 API
 * GET /api/get-customer?kakaoId=<kakaoId>
 *
 * 로그인 시 Supabase에서 고객 정보 조회
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { kakaoId } = req.query;

  if (!kakaoId) {
    return res.status(400).json({ error: 'Missing kakaoId' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Supabase 환경변수가 설정되지 않았습니다.');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: customer, error: err } = await supabase
      .from('customers')
      .select('id, kakao_id, nickname, phone, email')
      .eq('kakao_id', kakaoId)
      .single();

    if (err && err.code !== 'PGRST116') {
      // PGRST116 = 레코드 없음 (정상)
      console.error('[get-customer] 조회 오류:', err);
      return res.status(500).json({ error: 'Failed to fetch customer', details: err.message });
    }

    if (!customer) {
      // 고객 정보 없음 (정상, 새 회원)
      return res.status(200).json({ customer: null, isNew: true });
    }

    return res.status(200).json({
      customer: {
        id: customer.id,
        kakaoId: customer.kakao_id,
        nickname: customer.nickname,
        phone: customer.phone,
        email: customer.email,
      },
      isNew: false,
    });
  } catch (err) {
    console.error('Get-customer API 오류:', err);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
}
