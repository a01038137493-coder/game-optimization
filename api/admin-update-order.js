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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!await verifyAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { orderId, status } = req.body;
    console.log('[admin-update-order] 요청:', { orderId, orderId_type: typeof orderId, status });

    if (!orderId || !status) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    // 간단하게 업데이트
    const updateData = { status, updated_at: new Date().toISOString() };

    console.log('[admin-update-order] UPDATE 시작:', { id: orderId, ...updateData });

    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .match({ id: orderId })
      .select();

    console.log('[admin-update-order] 업데이트 결과:', { data, error });

    if (error) {
      console.error('[admin-update-order] 에러 전체:', JSON.stringify(error));
      return res.status(500).json({
        error: 'Update failed',
        details: error.message || JSON.stringify(error),
        code: error.code,
        hint: error.hint,
      });
    }

    if (!data || data.length === 0) {
      console.warn('[admin-update-order] 업데이트된 행 없음');
      return res.status(404).json({ error: 'Order not found or not updated' });
    }

    console.log('[admin-update-order] ✅ 성공');
    res.status(200).json({ success: true, updated: data[0] });

  } catch (err) {
    console.error('[admin-update-order] 예외:', err.message);
    res.status(500).json({ error: 'Update failed', details: err.message });
  }
}
