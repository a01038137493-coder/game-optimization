// analytics.js — 방문자 통계 페이지

let _token = null;
let _cur = { mode: 'preset', range: 'today', from: null, to: null };
let _dailyChartInst = null;
let _pieChartInst = null;

// ── 인증 토큰
function getToken() {
  if (_token) return _token;
  _token = sessionStorage.getItem('adminToken') || localStorage.getItem('adminToken');
  return _token;
}
function adminHeaders() {
  return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() };
}

async function checkAuth() {
  try {
    const res = await fetch('/api/admin-stats?range=today&_check=1', { credentials: 'same-origin' });
    if (res.status === 401) { location.href = '/admin-login.html'; return false; }
    return true;
  } catch(e) { return true; }
}

function goBack() { location.href = '/admin.html'; }

// ── 날짜 유틸
function ymd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function parseYmd(s) {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function fmtShort(d) { return `${d.getMonth()+1}/${d.getDate()}`; }

// ── 필터 활성
function setActiveFilter(key) {
  ['today','yesterday','week','month'].forEach(r => {
    const btn = document.getElementById('af-' + r);
    if (btn) btn.classList.toggle('active', key === r);
  });
}

// ── 프리셋 적용
function applyPreset(preset) {
  _cur = { mode: 'preset', range: preset, from: null, to: null };
  setActiveFilter(preset);
  syncDateInputs();
  loadStats();
}

// ── 커스텀 범위 적용
function applyCustomRange() {
  const from = document.getElementById('dateFrom').value;
  const to   = document.getElementById('dateTo').value;
  if (!from || !to) { alert('시작일과 종료일을 모두 선택하세요.'); return; }
  if (from > to) { alert('시작일이 종료일보다 늦을 수 없습니다.'); return; }
  _cur = { mode: 'custom', range: null, from, to };
  setActiveFilter(null);
  loadStats();
}

function refresh() { loadStats(); }

// ── 현재 _cur 기준으로 날짜 input 값 동기화
function syncDateInputs() {
  const now = new Date();
  let from, to;
  if (_cur.mode === 'custom') {
    from = _cur.from; to = _cur.to;
  } else if (_cur.range === 'today') {
    from = to = ymd(now);
  } else if (_cur.range === 'yesterday') {
    from = to = ymd(new Date(now.getTime() - 86400000));
  } else if (_cur.range === 'week') {
    from = ymd(new Date(now.getTime() - 6*86400000)); to = ymd(now);
  } else if (_cur.range === 'month') {
    from = ymd(new Date(now.getTime() - 29*86400000)); to = ymd(now);
  }
  if (from) document.getElementById('dateFrom').value = from;
  if (to)   document.getElementById('dateTo').value   = to;
}

// ── API URL 빌드
function buildApiUrl() {
  if (_cur.mode === 'custom') {
    return `/api/admin-stats?from=${_cur.from}&to=${_cur.to}`;
  }
  if (_cur.range === 'yesterday') {
    const y = ymd(new Date(Date.now() - 86400000));
    return `/api/admin-stats?from=${y}&to=${y}`;
  }
  return `/api/admin-stats?range=${_cur.range}`;
}

// ── 메인 데이터 로드
async function loadStats() {
  if (!await checkAuth()) return;

  // 로딩 상태
  ['anTotal','anUnique','anReturning','anAvgSession','anBounce','anAvgDur','anMedDur','anDurCov'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.textContent = '...'; el.style.opacity = '.4'; }
  });

  try {
    const res = await fetch(buildApiUrl(), { credentials: 'same-origin', headers: adminHeaders() });
    if (res.status === 401) { location.href = '/admin-login.html'; return; }
    if (!res.ok) throw new Error(res.status);
    const d = await res.json();

    // 기간 라벨
    const rf = parseYmd(d.range.from), rt = parseYmd(d.range.to);
    document.getElementById('anDateRange').textContent = `${d.range.from} ~ ${d.range.to}`;
    const pf = parseYmd(d.range.prevFrom), pt = parseYmd(d.range.prevTo);
    document.getElementById('compareRangeLabel').textContent =
      `비교 기준 (직전 동일 기간): ${d.range.prevFrom} ~ ${d.range.prevTo}`;

    // 요약 카드
    setNum('anTotal', d.total);
    setNum('anUnique', d.uniqueSessions);
    setNum('anReturning', d.returning);
    document.getElementById('anAvgSession').textContent = (d.avgPerSession ?? 0).toFixed(1);
    document.getElementById('anBounce').textContent = (d.bounceRate ?? 0).toFixed(1) + '%';

    // 체류 시간
    document.getElementById('anAvgDur').textContent = fmtDuration(d.avgDurationMs || 0);
    document.getElementById('anMedDur').textContent = fmtDuration(d.medianDurationMs || 0);
    const cov = (d.durationCoverage ?? 0);
    document.getElementById('anDurCov').textContent =
      cov.toFixed(1) + '% (' + (d.trackedSessions || 0).toLocaleString() + '개)';

    ['anTotal','anUnique','anReturning','anAvgSession','anBounce','anAvgDur','anMedDur','anDurCov'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.opacity = '1';
    });

    // 변화율 배지
    renderChange('anTotalChange',     d.compare?.total,          '%');
    renderChange('anUniqueChange',    d.compare?.uniqueSessions, '%');
    renderChange('anReturningChange', d.compare?.returning,      '%');
    renderChange('anAvgChange',       d.compare?.avgPerSession,  '',  true);
    renderChange('anBounceChange',    d.compare?.bounceRate,     'p', true, true);
    renderChange('anAvgDurChange',    d.compare?.avgDurationMs,  '%');

    // 일별 차트
    renderDailyChart(d.daily, d.dailyUnique || {});

    // 유입 경로
    renderReferrers(d.referrers || [], d.total);

    // 기기 비율
    renderDevice(d.deviceCount, d.total);

    // 시간대
    renderHour(d.hourly);

    // 브라우저 / OS
    renderTopList('browserRows', d.browsers || [], d.total, '#3b82f6');
    renderTopList('osRows', d.osList || [], d.total, '#a855f7');

    // 요일
    renderWeekday(d.weekday || []);

  } catch(e) {
    console.error('[analytics]', e);
  }
}

