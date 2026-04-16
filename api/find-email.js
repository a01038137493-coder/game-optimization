import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://www.gameboostpro.co.kr');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: '전화번호를 입력해주세요.' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  try {
    const { data, error } = await supabase
      .from('customers')
      .select('email')
      .eq('phone', phone)
      .not('email', 'is', null)
      .limit(1)
      .single();

    if (error || !data?.email) {
      return res.status(404).json({ error: '해당 전화번호로 가입된 계정이 없습니다.' });
    }

    // 이메일 마스킹 (ab***@gmail.com)
    const [local, domain] = data.email.split('@');
    const masked = local.slice(0, 2) + '***@' + domain;

    return res.status(200).json({ success: true, email: masked });
  } catch (err) {
    return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
}
