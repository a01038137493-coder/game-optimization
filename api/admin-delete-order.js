import { createClient } from '@supabase/supabase-js';

function getCookieToken(req) {
  const raw = req.headers['cookie'] || '';
  const match = raw.split(';').find(c => c.trim().startsWith('adminToken='));
  return match ? match.trim().slice('adminToken='.length) : null;
}
async function verifyAdmin(req) {
  const token = getCookieToken(req)
    || (req.headers['authorization'] || '').replace('Bearer ', '').trim();
  if (!token) return false;
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  return !error && !!user;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://www.gameboostpro.co.kr');
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!await verifyAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const orderId = req.body?.orderId || req.query?.id;
    console.log('[admin-delete-order] 요청:', { orderId });

    if (!orderId) {
      return res.status(400).json({ error: 'Missing orderId' });
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    const { data, error } = await supabase
      .from('orders')
      .delete()
      .match({ id: orderId })
      .select();

    if (error) {
      console.error('[admin-delete-order] 에러:', error);
      return res.status(500).json({
        error: 'Delete failed',
        details: error.message,
        code: error.code,
      });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    console.log('[admin-delete-order] ✅ 삭제 성공:', data[0].order_id);
    return res.status(200).json({ success: true, deleted: data[0] });
  } catch (err) {
    console.error('[admin-delete-order] 예외:', err);
    return res.status(500).json({ error: 'Delete failed', details: err.message });
  }
}
