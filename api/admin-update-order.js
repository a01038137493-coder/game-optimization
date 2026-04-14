import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { orderId, status } = req.body;
    console.log('[admin-update-order] Request:', { orderId, status });

    if (!orderId || !status) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    // status만 업데이트 (pay_status는 건드리지 않음)
    const updateData = { status };

    console.log('[admin-update-order] Updating with:', updateData);

    const { error, data } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId);

    console.log('[admin-update-order] Update result:', { error, data });

    if (error) {
      console.error('[admin-update-order] Supabase error:', error);
      throw error;
    }

    res.status(200).json({ success: true, message: 'Order status updated' });
  } catch (err) {
    console.error('[admin-update-order] Error:', err.message);
    res.status(500).json({ error: 'Failed to update order', details: err.message });
  }
}
