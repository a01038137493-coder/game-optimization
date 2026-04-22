/**
 * 체류 시간 업데이트 API
 * POST /api/track-duration
 * body: { id: uuid, duration_ms: number }
 * sendBeacon으로 호출되므로 응답은 빠르게 반환.
 */

import { createClient } from '@supabase/supabase-js';

const MAX_DURATION_MS = 6 * 60 * 60 * 1000; // 6시간 상한

function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return {};
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://www.gameboostpro.co.kr');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { id, duration_ms } = parseBody(req);
    if (!id || typeof id !== 'string') return res.status(400).json({ ok: false });

    let ms = Number(duration_ms);
    if (!Number.isFinite(ms) || ms < 1000) return res.status(200).json({ ok: true, skipped: 'short' });
    if (ms > MAX_DURATION_MS) ms = MAX_DURATION_MS;
    ms = Math.round(ms);

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // 기존 값보다 큰 경우에만 덮어씀 (탭 전환·재방문으로 줄어들지 않도록)
    const { data: cur } = await supabase
      .from('page_views')
      .select('duration_ms')
      .eq('id', id)
      .single();

    const prev = (cur?.duration_ms || 0);
    if (ms <= prev) return res.status(200).json({ ok: true, kept: true });

    const { error } = await supabase
      .from('page_views')
      .update({ duration_ms: ms })
      .eq('id', id);

    if (error) throw error;
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[track-duration]', err);
    return res.status(500).json({ ok: false });
  }
}
