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
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!await verifyAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });

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
