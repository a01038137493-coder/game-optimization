import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    // 고객과 주문 통계 조인
    const { data: customers } = await supabase.from('customers').select('*');

    const customersWithStats = await Promise.all((customers || []).map(async (c) => {
      const { data: orders } = await supabase
        .from('orders')
        .select('amount')
        .eq('customer_id', c.id);

      return {
        ...c,
        order_count: orders?.length || 0,
        total_spent: orders?.reduce((sum, o) => sum + (o.amount || 0), 0) || 0
      };
    }));

    res.status(200).json({ customers: customersWithStats });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load customers' });
  }
}
