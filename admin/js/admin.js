// ══════════════════════════════════════════════════════
// Supabase 설정
// ══════════════════════════════════════════════════════
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

const { createClient } = window.supabase;
let supabase = null;
let currentUser = null;

// ══════════════════════════════════════════════════════
// 초기화
// ══════════════════════════════════════════════════════
function initSupabase() {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  checkAuth();
}

function checkAuth() {
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) {
      currentUser = session.user;
      showView('dashboard');
      loadDashboard();
    } else {
      showView('login');
    }
  });

  // 세션 변경 감지
  supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
      currentUser = session.user;
      showView('dashboard');
      loadDashboard();
    } else {
      currentUser = null;
      showView('login');
    }
  });
}

function showView(viewName) {
  document.querySelectorAll('.admin-view').forEach(v => v.style.display = 'none');
  const view = document.getElementById(`view-${viewName}`);
  if (view) view.style.display = '';

  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navItem = document.querySelector(`[data-view="${viewName}"]`);
  if (navItem) navItem.classList.add('active');
}

// ══════════════════════════════════════════════════════
// 인증
// ══════════════════════════════════════════════════════
async function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const errorEl = document.getElementById('loginError');

  errorEl.textContent = '로그인 중...';

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      errorEl.textContent = error.message || '로그인에 실패했습니다.';
    } else {
      errorEl.textContent = '';
      showToast('로그인 성공!', 'success');
    }
  } catch (err) {
    errorEl.textContent = err.message || '로그인 중 오류가 발생했습니다.';
  }
}

async function handleLogout() {
  const { error } = await supabase.auth.signOut();
  if (!error) {
    showToast('로그아웃되었습니다.', 'success');
  }
}

// ══════════════════════════════════════════════════════
// 대시보드
// ══════════════════════════════════════════════════════
async function loadDashboard() {
  const stats = await loadStats();
  renderDashboard(stats);
}

async function loadStats() {
  const { data: orders, error } = await supabase
    .from('orders')
    .select('amount, status', { count: 'exact' });

  if (error) {
    console.error('통계 로드 오류:', error);
    return { totalRevenue: 0, totalOrders: 0, pending: 0, done: 0 };
  }

  const totalRevenue = orders.reduce((sum, o) => sum + (o.amount || 0), 0);
  const pending = orders.filter(o => o.status === 'pending').length;
  const done = orders.filter(o => o.status === 'done').length;

  return {
    totalRevenue,
    totalOrders: orders.length,
    pending,
    done,
  };
}

function renderDashboard(stats) {
  document.getElementById('statTotalRevenue').textContent = '₩' + stats.totalRevenue.toLocaleString('ko-KR');
  document.getElementById('statTotalOrders').textContent = stats.totalOrders.toString();
  document.getElementById('statPending').textContent = stats.pending.toString();
  document.getElementById('statDone').textContent = stats.done.toString();

  loadRecentOrders();
}

async function loadRecentOrders() {
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, order_id, buyer_name, amount, status, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('최근 주문 로드 오류:', error);
    return;
  }

  const html = orders.map(o => `
    <div class="order-item" onclick="openOrderDetail('${o.id}')">
      <div class="order-item-row">
        <span class="order-item-name">${o.buyer_name || '(이름없음)'}</span>
        <span class="order-item-amount">₩${(o.amount || 0).toLocaleString('ko-KR')}</span>
      </div>
      <div style="margin-top: 8px; font-size: 0.8rem; color: var(--text-secondary);">
        ${formatDate(o.created_at)} · <span class="badge ${statusBadgeClass(o.status)}">${statusLabel(o.status)}</span>
      </div>
    </div>
  `).join('');

  document.getElementById('recentOrdersList').innerHTML = html || '<p>주문이 없습니다.</p>';
}

// ══════════════════════════════════════════════════════
// 주문관리
// ══════════════════════════════════════════════════════
async function loadOrders() {
  const status = document.getElementById('orderStatusFilter').value;
  const search = document.getElementById('orderSearchInput').value.toLowerCase();

  let query = supabase
    .from('orders')
    .select('id, order_id, buyer_name, buyer_contact, amount, status, created_at')
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data: orders, error } = await query;

  if (error) {
    console.error('주문 로드 오류:', error);
    showToast('주문 로드 실패', 'error');
    return;
  }

  // 클라이언트 필터링
  const filtered = orders.filter(o =>
    !search ||
    (o.buyer_name || '').toLowerCase().includes(search) ||
    (o.buyer_contact || '').toLowerCase().includes(search) ||
    (o.order_id || '').toLowerCase().includes(search)
  );

  renderOrderTable(filtered);
}