function setNum(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = (val || 0).toLocaleString();
}

// ── ms → "3분 42초" / "12초"
function fmtDuration(ms) {
  if (!ms || ms < 1000) return '0초';
  const totalSec = Math.round(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}시간 ${m}분`;
  if (m > 0) return `${m}분 ${s}초`;
  return `${s}초`;
}

// ── 변화율 배지
// inverted=true: 증가가 나쁜 지표(이탈률)
function renderChange(id, val, suffix = '%', allowAbsolute = false, inverted = false) {
  const el = document.getElementById(id);
  if (!el) return;
  if (val === null || val === undefined || isNaN(val)) {
    el.style.display = 'none';
    return;
  }
  el.style.display = '';
  const isUp = val > 0;
  const isFlat = val === 0;
  el.classList.remove('up', 'down', 'flat');
  if (isFlat) el.classList.add('flat');
  else if ((isUp && !inverted) || (!isUp && inverted)) el.classList.add('up');
  else el.classList.add('down');

  const arrow = isFlat ? '―' : (isUp ? '▲' : '▼');
  const abs = allowAbsolute ? Math.abs(val).toFixed(1) : Math.abs(val).toFixed(1);
  el.textContent = `${arrow} ${abs}${suffix} vs 이전`;
}

// ── 일별 추이 Chart.js (두 라인)
function renderDailyChart(daily, dailyUnique) {
  const days  = Object.keys(daily).sort();
  const vals  = days.map(d => daily[d] || 0);
  const vals2 = days.map(d => dailyUnique[d] || 0);
  const labels = days.map(d => d.slice(5));

  if (_dailyChartInst) _dailyChartInst.destroy();

  const ctx = document.getElementById('dailyChart').getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 240);
  grad.addColorStop(0, 'rgba(59,130,246,.4)');
  grad.addColorStop(1, 'rgba(59,130,246,.02)');

  _dailyChartInst = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: '총 방문',
          data: vals,
          fill: true,
          backgroundColor: grad,
          borderColor: '#3b82f6',
          borderWidth: 2.5,
          pointBackgroundColor: '#3b82f6',
          pointRadius: vals.length > 14 ? 2 : 4,
          tension: 0.4,
        },
        {
          label: '고유 세션',
          data: vals2,
          fill: false,
          borderColor: '#4ade80',
          borderDash: [4, 4],
          borderWidth: 2,
          pointBackgroundColor: '#4ade80',
          pointRadius: vals.length > 14 ? 2 : 3,
          tension: 0.35,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          align: 'end',
          labels: { color: '#94a3b8', font: { size: 11 }, boxWidth: 12, boxHeight: 12 }
        },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString()}명`,
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,.05)' },
          ticks: { color: '#94a3b8', font: { size: 11 } },
        },
        y: {
          grid: { color: 'rgba(255,255,255,.05)' },
          ticks: { color: '#94a3b8', font: { size: 11 }, precision: 0 },
          beginAtZero: true,
        }
      }
    }
  });
}

