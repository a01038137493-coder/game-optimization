/**
 * 고객 정보 저장 API
 * POST /api/save-customer
 *
 * 회원가입 후 호출
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { kakaoId, nickname, phone, email } = req.body;

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

    console.log('[save-customer] Customer upsert 시도:', { kakaoId, nickname, phone, email });

    const { data: customer, error: err } = await supabase
      .from('customers')
      .upsert(
        { kakao_id: kakaoId, nickname: nickname || null, phone: phone || null, email: email || null },
        { onConflict: 'kakao_id' }
      )
      .select('id')
      .single();

    if (err) {
      console.error('[save-customer] Upsert 오류:', err);
      return res.status(500).json({ error: 'Failed to save customer', details: err.message });
    }

    console.log('[save-customer] Customer 저장됨:', customer.id);

    return res.status(200).json({
      success: true,
      customerId: customer.id,
      message: 'Customer saved successfully',
    });
  } catch (err) {
    console.error('Save-customer API 오류:', err);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
}
