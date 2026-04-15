import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[admin-orders] Supabase error:', error);
      return res.status(500).json({ error: 'Failed to load orders', details: error.message });
    }

    console.log('[admin-orders] Orders loaded:', orders?.length || 0);

    // 컬럼명 정규화 (서로 다른 컬럼명 통일)
    const normalizedOrders = (orders || []).map(o => ({
      ...o,
      buyer_name: o.buyer_name || o.name || '',
      buyer_phone: o.buyer_phone || o.phone || o.buyer_contact || o.contact || '',
      buyer_contact: o.buyer_contact || o.contact || o.phone || '',
      games: o.games || '',
      memo: o.memo || o.memo || '',
      status: o.status || 'pending',
      created_at: o.created_at || new Date().toISOString()
    }));

    // 중복된 order_id 감지
    const orderIdCounts = {};
    normalizedOrders.forEach(o => {
      orderIdCounts[o.order_id] = (orderIdCounts[o.order_id] || 0) + 1;
    });
    const duplicates = Object.entries(orderIdCounts).filter(([_, count]) => count > 1);
    if (duplicates.length > 0) {
      console.warn('[admin-orders] ⚠️ 중복된 order_id 발견:', duplicates);
    }

    res.status(200).json({ orders: normalizedOrders });
  } catch (err) {
    console.error('[admin-orders] Error:', err.message);
    res.status(500).json({ error: 'Failed to load orders', details: err.message });
  }
}
