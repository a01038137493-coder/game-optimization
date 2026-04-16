import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://www.gameboostpro.co.kr');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: '이메일을 입력해주세요.' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://www.gameboostpro.co.kr',
    });

    if (error) return res.status(400).json({ error: error.message });

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
}
