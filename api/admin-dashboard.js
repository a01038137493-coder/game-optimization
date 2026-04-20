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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!await verifyAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    console.log('[admin-dashboard] Supabase connected');

    // 총 매출
    const { data: orders, error: ordersError } = await supabase.from('orders').select('amount, status');
    if (ordersError) {
      console.error('[admin-dashboard] Orders query error:', ordersError);
      throw ordersError;
    }
    const totalRevenue = (orders || []).reduce((sum, o) => o.status === 'cancelled' ? sum : sum + (o.amount || 0), 0);

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
