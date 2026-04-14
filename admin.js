// 탭 전환
function switchTab(tabName) {
  document.querySelectorAll('.admin-tab').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.admin-nav-btn').forEach(btn => btn.classList.remove('active'));

  document.getElementById(tabName + '-tab').classList.add('active');
  event.target.classList.add('active');

  if (tabName === 'dashboard') loadDashboard();
  else if (tabName === 'orders') loadOrders();
  else if (tabName === 'coupons') loadCoupons();
  else if (tabName === 'customers') loadCustomers();
}

function goHome() {
  location.href = '/';
}

// 대시보드 데이터 로드
async function loadDashboard() {
  try {
    const res = await fetch('/api/admin-dashboard');
    if (!res.ok) throw new Error('Failed to load dashboard');
    const data = await res.json();

    document.getElementById('totalRevenue').textContent = '₩' + data.totalRevenue.toLocaleString();
    document.getElementById('totalOrders').textContent = data.totalOrders;
    document.getElementById('pendingOrders').textContent = data.pendingOrders;
    document.getElementById('completedOrders').textContent = data.completedOrders;

    renderRecentOrders(data.recentOrders);
  } catch (err) {
    console.error('Dashboard load error:', err);
    showError('대시보드 로드 실패');
  }
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

// 주문 목록 로드
async function loadOrders() {
  try {
    const res = await fetch('/api/admin-orders');
    if (!res.ok) throw new Error('Failed to load orders');
    const data = await res.json();
    renderAllOrders(data.orders);
  } catch (err) {
    console.error('Orders load error:', err);
    showError('주문 목록 로드 실패');
  }
}

// 전체 주문 렌더
function renderAllOrders(orders) {
  const tbody = document.getElementById('allOrdersTable');
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
      <td><button class="admin-btn" onclick="updateOrderStatus('${o.id}', '${o.status}')">상태변경</button></td>
    </tr>
  `).join('');
}

// 주문 상태 업데이트
async function updateOrderStatus(orderId, currentStatus) {
  const newStatus = currentStatus === 'pending' ? 'completed' : 'pending';
  try {
    const res = await fetch('/api/admin-update-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, status: newStatus })
    });
    if (res.ok) {
      alert('주문 상태가 변경되었습니다.');
      loadOrders();
    }
  } catch (err) {
    showError('상태 변경 실패');
  }
}

// 쿠폰 목록 로드
async function loadCoupons() {
  try {
    const res = await fetch('/api/admin-coupons');
    if (!res.ok) throw new Error('Failed to load coupons');
    const data = await res.json();
    renderCoupons(data.coupons);
  } catch (err) {
    console.error('Coupons load error:', err);
    showError('쿠폰 목록 로드 실패');
  }
}

// 쿠폰 렌더
function renderCoupons(coupons) {
  const tbody = document.getElementById('couponsTable');
  if (coupons.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);">쿠폰이 없습니다.</td></tr>';
    return;
  }

  tbody.innerHTML = coupons.map(c => `
    <tr>
      <td>${c.code}</td>
      <td>${c.discount_type === 'percent' ? c.discount_value + '%' : '₩' + c.discount_value.toLocaleString()}</td>
      <td>${c.used_count || 0}</td>
      <td>${c.max_uses || '무제한'}</td>
    </tr>
  `).join('');
}

// 고객 목록 로드
async function loadCustomers() {
  try {
    const res = await fetch('/api/admin-customers');
    if (!res.ok) throw new Error('Failed to load customers');
    const data = await res.json();
    renderCustomers(data.customers);
  } catch (err) {
    console.error('Customers load error:', err);
    showError('고객 목록 로드 실패');
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

// 주문 필터
function filterOrders() {
  const status = document.getElementById('statusFilter').value;
  // TODO: 상태별 필터 구현
  loadOrders();
}

// 헬퍼: 상태 라벨
function getStatusLabel(status) {
  const labels = {
    pending: '진행중',
    completed: '완료',
    cancelled: '취소'
  };
  return labels[status] || status;
}

// 에러 표시
function showError(msg) {
  alert(msg);
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

// 초기 로드
window.addEventListener('load', loadDashboard);
