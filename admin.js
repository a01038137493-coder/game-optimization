// 어드민 인증 헤더 헬퍼
function adminHeaders(extra = {}) {
  const token = localStorage.getItem('adminToken') || '';
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, ...extra };
}

// 대시보드 필터
let dashboardFilter = 'today';

// 탭 전환
function switchTab(tabName) {
  document.querySelectorAll('.admin-tab').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.admin-nav-btn').forEach(btn => btn.classList.remove('active'));

  document.getElementById(tabName + '-tab').classList.add('active');
  event.target.classList.add('active');

  if (tabName === 'dashboard') loadDashboard();
  else if (tabName === 'orders') loadOrders();
  else if (tabName === 'customers') loadCustomers();
}

// 날짜 범위 문자열 포맷
function formatDateRange(type) {
  const today = new Date();
  const range = getDateRange(type);
  const start = range.start;
  const end = new Date(range.end.getTime() - 1); // 마지막 날 포함

  const fmt = (d) => `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;

  if (type === 'today') {
    return fmt(start);
  } else {
    return `${fmt(start)} ~ ${fmt(end)}`;
  }
}

// 대시보드 필터 설정
function setDashboardFilter(type) {
  dashboardFilter = type;

  // 버튼 활성화 상태 업데이트
  document.getElementById('filterToday').style.background = type === 'today' ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.1)';
  document.getElementById('filterToday').style.borderColor = type === 'today' ? 'rgba(59,130,246,0.4)' : 'var(--border)';
  document.getElementById('filterToday').style.color = type === 'today' ? 'var(--primary)' : 'var(--text)';

  document.getElementById('filterWeek').style.background = type === 'week' ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.1)';
  document.getElementById('filterWeek').style.borderColor = type === 'week' ? 'rgba(59,130,246,0.4)' : 'var(--border)';
  document.getElementById('filterWeek').style.color = type === 'week' ? 'var(--primary)' : 'var(--text)';

  document.getElementById('filterMonth').style.background = type === 'month' ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.1)';
  document.getElementById('filterMonth').style.borderColor = type === 'month' ? 'rgba(59,130,246,0.4)' : 'var(--border)';
  document.getElementById('filterMonth').style.color = type === 'month' ? 'var(--primary)' : 'var(--text)';

  // 날짜 범위 표시
  document.getElementById('dateRangeDisplay').textContent = formatDateRange(type);

  loadDashboard();
}

function goHome() {
  localStorage.removeItem('adminToken');
  localStorage.removeItem('adminEmail');
  location.href = '/';
}

// 날짜 범위 계산
function getDateRange(type) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let startDate = new Date(today);

  if (type === 'today') {
    return { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
  } else if (type === 'week') {
    startDate.setDate(today.getDate() - 7);
    return { start: startDate, end: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
  } else if (type === 'month') {
    startDate.setDate(today.getDate() - 30);
    return { start: startDate, end: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
  }
}

// 대시보드 데이터 로드
async function loadDashboard() {
  try {
    console.log('[ADMIN] 대시보드 데이터 로드 시작');
    const res = await fetch('/api/admin-orders', { headers: adminHeaders() });
    console.log('[ADMIN] API 응답 상태:', res.status, res.ok);

    if (!res.ok) throw new Error(`API 오류: ${res.status}`);
    const data = await res.json();
    console.log('[ADMIN] API 응답 데이터:', data);

    const orders = data.orders || [];
    console.log('[ADMIN] 전체 주문 수:', orders.length);

    // 날짜 범위에 맞게 필터링
    const range = getDateRange(dashboardFilter);
    const filteredOrders = orders.filter(order => {
      const orderDate = new Date(order.created_at);
      return orderDate >= range.start && orderDate < range.end;
    });
    console.log('[ADMIN] 필터링된 주문 수:', filteredOrders.length);

    // 통계 계산
    let totalRevenue = 0;
    let pendingOrders = 0;
    let completedOrders = 0;

    filteredOrders.forEach(order => {
      totalRevenue += order.amount || 0;
      if (order.status === 'pending') pendingOrders++;
      else if (order.status === 'done' || order.status === 'working') completedOrders++;
    });

    // UI 업데이트
    document.getElementById('totalRevenue').textContent = '₩' + totalRevenue.toLocaleString();
    document.getElementById('totalOrders').textContent = filteredOrders.length;
    document.getElementById('pendingOrders').textContent = pendingOrders;
    document.getElementById('completedOrders').textContent = completedOrders;

    renderRecentOrders(filteredOrders);
    console.log('[ADMIN] 대시보드 로드 완료');
  } catch (err) {
    console.error('[ADMIN] 대시보드 로드 오류:', err.message);
    showError('대시보드 로드 실패: ' + err.message);
  }
}

// 7일간 매출 차트
function renderRevenueChart(orders) {
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    last7Days.push(date.toISOString().split('T')[0]);
  }

  const dailyRevenue = {};
  last7Days.forEach(d => dailyRevenue[d] = 0);

  orders.forEach(o => {
    const date = o.created_at.split('T')[0];
    if (date in dailyRevenue) {
      dailyRevenue[date] += o.amount;
    }
  });

  const ctx = document.getElementById('revenueChart');
  if (!ctx) return;

  if (window.revenueChartInstance) {
    window.revenueChartInstance.destroy();
  }

  window.revenueChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: last7Days.map(d => new Date(d + 'T00:00:00').toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })),
      datasets: [{
        label: '일일 매출',
        data: last7Days.map(d => dailyRevenue[d]),
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37,99,235,0.08)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#2563eb',
        pointBorderColor: '#ffffff',
        pointRadius: 5,
        pointHoverRadius: 7
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#1e293b', font: { size: 12 } } }
      },
      scales: {
        y: {
          ticks: { color: '#64748b' },
          grid: { color: '#e2e8f0' }
        },
        x: {
          ticks: { color: '#64748b' },
          grid: { color: '#e2e8f0' }
        }
      }
    }
  });
}

// 주문 목록 렌더
function renderRecentOrders(orders) {
  const tbody = document.getElementById('recentOrdersTable');
  if (orders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);">주문이 없습니다.</td></tr>';
    return;
  }

  tbody.innerHTML = orders.map(o => `
    <tr>
      <td>${o.order_id}</td>
      <td>${o.buyer_name || '(미입력)'}</td>
      <td>${o.plan_name}</td>
      <td>₩${o.amount.toLocaleString()}</td>
      <td><span class="status-${o.status}">${getStatusLabel(o.status)}</span></td>
      <td>${new Date(o.created_at).toLocaleDateString('ko-KR')}</td>
    </tr>
  `).join('');
}

// 전체 주문 데이터 저장
let allOrdersData = [];

// 주문 목록 로드
async function loadOrders() {
  try {
    console.log('[ADMIN] 주문 목록 로드 시작');
    const res = await fetch('/api/admin-orders', { headers: adminHeaders() });
    console.log('[ADMIN] API 응답 상태:', res.status, res.ok);

    if (!res.ok) throw new Error(`API 오류: ${res.status}`);
    const data = await res.json();
    console.log('[ADMIN] API 응답 데이터:', data);

    allOrdersData = data.orders || [];
    console.log('[ADMIN] 로드된 주문 수:', allOrdersData.length);

    // 중복 감지
    const orderIdCounts = {};
    allOrdersData.forEach(o => {
      orderIdCounts[o.order_id] = (orderIdCounts[o.order_id] || 0) + 1;
    });
    const duplicates = Object.entries(orderIdCounts).filter(([_, count]) => count > 1);
    if (duplicates.length > 0) {
      console.warn('[ADMIN] ⚠️ 중복된 order_id 발견:', duplicates.map(([id, count]) => `${id}(${count}개)`).join(', '));
    }

    filterOrders();
    console.log('[ADMIN] 주문 목록 로드 완료');
  } catch (err) {
    console.error('[ADMIN] 주문 목록 로드 오류:', err.message);
    showError('주문 목록 로드 실패: ' + err.message);
  }
}

// 전체 주문 렌더
function renderAllOrders(orders) {
  const tbody = document.getElementById('allOrdersTable');
  if (orders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--text-muted);">주문이 없습니다.</td></tr>';
    return;
  }

  tbody.innerHTML = orders.map(o => {
    const date = new Date(o.created_at);
    const dateTimeStr = date.toLocaleDateString('ko-KR') + ' ' + date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    const games = o.games ? o.games.split(',').slice(0,2).join(', ') : '(없음)';
    return `
      <tr>
        <td>${o.buyer_name || '(미입력)'}</td>
        <td>${o.buyer_phone || '(미입력)'}</td>
        <td>${o.order_id}</td>
        <td>${o.plan_name}</td>
        <td>${games}</td>
        <td>${o.memo ? o.memo.substring(0,20) + (o.memo.length > 20 ? '...' : '') : '-'}</td>
        <td>${dateTimeStr}</td>
        <td><span class="status-${o.status}">${getStatusLabel(o.status)}</span></td>
        <td style="display:flex;gap:6px;">
          <button class="admin-btn" onclick="openOrderDetail('${o.id}')">상세</button>
          <select style="padding:6px 8px;background:var(--bg-dark);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:.85rem;cursor:pointer;" onchange="if(this.value) { updateOrderStatus('${o.id}', this.value); this.value=''; }">
            <option value="">상태</option>
            <option value="pending">진행중</option>
            <option value="working">작업중</option>
            <option value="done">완료</option>
            <option value="cancelled">취소</option>
          </select>
        </td>
      </tr>
    `;
  }).join('');
}

// 주문 상태 업데이트
async function updateOrderStatus(orderId, newStatus) {
  if (!newStatus) return;

  try {
    // orderId 타입 확인 및 로깅
    const order = allOrdersData.find(o => o.id == orderId);
    console.log('[ADMIN] ===== 상태 변경 시작 =====');
    console.log('[ADMIN] 파라미터:', {
      orderId,
      orderId_type: typeof orderId,
      order_id_found: order?.order_id,
      current_status: order?.status,
      new_status: newStatus
    });

    const res = await fetch('/api/admin-update-order', {
      method: 'POST',
      headers: adminHeaders(),
      body: JSON.stringify({ orderId, status: newStatus })
    });

    console.log('[ADMIN] API HTTP 상태:', res.status);
    const data = await res.json();
    console.log('[ADMIN] API 응답:', data);

    if (res.ok) {
      // 성공 메시지 표시
      const msg = document.createElement('div');
      msg.textContent = '✓ 주문 상태가 변경되었습니다.';
      msg.style.cssText = 'position:fixed;top:20px;right:20px;background:#10b981;color:white;padding:12px 20px;border-radius:8px;font-weight:600;z-index:9999;font-family:Pretendard,sans-serif;font-size:0.9rem;';
      document.body.appendChild(msg);
      setTimeout(() => msg.remove(), 3000);

      console.log('[ADMIN] ✅ 상태 변경 완료, 주문 목록 재로드 중...');
      const oldCount = allOrdersData.length;
      await loadOrders();
      const newCount = allOrdersData.length;
      console.log('[ADMIN] 재로드 후 주문 수:', { 이전: oldCount, 현재: newCount });
      console.log('[ADMIN] ===== 상태 변경 완료 =====');
    } else {
      console.error('[ADMIN] ❌ 상태 변경 실패:', data);
      showError('상태 변경 실패: ' + (data.error || data.details || ''));
    }
  } catch (err) {
    console.error('[ADMIN] 상태 변경 중 예외 발생:', err);
    showError('상태 변경 실패: ' + err.message);
  }
}

// 고객 목록 로드
async function loadCustomers() {
  try {
    console.log('[ADMIN] 고객 목록 로드 시작');
    const res = await fetch('/api/admin-customers', { headers: adminHeaders() });
    console.log('[ADMIN] API 응답 상태:', res.status, res.ok);

    if (!res.ok) throw new Error(`API 오류: ${res.status}`);
    const data = await res.json();
    console.log('[ADMIN] API 응답 데이터:', data);

    renderCustomers(data.customers || []);
    console.log('[ADMIN] 고객 목록 로드 완료');
  } catch (err) {
    console.error('[ADMIN] 고객 목록 로드 오류:', err.message);
    showError('고객 목록 로드 실패: ' + err.message);
  }
}

// 고객 렌더
function renderCustomers(customers) {
  const tbody = document.getElementById('customersTable');
  if (customers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);">고객이 없습니다.</td></tr>';
    return;
  }

  tbody.innerHTML = customers.map(c => `
    <tr>
      <td>${c.nickname || '(미입력)'}</td>
      <td>${c.phone || '(미입력)'}</td>
      <td>${c.order_count}</td>
      <td>₩${c.total_spent.toLocaleString()}</td>
    </tr>
  `).join('');
}

// 날짜 포맷 (YYYY.MM.DD)
function formatDateForDisplay(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('ko-KR').replace(/\./g, '.').replace(/\s/g, '');
}

// 날짜 표시 업데이트
function updateDateDisplay() {
  const from = document.getElementById('dateFromFilter').value;
  const to = document.getElementById('dateToFilter').value;

  if (from && to) {
    const fromText = formatDateForDisplay(from);
    const toText = formatDateForDisplay(to);
    document.getElementById('dateDisplay').textContent = `${fromText} → ${toText}`;
  }
}

// 이전 주
function prevWeek() {
  const from = document.getElementById('dateFromFilter').value;
  if (!from) {
    const today = new Date();
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    document.getElementById('dateFromFilter').value = sevenDaysAgo.toISOString().split('T')[0];
  } else {
    const date = new Date(from + 'T00:00:00');
    date.setDate(date.getDate() - 7);
    document.getElementById('dateFromFilter').value = date.toISOString().split('T')[0];
  }

  const to = document.getElementById('dateToFilter').value;
  if (to) {
    const toDate = new Date(to + 'T00:00:00');
    toDate.setDate(toDate.getDate() - 7);
    document.getElementById('dateToFilter').value = toDate.toISOString().split('T')[0];
  }

  updateDateDisplay();
  filterOrders();
}

// 다음 주
function nextWeek() {
  const from = document.getElementById('dateFromFilter').value;
  if (from) {
    const date = new Date(from + 'T00:00:00');
    date.setDate(date.getDate() + 7);
    document.getElementById('dateFromFilter').value = date.toISOString().split('T')[0];
  }

  const to = document.getElementById('dateToFilter').value;
  if (to) {
    const toDate = new Date(to + 'T00:00:00');
    toDate.setDate(toDate.getDate() + 7);
    document.getElementById('dateToFilter').value = toDate.toISOString().split('T')[0];
  }

  updateDateDisplay();
  filterOrders();
}

// 주문 필터
function filterOrders() {
  const status = document.getElementById('statusFilter').value;
  const searchText = document.getElementById('searchInput').value.toLowerCase();
  let filtered = allOrdersData;

  // 상태 필터
  if (status) {
    filtered = filtered.filter(o => o.status === status);
  }

  // 검색 필터 (이름, 전화번호, 주문번호)
  if (searchText) {
    filtered = filtered.filter(o => {
      const name = (o.buyer_name || '').toLowerCase();
      const phone = (o.buyer_phone || '').toLowerCase();
      const orderId = (o.order_id || '').toLowerCase();
      return name.includes(searchText) || phone.includes(searchText) || orderId.includes(searchText);
    });
  }

  renderAllOrders(filtered);
}

// 주문 상세 모달
function openOrderDetail(orderId) {
  const order = allOrdersData.find(o => o.id === orderId);
  if (!order) return;

  document.getElementById('detailOrderId').textContent = order.order_id;
  document.getElementById('detailBuyerName').textContent = order.buyer_name || '(미입력)';
  document.getElementById('detailBuyerPhone').textContent = order.buyer_phone || '(미입력)';
  document.getElementById('detailPlanName').textContent = order.plan_name;
  document.getElementById('detailAmount').textContent = '₩' + order.amount.toLocaleString();
  document.getElementById('detailGames').textContent = order.games ? order.games.split(',').join(', ') : '(없음)';
  document.getElementById('detailMemo').textContent = order.memo || '(없음)';
  document.getElementById('detailStatus').textContent = getStatusLabel(order.status);

  const date = new Date(order.created_at);
  document.getElementById('detailDate').textContent = date.toLocaleDateString('ko-KR') + ' ' + date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

  document.getElementById('orderDetailModal').style.display = 'flex';
}

function closeOrderDetail() {
  document.getElementById('orderDetailModal').style.display = 'none';
}

// 카카오톡 알림 발송
async function sendKakaoNotify() {
  const orderId = document.getElementById('detailOrderId').textContent;
  const buyerName = document.getElementById('detailBuyerName').textContent;
  const status = document.getElementById('detailStatus').textContent;

  if (!orderId || orderId === '-') {
    showError('주문 정보를 찾을 수 없습니다.');
    return;
  }

  try {
    const res = await fetch('/api/admin-notify', {
      method: 'POST',
      headers: adminHeaders(),
      body: JSON.stringify({
        orderId,
        buyerName,
        status,
        message: `주문번호 ${orderId}의 상태가 [${status}]로 변경되었습니다.`
      })
    });

    if (res.ok) {
      alert('카카오톡 알림이 발송되었습니다.');
    } else {
      const data = await res.json();
      showError(data.message || '알림 발송 실패');
    }
  } catch (err) {
    showError('알림 발송 실패: ' + err.message);
  }
}

// 헬퍼: 상태 라벨
function getStatusLabel(status) {
  const labels = {
    pending: '진행중',
    working: '작업중',
    done: '완료',
    refunded: '환불',
    cancelled: '취소'
  };
  return labels[status] || status;
}

// 에러 표시
function showError(msg) {
  alert(msg);
}

// 캘린더 모달 열기
function openCalendarModal() {
  const from = document.getElementById('dateFromFilter').value;
  const to = document.getElementById('dateToFilter').value;

  document.getElementById('calendarFromInput').value = from || '';
  document.getElementById('calendarToInput').value = to || '';
  renderCalendarPreview();

  document.getElementById('calendarModal').style.display = 'flex';
}

// 캘린더 모달 닫기
function closeCalendarModal() {
  document.getElementById('calendarModal').style.display = 'none';
}

// 캘린더 미리보기 렌더링
function renderCalendarPreview() {
  const from = document.getElementById('calendarFromInput').value;
  const to = document.getElementById('calendarToInput').value;

  if (from && to) {
    const fromText = formatDateForDisplay(from);
    const toText = formatDateForDisplay(to);
    document.getElementById('calendarPreview').textContent = `${fromText} → ${toText}`;
  }
}

// 날짜 범위 설정 (버튼)
function setDateRange(type) {
  const today = new Date();
  let from = new Date();

  if (type === '1week') {
    from.setDate(today.getDate() - 7);
  } else if (type === '1month') {
    from.setDate(today.getDate() - 30);
  } else if (type === '3month') {
    from.setDate(today.getDate() - 90);
  }

  document.getElementById('calendarFromInput').value = from.toISOString().split('T')[0];
  document.getElementById('calendarToInput').value = today.toISOString().split('T')[0];
  renderCalendarPreview();
}

// 캘린더 필터 적용
function applyCalendarFilter() {
  const from = document.getElementById('calendarFromInput').value;
  const to = document.getElementById('calendarToInput').value;

  if (from && to) {
    document.getElementById('dateFromFilter').value = from;
    document.getElementById('dateToFilter').value = to;
    updateDateDisplay();
    filterOrders();
  }

  closeCalendarModal();
}

// 시간 업데이트
function updateTime() {
  const now = new Date();
  const time = now.toLocaleTimeString('ko-KR');
  const timeEl = document.getElementById('currentTime');
  if (timeEl) timeEl.textContent = time;
}

// 매초 시간 업데이트
setInterval(updateTime, 1000);
updateTime();

// 다크/라이트 모드 토글
function toggleDarkMode() {
  const isDark = document.body.classList.contains('light-mode');
  if (isDark) {
    document.body.classList.remove('light-mode');
    localStorage.setItem('adminMode', 'dark');
  } else {
    document.body.classList.add('light-mode');
    localStorage.setItem('adminMode', 'light');
  }
}

// 관리자 이름 저장
function saveAdminName() {
  const nameInput = document.getElementById('adminName');
  const name = nameInput.value.trim();
  if (name) {
    localStorage.setItem('adminName', name);
    alert('관리자 이름이 저장되었습니다.');
  } else {
    alert('이름을 입력하세요.');
  }
}

// 초기화: 저장된 설정 복원
function initAdmin() {
  // 관리자 토큰 없으면 로그인 페이지로
  const token = localStorage.getItem('adminToken');
  if (!token) {
    location.href = '/admin-login.html';
    return;
  }

  // 모드 복원
  const savedMode = localStorage.getItem('adminMode');
  if (savedMode === 'light') {
    document.body.classList.add('light-mode');
  }

  // 관리자 이름 복원
  const savedName = localStorage.getItem('adminName');
  const nameInput = document.getElementById('adminName');
  if (savedName && nameInput) {
    nameInput.value = savedName;
  }

  // 관리자 이메일 표시
  const adminEmail = localStorage.getItem('adminEmail');

  // 헤더 이메일 표시
  const headerEmailEl = document.getElementById('headerEmail');
  if (adminEmail && headerEmailEl) {
    headerEmailEl.textContent = adminEmail;
  }

  // 대시보드 관리자 이메일 표시
  const dashboardAdminEmailEl = document.getElementById('dashboardAdminEmail');
  if (adminEmail && dashboardAdminEmailEl) {
    dashboardAdminEmailEl.textContent = adminEmail;
  }


  // 대시보드 날짜 범위 초기 표시
  const dateRangeEl = document.getElementById('dateRangeDisplay');
  if (dateRangeEl) {
    dateRangeEl.textContent = formatDateRange('today');
  }
}

// 초기 로드
window.addEventListener('load', () => {
  initAdmin();
  loadDashboard();
});
