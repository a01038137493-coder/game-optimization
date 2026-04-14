import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    console.log('[admin-dashboard] Supabase connected');

    // 총 매출
    const { data: orders, error: ordersError } = await supabase.from('orders').select('amount');
    if (ordersError) {
      console.error('[admin-dashboard] Orders query error:', ordersError);
      throw ordersError;
    }
    const totalRevenue = (orders || []).reduce((sum, o) => sum + (o.amount || 0), 0);

    // 통계
    const { data: stats } = await supabase.from('orders').select('status');
    const totalOrders = stats?.length || 0;
    const pendingOrders = stats?.filter(o => o.status === 'pending').length || 0;
    const completedOrders = stats?.filter(o => o.status === 'completed').length || 0;

    // 최근 5건
    const { data: recentOrders } = await supabase
      .from('orders')
      .select('id, order_id, buyer_name, plan_name, amount, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    res.status(200).json({
      totalRevenue,
      totalOrders,
      pendingOrders,
      completedOrders,
      recentOrders: recentOrders || []
    });
  } catch (err) {
    console.error('Dashboard API error:', err);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
}
