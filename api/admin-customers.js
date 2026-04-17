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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!await verifyAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    // 고객과 주문 통계 조인
    const { data: customers } = await supabase.from('customers').select('*');

    const customersWithStats = await Promise.all((customers || []).map(async (c) => {
      // customer_id 또는 전화번호로 주문 매칭
      let query = supabase.from('orders').select('amount');
      if (c.phone) {
        query = query.or(`customer_id.eq.${c.id},buyer_contact.eq.${c.phone}`);
      } else {
        query = query.eq('customer_id', c.id);
      }
      const { data: orders } = await query;

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
