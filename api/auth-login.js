import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://www.gameboostpro.co.kr');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: '이메일과 비밀번호를 입력해주세요.' });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.session) {
      return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    // customers에서 닉네임 조회
    const supabaseService = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const { data: customer } = await supabaseService
      .from('customers')
      .select('nickname, phone')
      .eq('kakao_id', `email_${data.user.id}`)
      .single();

    const nickname = customer?.nickname || data.user.user_metadata?.name || email.split('@')[0];
    const phone    = customer?.phone    || data.user.user_metadata?.phone || '';

    return res.status(200).json({
      success: true,
      token: data.session.access_token,
      user: { id: `email_${data.user.id}`, nickname, email, phone, profileImage: '', authType: 'email' },
    });
  } catch (err) {
    console.error('[auth-login]', err.message);
    return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
}
