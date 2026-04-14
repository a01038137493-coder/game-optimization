import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const { data: orders } = await supabase
      .from('orders')
      .select('id, order_id, buyer_name, plan_name, amount, status, created_at')
      .order('created_at', { ascending: false });

    res.status(200).json({ orders: orders || [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load orders' });
  }
}
