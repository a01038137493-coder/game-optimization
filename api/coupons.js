/**
 * 쿠폰 유효성 검증 API
 * GET /api/coupons?code=GAMEBOOST10
 *
 * 프론트에서 쿠폰 적용 시 유효성 확인
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code } = req.query;
  if (!code) {
    return res.status(400).json({ valid: false, message: '쿠폰 코드를 입력해주세요.' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Supabase 환경변수가 설정되지 않았습니다.');
    return res.status(500).json({ valid: false, message: 'Server configuration error' });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: coupon, error } = await supabase
      .from('coupons')
      .select('code, type, value, label, max_uses, used_count, is_active, expires_at')
      .eq('code', code.toUpperCase())
      .single();

    // 쿠폰 없음
    if (error || !coupon) {
      return res.status(404).json({
        valid: false,
        message: '유효하지 않은 쿠폰입니다.',
      });
    }

    // 비활성화된 쿠폰
    if (!coupon.is_active) {
      return res.status(400).json({
        valid: false,
        message: '비활성화된 쿠폰입니다.',
      });
    }

    // 만료된 쿠폰
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return res.status(400).json({
        valid: false,
        message: '만료된 쿠폰입니다.',
      });
    }

    // 사용 횟수 초과
    if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
      return res.status(400).json({
        valid: false,
        message: '사용 횟수가 초과된 쿠폰입니다.',
      });
    }

    // 모든 검증 통과
    return res.status(200).json({
      valid: true,
      coupon,
    });
  } catch (err) {
    console.error('Coupons API 오류:', err);
    return res.status(500).json({
      valid: false,
      message: 'Internal server error',
      details: err.message,
    });
  }
}
