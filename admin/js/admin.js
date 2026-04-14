(function() {
  'use strict';

  // ══════════════════════════════════════════════════════
  // 설정
  // ══════════════════════════════════════════════════════
  const TEST_MODE = true;
  const SUPABASE_URL = 'https://lrdpfqfkieuojloxsdpy.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxyZHBmcWZraWV1b2psb3hzZHB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMzgwMjMsImV4cCI6MjA5MTcxNDAyM30.i9RLxqoNkOQOEnWRvqyuxtoFeKnxMMDSn-YV8WCdQIs';

  let supabase = null;
  let currentUser = null;

  // ══════════════════════════════════════════════════════
  // 초기화
  // ══════════════════════════════════════════════════════
  window.initSupabase = function() {
    // Supabase 로드 확인
    if (!window.supabase) {
      console.warn('Supabase가 아직 로드되지 않았습니다. 대기 중...');
      setTimeout(window.initSupabase, 200);
      return;
    }

    const { createClient } = window.supabase;
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    checkAuth();
  };

  function checkAuth() {
    // TEST_MODE: 로그인 건너뛰고 바로 대시보드
    if (TEST_MODE) {
      currentUser = { email: 'admin@test.com', id: 'test-admin' };
      updateSidebarUI(true);
      window.showView('dashboard');
      loadDashboard();
      return;
    }

    // 실제 인증: Supabase 세션 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        currentUser = session.user;
        updateSidebarUI(true);
        window.showView('dashboard');
        loadDashboard();
      } else {
        updateSidebarUI(false);
        window.showView('login');
      }
    }).catch(err => {
      console.error('세션 확인 에러:', err);
      updateSidebarUI(false);
      window.showView('login');
    });

    supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        currentUser = session.user;
        updateSidebarUI(true);
        window.showView('dashboard');
        loadDashboard();
      } else {
        currentUser = null;
        updateSidebarUI(false);
        window.showView('login');
      }
    });
  }

  function updateSidebarUI(isLoggedIn) {
    const sidebarFooter = document.getElementById('sidebarFooter');
    if (sidebarFooter) {
      sidebarFooter.style.display = isLoggedIn ? 'block' : 'none';
    }
  }

  window.showView = function(viewName) {
    document.querySelectorAll('.admin-view').forEach(v => v.style.display = 'none');
    const view = document.getElementById(`view-${viewName}`);
    if (view) view.style.display = '';

    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const navItem = document.querySelector(`[data-view="${viewName}"]`);
    if (navItem) navItem.classList.add('active');
  };

  // ══════════════════════════════════════════════════════
  // 인증
  // ══════════════════════════════════════════════════════
  window.handleLogin = async function(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');

    errorEl.textContent = '로그인 중...';

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        errorEl.textContent = error.message || '로그인에 실패했습니다.';
        console.error('로그인 에러:', error);
      } else {
        errorEl.textContent = '';
        window.showToast('로그인 성공!', 'success');
      }
    } catch (err) {
      errorEl.textContent = err.message || '로그인 중 오류가 발생했습니다.';
      console.error('로그인 예외:', err);
    }
  };

  window.handleLogout = async function() {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      window.showToast('로그아웃되었습니다.', 'success');
    }
  };

  // ══════════════════════════════════════════════════════
  // 대시보드
  // ══════════════════════════════════════════════════════
  async function loadDashboard() {
    const stats = await loadStats();
    renderDashboard(stats);
  }

  async function loadStats() {
    try {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('amount, status', { count: 'exact' });

      if (error) {
        console.error('통계 로드 에러:', error);
        return { totalRevenue: 0, totalOrders: 0, pending: 0, done: 0 };
      }

      const totalRevenue = orders.reduce((sum, o) => sum + (o.amount || 0), 0);
      const pending = orders.filter(o => o.status === 'pending').length;
      const done = orders.filter(o => o.status === 'done').length;

      return { totalRevenue, totalOrders: orders.length, pending, done };
    } catch (err) {
      console.error('통계 조회 예외:', err);
      return { totalRevenue: 0, totalOrders: 0, pending: 0, done: 0 };
    }
  }

  function renderDashboard(stats) {
    document.getElementById('statTotalRevenue').textContent = '₩' + stats.totalRevenue.toLocaleString('ko-KR');
    document.getElementById('statTotalOrders').textContent = stats.totalOrders.toString();
    document.getElementById('statPending').textContent = stats.pending.toString();
    document.getElementById('statDone').textContent = stats.done.toString();
    loadRecentOrders();
  }

  async function loadRecentOrders() {
    try {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, order_id, buyer_name, amount, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('최근 주문 로드 에러:', error);
        return;
      }

      const html = orders.map(o => `
        <div class="order-item" onclick="window.openOrderDetail('${o.id}')">
          <div class="order-item-row">
            <span class="order-item-name">${o.buyer_name || '(이름없음)'}</span>
            <span class="order-item-amount">₩${(o.amount || 0).toLocaleString('ko-KR')}</span>
          </div>
          <div style="margin-top: 8px; font-size: 0.8rem; color: var(--text-secondary);">
            ${window.formatDate(o.created_at)} · <span class="badge ${window.statusBadgeClass(o.status)}">${window.statusLabel(o.status)}</span>
          </div>
        </div>
      `).join('');

      document.getElementById('recentOrdersList').innerHTML = html || '<p>주문이 없습니다.</p>';
    } catch (err) {
      console.error('최근 주문 조회 예외:', err);
    }
  }

  // ══════════════════════════════════════════════════════
  // 주문관리
  // ══════════════════════════════════════════════════════
  window.loadOrders = async function() {
    try {
      const status = document.getElementById('orderStatusFilter').value;
      const search = document.getElementById('orderSearchInput').value.toLowerCase();

      let query = supabase
        .from('orders')
        .select('id, order_id, buyer_name, buyer_contact, amount, status, created_at')
        .order('created_at', { ascending: false });

      if (status) query = query.eq('status', status);

      const { data: orders, error } = await query;
      if (error) {
        console.error('주문 로드 에러:', error);
        window.showToast('주문 로드 실패', 'error');
        return;
      }

      const filtered = orders.filter(o =>
        !search ||
        (o.buyer_name || '').toLowerCase().includes(search) ||
        (o.buyer_contact || '').toLowerCase().includes(search) ||
        (o.order_id || '').toLowerCase().includes(search)
      );

      renderOrderTable(filtered);
    } catch (err) {
      console.error('주문 조회 예외:', err);
    }
  };

  function renderOrderTable(orders) {
    const html = orders.length > 0
      ? `<table class="admin-table">
          <thead><tr><th>주문번호</th><th>고객명</th><th>연락처</th><th>금액</th><th>상태</th><th>날짜</th><th>동작</th></tr></thead>
          <tbody>
            ${orders.map(o => `
              <tr>
                <td><code style="font-size:0.75rem">${o.order_id || ''}</code></td>
                <td>${o.buyer_name || '(이름없음)'}</td>
                <td>${o.buyer_contact || '-'}</td>
                <td>₩${(o.amount || 0).toLocaleString('ko-KR')}</td>
                <td><span class="badge ${window.statusBadgeClass(o.status)}">${window.statusLabel(o.status)}</span></td>
                <td>${window.formatDate(o.created_at)}</td>
                <td><button class="btn-primary btn-small" onclick="window.openOrderDetail('${o.id}')">상세</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>`
      : '<p>주문이 없습니다.</p>';

    document.getElementById('ordersList').innerHTML = html;
  }

  window.openOrderDetail = async function(orderId) {
    try {
      const { data: order, error } = await supabase.from('orders').select('*').eq('id', orderId).single();
      if (error || !order) {
        window.showToast('주문 로드 실패', 'error');
        return;
      }

      const statusOptions = ['pending', 'working', 'done', 'refunded', 'cancelled'];
      const html = `
        <div style="display: grid; gap: 15px;">
          <div><label style="font-weight: 600; display: block; margin-bottom: 8px;">주문번호</label><input type="text" value="${order.order_id || ''}" readonly style="background: var(--bg-main);"></div>
          <div><label style="font-weight: 600; display: block; margin-bottom: 8px;">고객명</label><input type="text" value="${order.buyer_name || ''}" readonly style="background: var(--bg-main);"></div>
          <div><label style="font-weight: 600; display: block; margin-bottom: 8px;">상태</label><select id="detailStatus" onchange="window.updateOrderStatus('${order.id}', this.value)">${statusOptions.map(s => `<option value="${s}" ${order.status === s ? 'selected' : ''}>${window.statusLabel(s)}</option>`).join('')}</select></div>
          <div><label style="font-weight: 600; display: block; margin-bottom: 8px;">관리자 메모</label><textarea id="detailAdminMemo" placeholder="메모를 입력하세요...">${order.admin_memo || ''}</textarea></div>
          <button class="btn-primary" onclick="window.saveAdminMemo('${order.id}')">메모 저장</button>
        </div>
      `;
      document.getElementById('orderDetailBody').innerHTML = html;
      document.getElementById('orderDetailModal').style.display = 'flex';
    } catch (err) {
      console.error('주문 상세 조회 예외:', err);
    }
  };

  window.updateOrderStatus = async function(orderId, status) {
    try {
      const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
      if (error) {
        window.showToast('상태 변경 실패', 'error');
      } else {
        window.showToast('상태 변경 완료', 'success');
        window.loadOrders();
      }
    } catch (err) {
      console.error('상태 변경 예외:', err);
    }
  };

  window.saveAdminMemo = async function(orderId) {
    try {
      const memo = document.getElementById('detailAdminMemo').value;
      const { error } = await supabase.from('orders').update({ admin_memo: memo }).eq('id', orderId);
      if (error) {
        window.showToast('메모 저장 실패', 'error');
      } else {
        window.showToast('메모 저장 완료', 'success');
      }
    } catch (err) {
      console.error('메모 저장 예외:', err);
    }
  };

  // ══════════════════════════════════════════════════════
  // 쿠폰관리
  // ══════════════════════════════════════════════════════
  window.loadCoupons = async function() {
    try {
      const { data: coupons, error } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
      if (error) {
        console.error('쿠폰 로드 에러:', error);
        return;
      }
      renderCouponTable(coupons);
    } catch (err) {
      console.error('쿠폰 조회 예외:', err);
    }
  };

  function renderCouponTable(coupons) {
    const html = coupons.length > 0
      ? `<table class="admin-table">
          <thead><tr><th>코드</th><th>유형</th><th>값</th><th>라벨</th><th>사용됨</th><th>상태</th><th>동작</th></tr></thead>
          <tbody>${coupons.map(c => `<tr><td><code style="font-size:0.75rem">${c.code}</code></td><td>${c.type === 'percent' ? '%' : '₩'}</td><td>${c.value}</td><td>${c.label}</td><td>${c.used_count}${c.max_uses ? `/${c.max_uses}` : ''}</td><td><button class="btn-secondary btn-small" onclick="window.toggleCoupon('${c.id}', ${!c.is_active})">${c.is_active ? '활성' : '비활성'}</button></td><td><button class="btn-primary btn-small" onclick="window.openCouponModal('${c.id}')">수정</button><button class="btn-danger btn-small" onclick="window.deleteCoupon('${c.id}')">삭제</button></td></tr>`).join('')}</tbody>
        </table>`
      : '<p>쿠폰이 없습니다.</p>';
    document.getElementById('couponsList').innerHTML = html;
  }

  window.openCouponModal = async function(couponId = null) {
    const titleEl = document.getElementById('couponModalTitle');
    const form = document.getElementById('couponForm');
    if (couponId) {
      titleEl.textContent = '쿠폰 수정';
      try {
        const { data: coupon } = await supabase.from('coupons').select('*').eq('id', couponId).single();
        if (coupon) {
          form.dataset.couponId = couponId;
          document.getElementById('couponCode').value = coupon.code;
          document.getElementById('couponType').value = coupon.type;
          document.getElementById('couponValue').value = coupon.value;
          document.getElementById('couponLabel').value = coupon.label;
          document.getElementById('couponMaxUses').value = coupon.max_uses || '';
          document.getElementById('couponExpires').value = coupon.expires_at ? coupon.expires_at.split('T')[0] : '';
          window.toggleCouponValue();
        }
      } catch (err) {
        console.error('쿠폰 편집 로드 예외:', err);
      }
    } else {
      titleEl.textContent = '쿠폰 추가';
      form.reset();
      form.dataset.couponId = '';
    }
    document.getElementById('couponModal').style.display = 'flex';
  };

  window.toggleCouponValue = function() {
    const type = document.getElementById('couponType').value;
    document.getElementById('couponValueLabel').textContent = type === 'percent' ? '할인율 (%)' : '할인액 (₩)';
  };

  window.saveCoupon = async function(event) {
    event.preventDefault();
    try {
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
        ({ error } = await supabase.from('coupons').update(data).eq('id', couponId));
      } else {
        ({ error } = await supabase.from('coupons').insert([data]));
      }
      if (error) {
        window.showToast('쿠폰 저장 실패: ' + error.message, 'error');
      } else {
        window.showToast('쿠폰 저장 완료', 'success');
        document.getElementById('couponModal').style.display = 'none';
        window.loadCoupons();
      }
    } catch (err) {
      console.error('쿠폰 저장 예외:', err);
    }
  };

  window.toggleCoupon = async function(couponId, isActive) {
    try {
      const { error } = await supabase.from('coupons').update({ is_active: isActive }).eq('id', couponId);
      if (error) {
        window.showToast('상태 변경 실패', 'error');
      } else {
        window.showToast('상태 변경 완료', 'success');
        window.loadCoupons();
      }
    } catch (err) {
      console.error('쿠폰 토글 예외:', err);
    }
  };

  window.deleteCoupon = async function(couponId) {
    if (!confirm('이 쿠폰을 삭제하시겠습니까?')) return;
    try {
      const { error } = await supabase.from('coupons').delete().eq('id', couponId);
      if (error) {
        window.showToast('쿠폰 삭제 실패', 'error');
      } else {
        window.showToast('쿠폰 삭제 완료', 'success');
        window.loadCoupons();
      }
    } catch (err) {
      console.error('쿠폰 삭제 예외:', err);
    }
  };

  // ══════════════════════════════════════════════════════
  // 고객조회
  // ══════════════════════════════════════════════════════
  window.loadCustomers = async function() {
    try {
      const search = document.getElementById('customerSearchInput').value.toLowerCase();
      const { data: customers, error } = await supabase.from('customers').select('id, kakao_id, nickname, email, phone, created_at').order('created_at', { ascending: false });
      if (error) {
        console.error('고객 로드 에러:', error);
        return;
      }
      const filtered = customers.filter(c =>
        !search || (c.nickname || '').toLowerCase().includes(search) || (c.kakao_id || '').toLowerCase().includes(search)
      );
      renderCustomerList(filtered);
    } catch (err) {
      console.error('고객 조회 예외:', err);
    }
  };

  function renderCustomerList(customers) {
    const html = customers.length > 0
      ? `<table class="admin-table">
          <thead><tr><th>이름</th><th>카카오ID</th><th>이메일</th><th>연락처</th><th>등록일</th><th>동작</th></tr></thead>
          <tbody>${customers.map(c => `<tr><td>${c.nickname || '-'}</td><td><code style="font-size:0.75rem">${c.kakao_id || ''}</code></td><td>${c.email || '-'}</td><td>${c.phone || '-'}</td><td>${window.formatDate(c.created_at)}</td><td><button class="btn-primary btn-small" onclick="window.openCustomerDetail('${c.id}')">주문이력</button></td></tr>`).join('')}</tbody>
        </table>`
      : '<p>고객이 없습니다.</p>';
    document.getElementById('customersList').innerHTML = html;
  }

  window.openCustomerDetail = async function(customerId) {
    try {
      const { data: customer } = await supabase.from('customers').select('*').eq('id', customerId).single();
      const { data: orders } = await supabase.from('orders').select('order_id, plan_name, amount, status, created_at').eq('customer_id', customerId).order('created_at', { ascending: false });
      const html = `
        <div style="display: grid; gap: 15px;">
          <div><label style="font-weight: 600; display: block; margin-bottom: 8px;">이름</label><input type="text" value="${customer?.nickname || ''}" readonly style="background: var(--bg-main);"></div>
          <div><label style="font-weight: 600; display: block; margin-bottom: 8px;">주문이력</label>${orders && orders.length > 0 ? `<table class="admin-table" style="margin-top: 10px;"><thead><tr><th>주문번호</th><th>서비스</th><th>금액</th><th>상태</th><th>날짜</th></tr></thead><tbody>${orders.map(o => `<tr><td><code style="font-size:0.75rem">${o.order_id}</code></td><td>${o.plan_name}</td><td>₩${(o.amount || 0).toLocaleString('ko-KR')}</td><td><span class="badge ${window.statusBadgeClass(o.status)}">${window.statusLabel(o.status)}</span></td><td>${window.formatDate(o.created_at)}</td></tr>`).join('')}</tbody></table>` : '<p>주문이 없습니다.</p>'}</div>
        </div>
      `;
      document.getElementById('orderDetailBody').innerHTML = html;
      document.getElementById('orderDetailModal').style.display = 'flex';
    } catch (err) {
      console.error('고객 상세 조회 예외:', err);
    }
  };

  // ══════════════════════════════════════════════════════
  // 유틸
  // ══════════════════════════════════════════════════════
  window.formatDate = function(isoString) {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  window.statusLabel = function(status) {
    const labels = { pending: '대기', working: '작업중', done: '완료', refunded: '환불', cancelled: '취소' };
    return labels[status] || status;
  };

  window.statusBadgeClass = function(status) {
    return `badge-${status}`;
  };

  window.showToast = function(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  };

  // ══════════════════════════════════════════════════════
  // 초기화
  // ══════════════════════════════════════════════════════
  document.addEventListener('DOMContentLoaded', () => {
    window.initSupabase();
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const view = item.dataset.view;
        if (view === 'orders') setTimeout(() => window.loadOrders(), 100);
        else if (view === 'coupons') setTimeout(() => window.loadCoupons(), 100);
        else if (view === 'customers') setTimeout(() => window.loadCustomers(), 100);
      });
    });
    document.querySelectorAll('.modal-backdrop').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
      });
    });
  });

})();
