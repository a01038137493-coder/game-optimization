/**
 * 방문자 트래킹 API
 * POST /api/track-visit
 * 응답: { ok, id } — 체류 시간 업데이트용 row id 반환
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://www.gameboostpro.co.kr');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { session_id, referrer } = req.body || {};
    const ua = req.headers['user-agent'] || '';

    // 기기 판별
    const isMobile = /Mobile|Android|iPhone|iPad/i.test(ua);
    const isTablet = /iPad|Tablet/i.test(ua);
    const device = isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop';

    // 봇 필터링
    if (/bot|crawl|spider|slurp|baiduspider|facebookexternalhit|Twitterbot/i.test(ua)) {
      return res.status(200).json({ ok: true, skipped: true });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const { data, error } = await supabase
      .from('page_views')
      .insert({
        session_id: session_id || null,
        device,
        referrer: referrer || null,
        user_agent: ua.slice(0, 300),
      })
      .select('id')
      .single();

    if (error) throw error;

    return res.status(200).json({ ok: true, id: data?.id || null });
  } catch (err) {
    console.error('[track-visit]', err);
    return res.status(500).json({ ok: false });
  }
}