// ── 유입 경로
function renderReferrers(referrers, total) {
  const el = document.getElementById('referrerRows');
  if (!referrers.length) {
    el.innerHTML = '<div class="an-empty">데이터 없음</div>';
    return;
  }

  const sourceIcon = {
    'Google': '🔍', 'Naver': '🟢', 'Daum': '🔴', 'Kakao': '💛',
    'Instagram': '📸', 'YouTube': '▶️', 'Facebook': '👤',
    'TikTok': '🎵', 'X (Twitter)': '🐦', 'Bing': '🅱️',
    '직접 유입': '🔗', '내부': '🏠',
  };

  const max = referrers[0]?.count || 1;
  const t = total || 1;

  el.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
      ${referrers.slice(0, 10).map(({ source, count }) => {
        const pct = Math.round(count / t * 1000) / 10;
        const barPct = Math.round(count / max * 100);
        const icon = sourceIcon[source] || '🌐';
        return `<div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
            <span style="font-size:.85rem;">${icon} ${source}</span>
            <span style="font-size:.82rem;font-weight:700;color:#3b82f6;">${count.toLocaleString()}명 <span style="color:var(--text-muted);font-weight:400;">(${pct}%)</span></span>
          </div>
          <div class="an-bar-wrap">
            <div class="an-bar-fill" style="width:${barPct}%;background:linear-gradient(90deg,#3b82f6,#7b2fff);"></div>
          </div>
        </div>`;
      }).join('')}
    </div>
  `;
}

// ── 기기 비율
function renderDevice(dc, total) {
  const items = [
    { label: '💻 데스크탑', count: dc.desktop || 0, color: '#3b82f6' },
    { label: '📱 모바일',   count: dc.mobile  || 0, color: '#a855f7' },
    { label: '📟 태블릿',   count: dc.tablet  || 0, color: '#f97316' },
  ];
  const t = total || 1;

  document.getElementById('deviceRows').innerHTML = items.map(({ label, count, color }) => {
    const pct = Math.round(count / t * 1000) / 10;
    return `<div class="an-device-item">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
        <span>${label}</span>
        <span style="font-weight:700;color:${color};">${pct}% <span style="color:var(--text-muted);font-weight:400;">(${count.toLocaleString()})</span></span>
      </div>
      <div class="an-bar-wrap">
        <div class="an-bar-fill" style="width:${pct}%;background:${color};"></div>
      </div>
    </div>`;
  }).join('');

  if (_pieChartInst) _pieChartInst.destroy();
  const ctx = document.getElementById('devicePieChart').getContext('2d');
  _pieChartInst = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: items.map(i => i.label),
      datasets: [{
        data: items.map(i => i.count),
        backgroundColor: items.map(i => i.color),
        borderWidth: 0,
        hoverOffset: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#94a3b8', font: { size: 11 }, padding: 16 }
        },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label}: ${ctx.parsed.toLocaleString()}명 (${Math.round(ctx.parsed/t*100)}%)`
          }
        }
      },
      cutout: '65%',
    }
  });
}

