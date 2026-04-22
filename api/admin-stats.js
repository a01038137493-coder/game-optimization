/**
 * 방문자 통계 API
 * GET /api/admin-stats?range=today|week|month
 * GET /api/admin-stats?from=YYYY-MM-DD&to=YYYY-MM-DD  (커스텀 범위)
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

function parseSource(referrer) {
  if (!referrer) return '직접 유입';
  try {
    const host = new URL(referrer).hostname.replace('www.', '');
    if (host.includes('google'))    return 'Google';
    if (host.includes('naver'))     return 'Naver';
    if (host.includes('daum'))      return 'Daum';
    if (host.includes('kakao'))     return 'Kakao';
    if (host.includes('instagram')) return 'Instagram';
    if (host.includes('youtube'))   return 'YouTube';
    if (host.includes('facebook'))  return 'Facebook';
    if (host.includes('tiktok'))    return 'TikTok';
    if (host.includes('twitter') || host.includes('x.com')) return 'X (Twitter)';
    if (host.includes('bing'))      return 'Bing';
    if (host.includes('gameboostpro.co.kr')) return '내부';
    return host;
  } catch {
    return '기타';
  }
}

function parseBrowser(ua) {
  if (!ua) return '기타';
  if (/Edg\//.test(ua))                              return 'Edge';
  if (/OPR\//.test(ua))                              return 'Opera';
  if (/Whale\//.test(ua))                            return '네이버 웨일';
  if (/SamsungBrowser/.test(ua))                     return '삼성 인터넷';
  if (/KAKAOTALK/i.test(ua))                         return '카카오톡 앱';
  if (/Chrome\//.test(ua) && !/Chromium/.test(ua))   return 'Chrome';
  if (/Firefox\//.test(ua))                          return 'Firefox';
  if (/Safari\//.test(ua))                           return 'Safari';
  return '기타';
}

function parseOS(ua) {
  if (!ua) return '기타';
  if (/Windows NT/.test(ua))            return 'Windows';
  if (/Android/.test(ua))               return 'Android';
  if (/iPhone|iPad|iPod/.test(ua))      return 'iOS';
  if (/Mac OS X|Macintosh/.test(ua))    return 'macOS';
  if (/Linux/.test(ua))                 return 'Linux';
  return '기타';
}

function ymd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// 두 날짜 사이 일자 키(yyyy-mm-dd) 배열을 연속적으로 생성
function dayKeys(from, to) {
  const keys = [];
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  while (d <= end) {
    keys.push(ymd(d));
    d.setDate(d.getDate() + 1);
  }
  return keys;
}

function computeMetrics(rows) {
  const total = rows.length;

  const sessionSet = new Set();
  const sessionViewCount = {}; // session_id -> view count
  const sessionDuration = {};  // session_id -> max duration_ms observed
  rows.forEach(r => {
    if (!r.session_id) return;
    sessionSet.add(r.session_id);
    sessionViewCount[r.session_id] = (sessionViewCount[r.session_id] || 0) + 1;
    if (r.duration_ms != null) {
      const cur = sessionDuration[r.session_id] || 0;
      if (r.duration_ms > cur) sessionDuration[r.session_id] = r.duration_ms;
    }
  });
  const uniqueSessions = sessionSet.size;
  const returning = Math.max(0, total - uniqueSessions);

  // 이탈률: 1페이지만 보고 떠난 세션 비율
  const bounceSessions = Object.values(sessionViewCount).filter(c => c === 1).length;
  const bounceRate = uniqueSessions ? Math.round(bounceSessions / uniqueSessions * 1000) / 10 : 0;

  // 세션당 평균 페이지
  const avgPerSession = uniqueSessions ? Math.round(total / uniqueSessions * 10) / 10 : 0;

  // 체류 시간 — duration_ms가 측정된 세션만 평균에 반영
  const durVals = Object.values(sessionDuration);
  const trackedSessions = durVals.length;
  const avgDurationMs = trackedSessions
    ? Math.round(durVals.reduce((a, b) => a + b, 0) / trackedSessions)
    : 0;
  const medianDurationMs = trackedSessions
    ? (() => {
        const sorted = [...durVals].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
      })()
    : 0;
  const durationCoverage = uniqueSessions
    ? Math.round(trackedSessions / uniqueSessions * 1000) / 10
    : 0;

  // 기기
  const deviceCount = { desktop: 0, mobile: 0, tablet: 0 };
  rows.forEach(r => { if (deviceCount[r.device] !== undefined) deviceCount[r.device]++; });

  // 유입
  const referrerMap = {};
  rows.forEach(r => {
    const src = parseSource(r.referrer);
    referrerMap[src] = (referrerMap[src] || 0) + 1;
  });
  const referrers = Object.entries(referrerMap)
    .sort((a, b) => b[1] - a[1])
    .map(([source, count]) => ({ source, count }));

  // 브라우저
  const browserMap = {};
  rows.forEach(r => {
    const b = parseBrowser(r.user_agent);
    browserMap[b] = (browserMap[b] || 0) + 1;
  });
  const browsers = Object.entries(browserMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  // OS
  const osMap = {};
  rows.forEach(r => {
    const o = parseOS(r.user_agent);
    osMap[o] = (osMap[o] || 0) + 1;
  });
  const osList = Object.entries(osMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  return {
    total, uniqueSessions, returning,
    bounceRate, avgPerSession,
    avgDurationMs, medianDurationMs, durationCoverage, trackedSessions,
    deviceCount, referrers, browsers, osList,
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://www.gameboostpro.co.kr');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!await verifyAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });

  const { range, from: fromParam, to: toParam } = req.query;
  const now = new Date();

  // 기간 결정
  let fromDate, toDate;
  if (fromParam && toParam) {
    fromDate = new Date(fromParam + 'T00:00:00');
    toDate   = new Date(toParam   + 'T23:59:59.999');
    if (isNaN(fromDate) || isNaN(toDate) || fromDate > toDate) {
      return res.status(400).json({ error: 'Invalid date range' });
    }
  } else if (range === 'today') {
    fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    toDate   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  } else if (range === 'month') {
    fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
    toDate   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  } else {
    // default = week
    fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    toDate   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  }

  const durationMs = toDate - fromDate + 1;
  const prevFrom = new Date(fromDate.getTime() - durationMs);
  const prevTo   = new Date(fromDate.getTime() - 1);

  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    const { data: rows, error } = await supabase
      .from('page_views')
      .select('visited_at, device, session_id, referrer, user_agent, duration_ms')
      .gte('visited_at', prevFrom.toISOString())
      .lte('visited_at', toDate.toISOString())
      .order('visited_at', { ascending: true });

    if (error) throw error;

    const curRows  = rows.filter(r => new Date(r.visited_at) >= fromDate);
    const prevRows = rows.filter(r => new Date(r.visited_at) < fromDate);

    const cur  = computeMetrics(curRows);
    const prev = computeMetrics(prevRows);

    // 연속 일자 배열 (데이터 없는 날 포함 0으로 채움)
    const keys = dayKeys(fromDate, toDate);
    const dailyMap = {};
    const dailyUniqueSet = {};
    keys.forEach(k => { dailyMap[k] = 0; dailyUniqueSet[k] = new Set(); });
    curRows.forEach(r => {
      const day = r.visited_at.slice(0, 10);
      if (dailyMap[day] === undefined) return;
      dailyMap[day]++;
      if (r.session_id) dailyUniqueSet[day].add(r.session_id);
    });
    const dailyUnique = {};
    keys.forEach(k => { dailyUnique[k] = dailyUniqueSet[k].size; });

    // 시간대
    const hourMap = Array(24).fill(0);
    curRows.forEach(r => {
      const h = new Date(r.visited_at).getHours();
      hourMap[h]++;
    });

    // 요일 (0=일 ~ 6=토)
    const weekdayMap = Array(7).fill(0);
    curRows.forEach(r => {
      weekdayMap[new Date(r.visited_at).getDay()]++;
    });

    // 기간-대-기간 변화율
    const pct = (a, b) => (b === 0 ? null : Math.round((a - b) / b * 1000) / 10);

    const compare = {
      total:            pct(cur.total,          prev.total),
      uniqueSessions:   pct(cur.uniqueSessions, prev.uniqueSessions),
      returning:        pct(cur.returning,      prev.returning),
      bounceRate:       cur.bounceRate - prev.bounceRate,
      avgPerSession:    Math.round((cur.avgPerSession - prev.avgPerSession) * 10) / 10,
      avgDurationMs:    pct(cur.avgDurationMs,  prev.avgDurationMs),
    };

    // 하위 호환: 기존 필드 유지
    const todayStr = ymd(now);
    const yStr = ymd(new Date(now.getTime() - 86400000));
    const changeRate = dailyMap[yStr] === 0
      ? null
      : dailyMap[yStr] === undefined
        ? null
        : Math.round((dailyMap[todayStr] - dailyMap[yStr]) / dailyMap[yStr] * 100);

    return res.status(200).json({
      // 기존 키
      total: cur.total,
      uniqueSessions: cur.uniqueSessions,
      returning: cur.returning,
      changeRate,
      deviceCount: cur.deviceCount,
      daily: dailyMap,
      hourly: hourMap,
      referrers: cur.referrers,
      // 신규 키
      bounceRate: cur.bounceRate,
      avgPerSession: cur.avgPerSession,
      avgDurationMs: cur.avgDurationMs,
      medianDurationMs: cur.medianDurationMs,
      durationCoverage: cur.durationCoverage,
      trackedSessions: cur.trackedSessions,
      browsers: cur.browsers,
      osList: cur.osList,
      dailyUnique,
      weekday: weekdayMap,
      compare,
      previous: {
        total: prev.total,
        uniqueSessions: prev.uniqueSessions,
        returning: prev.returning,
        bounceRate: prev.bounceRate,
        avgPerSession: prev.avgPerSession,
        avgDurationMs: prev.avgDurationMs,
      },
      range: {
        from: ymd(fromDate),
        to:   ymd(toDate),
        prevFrom: ymd(prevFrom),
        prevTo:   ymd(prevTo),
      },
    });
  } catch (err) {
    console.error('[admin-stats]', err);
    return res.status(500).json({ error: 'Failed to load stats' });
  }
}
