import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // 취소/삭제 제외한 실제 진행/완료 주문 카운트
    const { count, error } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .not('status', 'in', '(cancelled,refunded)');

    if (error) {
      console.error('[public-stats] 에러:', error);
      return res.status(500).json({ error: 'Failed to fetch stats' });
    }

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json({ completedCount: count || 0 });
  } catch (err) {
    console.error('[public-stats] 예외:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
