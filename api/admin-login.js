/**
 * 관리자 로그인 API
 * POST /api/admin-login
 *
 * Supabase Authentication으로 검증
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

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: '이메일과 비밀번호를 입력하세요.' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Supabase 환경변수가 설정되지 않았습니다.');
    return res.status(500).json({ success: false, message: '서버 설정 오류' });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Supabase Authentication으로 로그인
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error || !data.user) {
      return res.status(401).json({
        success: false,
        message: '이메일 또는 비밀번호가 틀렸습니다.'
      });
    }

    // Supabase JWT 토큰 반환 (서버에서 검증 가능)
    return res.status(200).json({
      success: true,
      message: '로그인 성공',
      token: data.session.access_token,
      user: email
    });
  } catch (err) {
    console.error('Admin login error:', err);
    return res.status(500).json({
      success: false,
      message: '로그인 실패'
    });
  }
}
