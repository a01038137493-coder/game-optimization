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

    // 전체 customers + orders 한 번에 로드
    const [{ data: customers }, { data: allOrders }] = await Promise.all([
      supabase.from('customers').select('id, nickname, phone, kakao_id, created_at').order('created_at', { ascending: false }),
      supabase.from('orders').select('id, order_id, amount, customer_id, buyer_contact, buyer_name'),
    ]);

    // phone 기준 그룹핑 — 중복 customer row 를 하나로 합침
    const groups = new Map(); // key: phone 또는 '__no_phone_<customer_id>'
    for (const c of (customers || [])) {
      const key = c.phone ? `phone:${c.phone}` : `cid:${c.id}`;
      if (!groups.has(key)) {
        groups.set(key, {
          nickname: c.nickname || null,
          phone: c.phone || null,
          customer_ids: [c.id],
        });
      } else {
        const g = groups.get(key);
        g.customer_ids.push(c.id);
        if (!g.nickname && c.nickname) g.nickname = c.nickname; // 최신순 조회이므로 가장 최근 nickname 우선
      }
    }

    // customers 테이블엔 없지만 주문만 있는 전화번호도 표시 (비회원 결제 대응)
    const knownPhones = new Set();
    groups.forEach(g => g.phone && knownPhones.add(g.phone));
    for (const o of (allOrders || [])) {
      if (o.buyer_contact && !knownPhones.has(o.buyer_contact)) {
        const key = `phone:${o.buyer_contact}`;
        if (!groups.has(key)) {
          groups.set(key, {
            nickname: o.buyer_name || null,
            phone: o.buyer_contact,
            customer_ids: [],
          });
          knownPhones.add(o.buyer_contact);
        } else if (!groups.get(key).nickname && o.buyer_name) {
          groups.get(key).nickname = o.buyer_name;
        }
      }
    }

    // 각 그룹별 주문 매칭 + id 기준 중복 제거
    const result = Array.from(groups.values()).map(g => {
      const matched = (allOrders || []).filter(o => {
        if (g.customer_ids.length && g.customer_ids.includes(o.customer_id)) return true;
        if (g.phone && o.buyer_contact === g.phone) return true;
        return false;
      });
      const unique = Array.from(new Map(matched.map(o => [o.id, o])).values());
      return {
        nickname: g.nickname,
        phone: g.phone,
        order_count: unique.length,
        total_spent: unique.reduce((sum, o) => sum + (o.amount || 0), 0),
      };
    }).filter(r => r.order_count > 0 || r.phone); // 주문 없고 전화번호도 없는 유령 레코드 제외

    // 주문 많은 순 정렬
    result.sort((a, b) => b.order_count - a.order_count);

    res.status(200).json({ customers: result });
  } catch (err) {
    console.error('[admin-customers] 에러:', err);
    res.status(500).json({ error: 'Failed to load customers', details: err.message });
  }
}
