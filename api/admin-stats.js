/**
 * 방문자 통계 API
 * GET /api/admin-stats?range=today|week|month
 */

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

  const range = req.query.range || 'week';
  const now = new Date();

  let since;
  if (range === 'today') {
    since = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  } else if (range === 'week') {
    since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  } else {
    since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  }

  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    const { data: rows, error } = await supabase
      .from('page_views')
      .select('visited_at, device, session_id, referrer')
      .gte('visited_at', since)
      .order('visited_at', { ascending: true });

    if (error) throw error;

    const total = rows.length;

    // 고유 세션 (신규 방문자)
    const uniqueSessions = new Set(rows.map(r => r.session_id).filter(Boolean)).size;

    // 재방문 (총 - 고유)
    const returning = Math.max(0, total - uniqueSessions);

    // 기기 비율
    const deviceCount = { desktop: 0, mobile: 0, tablet: 0 };
    rows.forEach(r => { if (deviceCount[r.device] !== undefined) deviceCount[r.device]++; });

    // 일별 방문자 (최근 30일 or 7일)
    const dailyMap = {};
    rows.forEach(r => {
      const day = r.visited_at.slice(0, 10);
      dailyMap[day] = (dailyMap[day] || 0) + 1;
    });

    // 시간대별 분포
    const hourMap = Array(24).fill(0);
    rows.forEach(r => {
      const h = new Date(r.visited_at).getHours();
      hourMap[h]++;
    });

    // 어제 vs 오늘 (변화율)
    const todayStr = now.toISOString().slice(0, 10);
    const yesterday = new Date(now.getTime() - 86400000).toISOString().slice(0, 10);
    const todayCount = dailyMap[todayStr] || 0;
    const yesterdayCount = dailyMap[yesterday] || 0;
    const changeRate = yesterdayCount === 0
      ? null
      : Math.round((todayCount - yesterdayCount) / yesterdayCount * 100);

    // 유입 경로 분석
    function parseSource(referrer) {
      if (!referrer) return '직접 유입';
      try {
        const host = new URL(referrer).hostname.replace('www.', '');
        if (host.includes('google'))  return 'Google';
        if (host.includes('naver'))   return 'Naver';
        if (host.includes('kakao') || host.includes('kakaocorp')) return 'Kakao';
        if (host.includes('instagram')) return 'Instagram';
        if (host.includes('youtube'))   return 'YouTube';
        if (host.includes('facebook'))  return 'Facebook';
        if (host.includes('twitter') || host.includes('x.com')) return 'X (Twitter)';
        if (host.includes('gameboostpro.co.kr')) return '내부';
        return host;
      } catch {
        return '기타';
      }
    }

    const referrerMap = {};
    rows.forEach(r => {
      const src = parseSource(r.referrer);
      referrerMap[src] = (referrerMap[src] || 0) + 1;
    });

    // 정렬 (많은 순)
    const referrers = Object.entries(referrerMap)
      .sort((a, b) => b[1] - a[1])
      .map(([source, count]) => ({ source, count }));

    return res.status(200).json({
      total,
      uniqueSessions,
      returning,
      changeRate,
      deviceCount,
      daily: dailyMap,
      hourly: hourMap,
      referrers,
    });
  } catch (err) {
    console.error('[admin-stats]', err);
    return res.status(500).json({ error: 'Failed to load stats' });
  }
}