// ── 시간대 막대
function renderHour(hourly) {
  const maxH = Math.max(...hourly, 1);
  const peakH = hourly.indexOf(Math.max(...hourly));

  document.getElementById('hourBars').innerHTML = hourly.map((v, h) => {
    const pct = Math.max(Math.round(v / maxH * 100), v ? 2 : 0);
    const isActive = h === peakH && v > 0;
    return `<div class="an-hour-bar" style="height:${pct}%;opacity:${v ? 1 : 0.15};${isActive ? 'background:linear-gradient(to top,#f97316,#f59e0b);' : ''}" data-tip="${h}시: ${v}명"></div>`;
  }).join('');

  document.getElementById('hourLabels').innerHTML = hourly.map((_, h) =>
    `<span>${h % 6 === 0 ? h + 'h' : ''}</span>`
  ).join('');

  document.getElementById('peakHour').textContent =
    hourly[peakH] > 0
      ? `🔥 피크 시간: ${peakH}시 (${hourly[peakH].toLocaleString()}명)`
      : '';
}

// ── 브라우저/OS 같은 리스트형
function renderTopList(elId, items, total, color) {
  const el = document.getElementById(elId);
  if (!items.length) { el.innerHTML = '<div class="an-empty">데이터 없음</div>'; return; }
  const t = total || 1;
  const max = items[0]?.count || 1;
  el.innerHTML = items.slice(0, 6).map(({ name, count }) => {
    const pct = Math.round(count / t * 1000) / 10;
    const barPct = Math.round(count / max * 100);
    return `<div style="margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
        <span style="font-size:.85rem;">${name}</span>
        <span style="font-size:.8rem;font-weight:700;color:${color};">${count.toLocaleString()}명 <span style="color:var(--text-muted);font-weight:400;">(${pct}%)</span></span>
      </div>
      <div class="an-bar-wrap">
        <div class="an-bar-fill" style="width:${barPct}%;background:${color};"></div>
      </div>
    </div>`;
  }).join('');
}

// ── 요일별 분포
function renderWeekday(weekday) {
  if (!weekday.length) weekday = Array(7).fill(0);
  const labels = ['일','월','화','수','목','금','토'];
  const max = Math.max(...weekday, 1);
  const peakIdx = weekday.indexOf(Math.max(...weekday));

  document.getElementById('weekdayBars').innerHTML = weekday.map((v, i) => {
    const h = Math.max(Math.round(v / max * 100), v ? 4 : 0);
    const isPeak = i === peakIdx && v > 0;
    const bg = isPeak
      ? 'linear-gradient(to top,#f97316,#f59e0b)'
      : ((i === 0 || i === 6) ? 'linear-gradient(to top,#f43f5e,#ec4899)' : 'linear-gradient(to top,#3b82f6,#7b2fff)');
    return `<div class="an-weekday-bar">
      <div class="an-weekday-fill" style="height:${h}%;background:${bg};" data-tip="${labels[i]}: ${v.toLocaleString()}명"></div>
    </div>`;
  }).join('');

  document.getElementById('peakDay').textContent =
    weekday[peakIdx] > 0
      ? `🔥 가장 많이 방문한 요일: ${labels[peakIdx]}요일 (${weekday[peakIdx].toLocaleString()}명)`
      : '';
}

// ── 초기화
(async function init() {
  if (!await checkAuth()) return;
  syncDateInputs();
  await loadStats();
})();
