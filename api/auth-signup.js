import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://www.gameboostpro.co.kr');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password, name, phone } = req.body;

  if (!email || !password || !name || !phone) {
    return res.status(400).json({ error: '이름, 이메일, 전화번호, 비밀번호를 입력해주세요.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: '비밀번호는 6자 이상이어야 합니다.' });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  try {
    // Supabase Auth 계정 생성
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, phone: phone || '' },
    });

    if (error) {
      if (error.message.includes('already registered') || error.message.includes('already been registered')) {
        return res.status(409).json({ error: '이미 사용 중인 이메일입니다.' });
      }
      return res.status(400).json({ error: error.message });
    }

    // customers 테이블에 저장 (이메일 회원은 kakao_id 없이 insert)
    const { error: insertError } = await supabase.from('customers').insert({
      nickname: name, phone: phone || null, email
    });
    if (insertError) console.error('[auth-signup] customers insert error:', insertError.message, insertError.code);

    // 바로 로그인 (토큰 발급)
    const supabaseAnon = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
    const { data: session, error: signInError } = await supabaseAnon.auth.signInWithPassword({ email, password });

    if (signInError || !session.session) {
      return res.status(200).json({ success: true, message: '회원가입 완료. 로그인해주세요.' });
    }

    return res.status(200).json({
      success: true,
      token: session.session.access_token,
      user: { id: `email_${data.user.id}`, nickname: name, email, phone: phone || '', profileImage: '', authType: 'email' },
    });
  } catch (err) {
    console.error('[auth-signup]', err.message);
    return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
}
