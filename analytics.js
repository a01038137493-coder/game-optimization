// analytics.js — 방문자 통계 페이지

let _token = null;
let _curRange = 'today';
let _dailyChartInst = null;
let _pieChartInst = null;

// ── 인증 토큰 가져오기 (admin.js와 동일 방식)
function getToken() {
  if (_token) return _token;
  _token = sessionStorage.getItem('adminToken') || localStorage.getItem('adminToken');
  return _token;
}

function adminHeaders() {
  return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() };
}

// ── 인증 확인 (쿠키는 자동 전송, 토큰 없어도 API가 판단)
async function checkAuth() {
  try {
    const res = await fetch('/api/admin-stats?range=today&_check=1', { credentials: 'same-origin' });
    if (res.status === 401) { location.href = '/admin-login.html'; return false; }
    return true;
  } catch(e) { return true; }
}

function goBack() { location.href = '/admin.html'; }

// ── 필터 버튼 활성화
function setActiveFilter(range) {
  ['today','week','month'].forEach(r => {
    const btn = document.getElementById('af-' + r);
    if (btn) btn.classList.toggle('active', r === range);
  });
}

// ── 날짜 범위 레이블
function rangeLabel(range) {
  const now = new Date();
  const fmt = d => `${d.getMonth()+1}/${d.getDate()}`;
  if (range === 'today') return `오늘 (${fmt(now)})`;
  if (range === 'week') {
    const s = new Date(now.getTime() - 6*86400000);
    return `${fmt(s)} ~ ${fmt(now)}`;
  }
  const s = new Date(now.getTime() - 29*86400000);
  return `${fmt(s)} ~ ${fmt(now)}`;
}

// ── 메인 데이터 로드
async function loadStats(range = 'today') {
  if (!await checkAuth()) return;
  _curRange = range;
  setActiveFilter(range);
  document.getElementById('anDateRange').textContent = rangeLabel(range);

  // 로딩 상태
  ['anTotal','anUnique','anReturning','anChange'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.textContent = '...'; el.style.opacity = '.4'; }
  });

  try {
    const res = await fetch(`/api/admin-stats?range=${range}`, { credentials: 'same-origin', headers: adminHeaders() });
    if (res.status === 401) { location.href = '/admin-login.html'; return; }
    if (!res.ok) throw new Error(res.status);
    const d = await res.json();

    // 요약 카드
    setNum('anTotal', d.total);
    setNum('anUnique', d.uniqueSessions);
    setNum('anReturning', d.returning);

    const chEl = document.getElementById('anChange');
    if (d.changeRate === null) {
      chEl.textContent = '--';
      chEl.style.color = '#94a3b8';
    } else {
      const sign = d.changeRate >= 0 ? '+' : '';
      chEl.textContent = sign + d.changeRate + '%';
      chEl.style.color = d.changeRate >= 0 ? '#4ade80' : '#f87171';
    }
    ['anTotal','anUnique','anReturning','anChange'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.opacity = '1';
    });

    // 일별 차트
    renderDailyChart(d.daily);

    // 유입 경로
    renderReferrers(d.referrers || [], d.total);

    // 기기 비율
    renderDevice(d.deviceCount, d.total);

    // 시간대
    renderHour(d.hourly);

  } catch(e) {
    console.error('[analytics]', e);
  }
}

function setNum(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = (val || 0).toLocaleString();
}

// ── 일별 추이 Chart.js
function renderDailyChart(daily) {
  const days  = Object.keys(daily).sort();
  const vals  = days.map(d => daily[d]);
  const labels = days.map(d => d.slice(5)); // MM-DD

  if (_dailyChartInst) _dailyChartInst.destroy();

  const ctx = document.getElementById('dailyChart').getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 220);
  grad.addColorStop(0, 'rgba(59,130,246,.5)');
  grad.addColorStop(1, 'rgba(59,130,246,.02)');

  _dailyChartInst = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: '방문자',
        data: vals,
        fill: true,
        backgroundColor: grad,
        borderColor: '#3b82f6',
        borderWidth: 2.5,
        pointBackgroundColor: '#3b82f6',
        pointRadius: vals.length > 14 ? 2 : 4,
        tension: 0.4,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.parsed.y.toLocaleString()}명`,
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
    'Google':      '🔍',
    'Naver':       '🟢',
    'Kakao':       '💛',
    'Instagram':   '📸',
    'YouTube':     '▶️',
    'Facebook':    '👤',
    'X (Twitter)': '🐦',
    '직접 유입':   '🔗',
    '내부':        '🏠',
  };

  const max = referrers[0]?.count || 1;
  const t = total || 1;

  el.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
      ${referrers.slice(0, 10).map(({ source, count }) => {
        const pct = Math.round(count / t * 100);
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
    const pct = Math.round(count / t * 100);
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

  // 도넛 차트
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

// ── 초기화
(async function init() {
  if (!await checkAuth()) return;
  await loadStats('today');
})();