function renderOrderTable(orders) {
  const html = orders.length > 0
    ? `<table class="admin-table">
        <thead>
          <tr>
            <th>주문번호</th>
            <th>고객명</th>
            <th>연락처</th>
            <th>금액</th>
            <th>상태</th>
            <th>날짜</th>
            <th>동작</th>
          </tr>
        </thead>
        <tbody>
          ${orders.map(o => `
            <tr>
              <td><code style="font-size:0.75rem">${o.order_id || ''}</code></td>
              <td>${o.buyer_name || '(이름없음)'}</td>
              <td>${o.buyer_contact || '-'}</td>
              <td>₩${(o.amount || 0).toLocaleString('ko-KR')}</td>
              <td><span class="badge ${statusBadgeClass(o.status)}">${statusLabel(o.status)}</span></td>
              <td>${formatDate(o.created_at)}</td>
              <td>
                <button class="btn-primary btn-small" onclick="openOrderDetail('${o.id}')">상세</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>`
    : '<p>주문이 없습니다.</p>';

  document.getElementById('ordersList').innerHTML = html;
}

async function openOrderDetail(orderId) {
  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (error || !order) {
    showToast('주문 로드 실패', 'error');
    return;
  }

  const statusOptions = ['pending', 'working', 'done', 'refunded', 'cancelled'];
  const html = `
    <div style="display: grid; gap: 15px;">
      <div>
        <label style="font-weight: 600; display: block; margin-bottom: 8px;">주문번호</label>
        <input type="text" value="${order.order_id || ''}" readonly style="background: var(--bg-main);">
      </div>
      <div>
        <label style="font-weight: 600; display: block; margin-bottom: 8px;">고객명</label>
        <input type="text" value="${order.buyer_name || ''}" readonly style="background: var(--bg-main);">
      </div>
      <div>
        <label style="font-weight: 600; display: block; margin-bottom: 8px;">연락처</label>
        <input type="text" value="${order.buyer_contact || ''}" readonly style="background: var(--bg-main);">
      </div>
      <div>
        <label style="font-weight: 600; display: block; margin-bottom: 8px;">서비스</label>
        <input type="text" value="${order.plan_name || ''}" readonly style="background: var(--bg-main);">
      </div>
      <div>
        <label style="font-weight: 600; display: block; margin-bottom: 8px;">금액</label>
        <input type="text" value="₩${(order.amount || 0).toLocaleString('ko-KR')}" readonly style="background: var(--bg-main);">
      </div>
      <div>
        <label style="font-weight: 600; display: block; margin-bottom: 8px;">게임</label>
        <input type="text" value="${order.games || ''}" readonly style="background: var(--bg-main);">
      </div>
      <div>
        <label style="font-weight: 600; display: block; margin-bottom: 8px;">고객 메모</label>
        <textarea readonly style="background: var(--bg-main); resize: none; height: 80px;">${order.memo || ''}</textarea>
      </div>
      <div>
        <label style="font-weight: 600; display: block; margin-bottom: 8px;">상태</label>
        <select id="detailStatus" onchange="updateOrderStatus('${order.id}', this.value)">
          ${statusOptions.map(s => `
            <option value="${s}" ${order.status === s ? 'selected' : ''}>${statusLabel(s)}</option>
          `).join('')}
        </select>
      </div>
      <div>
        <label style="font-weight: 600; display: block; margin-bottom: 8px;">관리자 메모</label>
        <textarea id="detailAdminMemo" placeholder="메모를 입력하세요...">${order.admin_memo || ''}</textarea>
      </div>
      <button class="btn-primary" onclick="saveAdminMemo('${order.id}')">메모 저장</button>
    </div>
  `;

  document.getElementById('orderDetailBody').innerHTML = html;
  document.getElementById('orderDetailModal').style.display = 'flex';
}

async function updateOrderStatus(orderId, status) {
  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId);

  if (error) {
    showToast('상태 변경 실패', 'error');
  } else {
    showToast('상태 변경 완료', 'success');
    loadOrders();
  }
}

async function saveAdminMemo(orderId) {
  const memo = document.getElementById('detailAdminMemo').value;
  const { error } = await supabase
    .from('orders')
    .update({ admin_memo: memo })
    .eq('id', orderId);

  if (error) {
    showToast('메모 저장 실패', 'error');
  } else {
    showToast('메모 저장 완료', 'success');
  }
}

// ══════════════════════════════════════════════════════
// 쿠폰관리
// ══════════════════════════════════════════════════════
async function loadCoupons() {
  const { data: coupons, error } = await supabase
    .from('coupons')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('쿠폰 로드 오류:', error);
    return;
  }

  renderCouponTable(coupons);
}

function renderCouponTable(coupons) {
  const html = coupons.length > 0
    ? `<table class="admin-table">
        <thead>
          <tr>
            <th>코드</th>
            <th>유형</th>
            <th>값</th>
            <th>라벨</th>
            <th>사용됨</th>
            <th>상태</th>
            <th>동작</th>
          </tr>
        </thead>
        <tbody>
          ${coupons.map(c => `
            <tr>
              <td><code style="font-size:0.75rem">${c.code}</code></td>
              <td>${c.type === 'percent' ? '%' : '₩'}</td>
              <td>${c.value}</td>
              <td>${c.label}</td>
              <td>${c.used_count}${c.max_uses ? `/${c.max_uses}` : ''}</td>
              <td>
                <button class="btn-secondary btn-small" onclick="toggleCoupon('${c.id}', ${!c.is_active})">
                  ${c.is_active ? '활성' : '비활성'}
                </button>
              </td>
              <td>
                <button class="btn-primary btn-small" onclick="openCouponModal('${c.id}')">수정</button>
                <button class="btn-danger btn-small" onclick="deleteCoupon('${c.id}')">삭제</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>`
    : '<p>쿠폰이 없습니다.</p>';

  document.getElementById('couponsList').innerHTML = html;
}

function openCouponModal(couponId = null) {
  const titleEl = document.getElementById('couponModalTitle');
  const form = document.getElementById('couponForm');

  if (couponId) {
    titleEl.textContent = '쿠폰 수정';
    loadCouponForEdit(couponId);
  } else {
    titleEl.textContent = '쿠폰 추가';
    form.reset();
    form.dataset.couponId = '';
  }

  document.getElementById('couponModal').style.display = 'flex';
}

async function loadCouponForEdit(couponId) {
  const { data: coupon, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('id', couponId)
    .single();

  if (error || !coupon) {
    showToast('쿠폰 로드 실패', 'error');
    return;
  }

  const form = document.getElementById('couponForm');
  form.dataset.couponId = couponId;
  document.getElementById('couponCode').value = coupon.code;
  document.getElementById('couponType').value = coupon.type;
  document.getElementById('couponValue').value = coupon.value;
  document.getElementById('couponLabel').value = coupon.label;
  document.getElementById('couponMaxUses').value = coupon.max_uses || '';
  document.getElementById('couponExpires').value = coupon.expires_at ? coupon.expires_at.split('T')[0] : '';

  toggleCouponValue();
}

function toggleCouponValue() {
  const type = document.getElementById('couponType').value;
  const label = document.getElementById('couponValueLabel');
  label.textContent = type === 'percent' ? '할인율 (%)' : '할인액 (₩)';
}

async function saveCoupon(event) {
  event.preventDefault();
  const couponId = document.getElementById('couponForm').dataset.couponId;
  const data = {
    code: document.getElementById('couponCode').value.toUpperCase(),
    type: document.getElementById('couponType').value,
    value: parseInt(document.getElementById('couponValue').value),
    label: document.getElementById('couponLabel').value,
    max_uses: document.getElementById('couponMaxUses').value ? parseInt(document.getElementById('couponMaxUses').value) : null,
    expires_at: document.getElementById('couponExpires').value || null,
  };

  let error;
  if (couponId) {
    ({ error } = await supabase
      .from('coupons')
      .update(data)
      .eq('id', couponId));
  } else {
    ({ error } = await supabase
      .from('coupons')
      .insert([data]));
  }

  if (error) {
    showToast('쿠폰 저장 실패: ' + error.message, 'error');
  } else {
    showToast('쿠폰 저장 완료', 'success');
    document.getElementById('couponModal').style.display = 'none';
    loadCoupons();
  }
}

async function toggleCoupon(couponId, isActive) {
  const { error } = await supabase
    .from('coupons')
    .update({ is_active: isActive })
    .eq('id', couponId);

  if (error) {
    showToast('상태 변경 실패', 'error');
  } else {
    showToast('상태 변경 완료', 'success');
    loadCoupons();
  }
}

async function deleteCoupon(couponId) {
  if (!confirm('이 쿠폰을 삭제하시겠습니까?')) return;

  const { error } = await supabase
    .from('coupons')
    .delete()
    .eq('id', couponId);

  if (error) {
    showToast('쿠폰 삭제 실패', 'error');
  } else {
    showToast('쿠폰 삭제 완료', 'success');
    loadCoupons();
  }
}

// ══════════════════════════════════════════════════════
// 고객조회
// ══════════════════════════════════════════════════════
async function loadCustomers() {
  const search = document.getElementById('customerSearchInput').value.toLowerCase();

  const { data: customers, error } = await supabase
    .from('customers')
    .select('id, kakao_id, nickname, email, phone, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('고객 로드 오류:', error);
    return;
  }

  const filtered = customers.filter(c =>
    !search ||
    (c.nickname || '').toLowerCase().includes(search) ||
    (c.kakao_id || '').toLowerCase().includes(search)
  );

  renderCustomerList(filtered);
}

function renderCustomerList(customers) {
  const html = customers.length > 0
    ? `<table class="admin-table">
        <thead>
          <tr>
            <th>이름</th>
            <th>카카오ID</th>
            <th>이메일</th>
            <th>연락처</th>
            <th>등록일</th>
            <th>동작</th>
          </tr>
        </thead>
        <tbody>
          ${customers.map(c => `
            <tr>
              <td>${c.nickname || '-'}</td>
              <td><code style="font-size:0.75rem">${c.kakao_id || ''}</code></td>
              <td>${c.email || '-'}</td>
              <td>${c.phone || '-'}</td>
              <td>${formatDate(c.created_at)}</td>
              <td>
                <button class="btn-primary btn-small" onclick="openCustomerDetail('${c.id}')">주문이력</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>`
    : '<p>고객이 없습니다.</p>';

  document.getElementById('customersList').innerHTML = html;
}

async function openCustomerDetail(customerId) {
  const { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .single();

  const { data: orders } = await supabase
    .from('orders')
    .select('order_id, plan_name, amount, status, created_at')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  const html = `
    <div style="display: grid; gap: 15px;">
      <div>
        <label style="font-weight: 600; display: block; margin-bottom: 8px;">이름</label>
        <input type="text" value="${customer?.nickname || ''}" readonly style="background: var(--bg-main);">
      </div>
      <div>
        <label style="font-weight: 600; display: block; margin-bottom: 8px;">카카오ID</label>
        <input type="text" value="${customer?.kakao_id || ''}" readonly style="background: var(--bg-main);">
      </div>
      <div>
        <label style="font-weight: 600; display: block; margin-bottom: 8px;">이메일</label>
        <input type="text" value="${customer?.email || ''}" readonly style="background: var(--bg-main);">
      </div>
      <div>
        <label style="font-weight: 600; display: block; margin-bottom: 8px;">주문이력</label>
        ${orders && orders.length > 0 ? `
          <table class="admin-table" style="margin-top: 10px;">
            <thead>
              <tr>
                <th>주문번호</th>
                <th>서비스</th>
                <th>금액</th>
                <th>상태</th>
                <th>날짜</th>
              </tr>
            </thead>
            <tbody>
              ${orders.map(o => `
                <tr>
                  <td><code style="font-size:0.75rem">${o.order_id}</code></td>
                  <td>${o.plan_name}</td>
                  <td>₩${(o.amount || 0).toLocaleString('ko-KR')}</td>
                  <td><span class="badge ${statusBadgeClass(o.status)}">${statusLabel(o.status)}</span></td>
                  <td>${formatDate(o.created_at)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : '<p>주문이 없습니다.</p>'}
      </div>
    </div>
  `;

  document.getElementById('orderDetailBody').innerHTML = html;
  document.getElementById('orderDetailModal').style.display = 'flex';
}

// ══════════════════════════════════════════════════════
// 유틸
// ══════════════════════════════════════════════════════
function formatDate(isoString) {
  if (!isoString) return '-';
  const date = new Date(isoString);
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function statusLabel(status) {
  const labels = {
    pending: '대기',
    working: '작업중',
    done: '완료',
    refunded: '환불',
    cancelled: '취소',
  };
  return labels[status] || status;
}

function statusBadgeClass(status) {
  return `badge-${status}`;
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// ══════════════════════════════════════════════════════
// 초기화
// ══════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  initSupabase();

  // 뷰 전환 시 데이터 리로드
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const view = item.dataset.view;
      if (view === 'orders') {
        setTimeout(() => loadOrders(), 100);
      } else if (view === 'coupons') {
        setTimeout(() => loadCoupons(), 100);
      } else if (view === 'customers') {
        setTimeout(() => loadCustomers(), 100);
      }
    });
  });

  // 모달 외부 클릭 시 닫기
  document.querySelectorAll('.modal-backdrop').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.style.display = 'none';
    });
  });
});
