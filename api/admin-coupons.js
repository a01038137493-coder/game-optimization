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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!await verifyAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  try {
    // GET: 쿠폰 목록
    if (req.method === 'GET') {
      const { data: coupons } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
      return res.status(200).json({ coupons: coupons || [] });
    }

    // DELETE: 쿠폰 삭제
    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'id required' });
      await supabase.from('coupons').delete().eq('id', id);
      return res.status(200).json({ success: true });
    }

    // POST: 쿠폰 추가 or 수정
    if (req.method === 'POST') {
      const { id, _action, code, label, type, value, is_active, max_uses, expires_at } = req.body;

      // 활성화 토글
      if (_action === 'toggle' && id) {
        await supabase.from('coupons').update({ is_active }).eq('id', id);
        return res.status(200).json({ success: true });
      }

      // 수정
      if (id) {
        const { error } = await supabase.from('coupons').update({
          code: code.toUpperCase(), label, type, value, is_active, max_uses, expires_at
        }).eq('id', id);
        if (error) return res.status(400).json({ error: error.message });
        return res.status(200).json({ success: true });
      }

      // 추가
      const { error } = await supabase.from('coupons').insert({
        code: code.toUpperCase(), label, type, value, is_active, max_uses, expires_at, used_count: 0
      });
      if (error) return res.status(400).json({ error: error.message });
      return res.status(200).json({ success: true });
    }

  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}
