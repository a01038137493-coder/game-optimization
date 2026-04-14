import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const { data: coupons } = await supabase.from('coupons').select('*');

    res.status(200).json({ coupons: coupons || [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load coupons' });
  }
}
