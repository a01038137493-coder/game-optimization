import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

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
      console.error('[admin-update-order] 에러:', error);
      throw error;
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
