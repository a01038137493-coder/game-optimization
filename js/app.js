// 햄버거 메뉴
const hamburger = document.getElementById('hamburger');
const mobileNav = document.getElementById('mobileNav');
hamburger.addEventListener('click', () => {
  hamburger.classList.toggle('open');
  mobileNav.classList.toggle('open');
});
function closeMenu() {
  hamburger.classList.remove('open');
  mobileNav.classList.remove('open');
}
// 스크롤 시 모바일 메뉴 닫기
window.addEventListener('scroll', () => { if (mobileNav.classList.contains('open')) closeMenu(); });

// Intersection Observer for fade-up
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      observer.unobserve(e.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));

// Counter animation
function animateCount(el, target, duration = 1800) {
  let start = 0;
  const step = timestamp => {
    if (!start) start = timestamp;
    const progress = Math.min((timestamp - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(eased * target).toLocaleString();
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = target.toLocaleString();
  };
  requestAnimationFrame(step);
}

const statObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      const nums = e.target.querySelectorAll('[data-target]');
      nums.forEach(el => animateCount(el, +el.dataset.target));
      statObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.5 });
const statsEl = document.querySelector('.stats');
if (statsEl) statObserver.observe(statsEl);

// ══ PEEK CAROUSEL 공통 팩토리 ══
function makePeekCarousel({ trackId, outerEl, dotsId, counterId, prevId, nextId, autoMs = 5000 }) {
  const track   = document.getElementById(trackId);
  const outer   = outerEl || track.parentElement;
  const dotsWrap= document.getElementById(dotsId);
  const counter = document.getElementById(counterId);
  const cards   = Array.from(track.children);
  const total   = cards.length;
  const GAP     = 20;
  let cur = 0, autoTimer, dragging = false, startX = 0, diffX = 0;

  // 도트 생성
  cards.forEach((_, i) => {
    const d = document.createElement('button');
    d.className = 'slider-dot' + (i === 0 ? ' active' : '');
    d.addEventListener('click', () => { go(i); resetAuto(); });
    dotsWrap.appendChild(d);
  });

  function getOffset() {
    const cardW = cards[0].offsetWidth;
    return (outer.offsetWidth - cardW) / 2;
  }

  function go(idx) {
    cur = ((idx % total) + total) % total;
    const cardW = cards[0].offsetWidth;
    const offset = getOffset();
    track.style.transition = 'transform .55s cubic-bezier(.4,0,.2,1)';
    track.style.transform  = `translateX(${offset - cur * (cardW + GAP)}px)`;
    cards.forEach((c, i) => c.classList.toggle('active', i === cur));
    dotsWrap.querySelectorAll('.slider-dot').forEach((d, i) => d.classList.toggle('active', i === cur));
    if (counter) counter.textContent = `${cur + 1} / ${total}`;
  }

  // 카드 클릭으로도 이동
  cards.forEach((c, i) => c.addEventListener('click', () => { if (!dragging) { go(i); resetAuto(); } }));

  document.getElementById(prevId).addEventListener('click', () => { go(cur - 1); resetAuto(); });
  document.getElementById(nextId).addEventListener('click', () => { go(cur + 1); resetAuto(); });

  // 스와이프
  function onStart(x) { dragging = false; startX = x; diffX = 0; }
  function onMove(x)  {
    diffX = x - startX;
    if (Math.abs(diffX) > 5) dragging = true;
    if (!dragging) return;
    const cardW = cards[0].offsetWidth;
    const offset = getOffset();
    track.style.transition = 'none';
    track.style.transform  = `translateX(${offset - cur * (cardW + GAP) + diffX}px)`;
  }
  function onEnd() {
    if (Math.abs(diffX) > 60) go(diffX < 0 ? cur + 1 : cur - 1);
    else go(cur);
    resetAuto();
    setTimeout(() => { dragging = false; }, 0);
  }
  track.addEventListener('touchstart', e => onStart(e.touches[0].clientX), { passive: true });
  track.addEventListener('touchmove',  e => onMove(e.touches[0].clientX),  { passive: true });
  track.addEventListener('touchend',   onEnd);
  track.addEventListener('mousedown',  e => onStart(e.clientX));
  track.addEventListener('mousemove',  e => { if (e.buttons === 1) onMove(e.clientX); });
  track.addEventListener('mouseup',    onEnd);
  track.addEventListener('mouseleave', () => { if (dragging) onEnd(); });

  // 자동 로테이션
  function startAuto() { autoTimer = setInterval(() => go(cur + 1), autoMs); }
  function resetAuto()  { clearInterval(autoTimer); startAuto(); }
  outer.addEventListener('mouseenter', () => clearInterval(autoTimer));
  outer.addEventListener('mouseleave', startAuto);

  // 리사이즈 대응
  window.addEventListener('resize', () => go(cur));

  go(0);
  startAuto();
}

// 서비스 슬라이더 초기화
makePeekCarousel({
  trackId: 'serviceTrack',
  outerEl: document.getElementById('svcOuter'),
  dotsId: 'svcDots', counterId: 'svcCounter',
  prevId: 'svcPrev', nextId: 'svcNext',
  autoMs: 5000
});

// 게임 캐러셀 초기화
makePeekCarousel({
  trackId: 'gameTrack',
  outerEl: document.getElementById('gameOuter'),
  dotsId: 'gameDots', counterId: 'gameCounter',
  prevId: 'gamePrev', nextId: 'gameNext',
  autoMs: 4000
});

// ── FAQ 토글 ──
function toggleFaq(btn) {
  const item = btn.parentElement;
  const ans  = item.querySelector('.faq-a');
  const isOpen = btn.classList.contains('open');
  // 모두 닫기
  document.querySelectorAll('.faq-q.open').forEach(q => {
    q.classList.remove('open');
    q.parentElement.querySelector('.faq-a').classList.remove('open');
  });
  if (!isOpen) {
    btn.classList.add('open');
    ans.classList.add('open');
  }
}

// ── 남은 자리 슬롯바 ──
(function() {
  const slots = 13; const total = 20;
  const bar   = document.getElementById('slotBar');
  const label = document.getElementById('slotsLeft');
  if (!bar) return;
  const pct = ((total - slots) / total * 100).toFixed(0);
  // 페이지 로드 후 약간 딜레이 주어 애니메이션 보이게
  setTimeout(() => { bar.style.width = pct + '%'; }, 400);
  if (label) label.textContent = slots;
})();

// 카카오 플로팅 버튼 - 스크롤 시 등장
const kakaoFloat = document.getElementById('kakaoFloat');
window.addEventListener('scroll', () => {
  if (window.scrollY > 200) {
    kakaoFloat.classList.add('show');
  } else {
    kakaoFloat.classList.remove('show');
  }
});


// FPS counter flicker animation
const fpsEl = document.getElementById('fps-counter');
setInterval(() => {
  const base = 240;
  const jitter = Math.floor(Math.random() * 12) - 4;
  fpsEl.textContent = base + jitter;
}, 1200);

// ══════════════════════════════════════
// KAKAO LOGIN
// ★ 카카오 개발자 콘솔(developers.kakao.com)에서 앱 생성 후
//   JavaScript 키를 아래에 입력하세요.
// ══════════════════════════════════════
const KAKAO_APP_KEY  = '941344d67c71122caf7d6a9480fccd54';
const KAKAO_REST_KEY = '314a5f05b1392f959e9c731e1788875a';
// ★ 테스트 완료 후 false 로 변경
const TEST_MODE = true;

(function initKakao() {
  if (window.Kakao && !Kakao.isInitialized()) Kakao.init(KAKAO_APP_KEY);

  const p = new URLSearchParams(location.search);

  // 카카오 로그인 완료 후 유저 정보 수신
  const encoded = p.get('kakaoUser');
  if (encoded) {
    try {
      const user = JSON.parse(atob(decodeURIComponent(encoded)));
      localStorage.setItem('kakaoUser', JSON.stringify(user));
      updateLoginUI(user);
      showToast('✅ ' + user.nickname + '님, 카카오 로그인 완료!');
    } catch(e) { console.error(e); }
    history.replaceState({}, '', location.pathname);
    return;
  }

  // 카카오 로그인 에러
  if (p.get('kakaoError')) {
    showToast('카카오 로그인에 실패했습니다.', 'error');
    history.replaceState({}, '', location.pathname);
    return;
  }

  // 저장된 유저 복원
  const saved = localStorage.getItem('kakaoUser');
  if (saved) updateLoginUI(JSON.parse(saved));

  // TEST_MODE: 상단 배너 표시 및 클릭 핸들러
  if (TEST_MODE) {
    const banner = document.getElementById('testModeBanner');
    if (banner) {
      banner.style.display = 'block';
      banner.addEventListener('click', () => {
        if (currentTestAction === 'login') {
          testModeLogin();
          currentTestAction = 'pay';
          banner.textContent = '🔧 테스트 모드 | 결제 완료 처리 클릭';
        } else {
          adminTestPay();
          currentTestAction = 'login';
          banner.textContent = '🔧 테스트 모드 | 로그인 / 결제 완료 처리 클릭';
        }
      });
    }
  }
})();

// TEST_MODE 상태 관리
let currentTestAction = 'login';
})();

function testModeLogin() {
  const mockUser = {
    id: 'test_001',
    nickname: '테스트유저',
    profileImage: '',
    email: 'test@gameboost.kr',
    phone: '010-1234-5678',
  };
  localStorage.setItem('kakaoUser', JSON.stringify(mockUser));
  updateLoginUI(mockUser);
  showToast('✅ [테스트] 카카오 로그인 완료!');
}

function kakaoLogin() {
  const redirectUri = location.origin + '/api/kakao-callback';
  location.href = `https://kauth.kakao.com/oauth/authorize?client_id=${KAKAO_APP_KEY}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=talk_message`;
}

function kakaoLogout() {
  localStorage.removeItem('kakaoUser');
  if (window.Kakao && Kakao.Auth.getAccessToken()) {
    Kakao.Auth.logout(() => updateLoginUI(null));
  } else {
    updateLoginUI(null);
  }
  showToast('로그아웃 되었습니다.');
}

function updateLoginUI(user) {
  const loginBtn  = document.getElementById('navKakaoLoginBtn');
  const profile   = document.getElementById('navProfile');
  const profileImg= document.getElementById('navProfileImg');
  const profileName=document.getElementById('navProfileName');
  const ddName    = document.getElementById('ddName');
  const ddEmail   = document.getElementById('ddEmail');

  // 폼 요소
  const banner    = document.getElementById('formKakaoBanner');
  const loggedIn  = document.getElementById('formLoggedIn');
  const liImg     = document.getElementById('formLiImg');
  const liName    = document.getElementById('formLiName');

  setPayLock(!user);

  if (user) {
    // NAV: 로그인 버튼 숨기고 프로필 보이기
    if (loginBtn) loginBtn.style.display = 'none';
    if (profile)  profile.classList.add('visible');

    // 프로필 이미지
    const imgHtml = user.profileImage
      ? `<img src="${user.profileImage}" alt="프로필" />`
      : user.nickname.charAt(0);
    if (profileImg)  profileImg.innerHTML = imgHtml;
    if (profileName) profileName.textContent = user.nickname;
    if (ddName)      ddName.textContent  = user.nickname;
    if (ddEmail)     ddEmail.textContent = user.email || '이메일 미제공';

    // 폼: 배너 숨기고 로그인 표시
    if (banner)   banner.style.display   = 'none';
    if (loggedIn) loggedIn.classList.add('visible');
    if (liImg)    liImg.innerHTML = imgHtml;
    if (liName)   liName.textContent = user.nickname;

    // 폼 자동 채우기 (항상 덮어씀)
    const nameInput    = document.getElementById('fi-name');
    const contactInput = document.getElementById('fi-contact');
    if (nameInput)    nameInput.value    = user.nickname || '';
    if (contactInput) contactInput.value = user.phone    || user.email || '';
  } else {
    // 로그아웃 상태
    if (loginBtn) loginBtn.style.display = '';
    if (profile)  profile.classList.remove('visible');
    if (banner)   banner.style.display   = '';
    if (loggedIn) loggedIn.classList.remove('visible');
  }
}

// ══════════════════════════════════════
// NICEPAY 결제
// ══════════════════════════════════════
const NICEPAY_CLIENT_ID = 'R2_55ad2b13ccc5462d8d10b6324c708864';

let _couponDiscount = 0;
let _couponCode = '';

const PLANS = {
  lite:     { label:'Lite 포맷',        name:'Lite 포맷 서비스',         price:55000, desc:'가볍고 빠른 체감의 윈도우 포맷. 불필요한 요소 없이 깔끔하게 설치합니다.', features:['윈도우 클린 설치','드라이버 기본 세팅','불필요 앱 제거','부팅 속도 개선'] },
  optimize: { label:'Windows 최적화',   name:'Windows 최적화 서비스',    price:55000, desc:'자체 개발 프로그램으로 윈도우 셋팅을 최적화합니다. 포맷 없이 진행 가능.', features:['자체 개발 툴 적용','키보드 레지스트리 설정','불필요 서비스·파일 제거','잔렉·스터터링 제거','게임별 맞춤 세팅'] },
  bundle:   { label:'포맷 + 최적화',    name:'포맷 + 최적화 서비스',     price:89000, desc:'클린 포맷 후 자체 프로그램으로 최적화까지. 가장 확실한 성능 향상.', features:['Lite 포맷 전체 포함','Windows 최적화 전체 포함','자체 개발 툴 심층 적용','게임·업무 환경 최적화','사후관리 1회 포함'] },
  dual:     { label:'듀얼부팅',          name:'듀얼부팅 설치 서비스',     price:99000, desc:'게임 공간과 업무 공간을 완전히 분리. 부팅 시 용도에 맞는 윈도우를 선택.', features:['게임 전용 윈도우 구성','업무 전용 윈도우 구성','각 공간 독립 최적화','부팅 선택 메뉴 세팅','사후관리 1회 포함'] },
};

let _plan = null, _orderId = null;

function genOrderId() {
  return 'GB' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2,4).toUpperCase();
}

function setStep(n) {
  [1,2,3].forEach(i => {
    const el = document.getElementById('si'+i);
    el.classList.remove('active','done');
    if (i < n)  el.classList.add('done');
    if (i === n) el.classList.add('active');
  });
}

function openPayModal(planKey) {
  const plan = PLANS[planKey];
  if (!plan) return;
  _plan    = plan;
  _orderId = genOrderId();

  // 쿠폰 초기화
  _couponDiscount = 0;
  const couponInput = document.getElementById('fi-coupon'); if (couponInput) { couponInput.value = ''; couponInput.disabled = false; }
  const couponBtn = document.getElementById('couponApplyBtn'); if (couponBtn) couponBtn.disabled = false;
  document.getElementById('pmPriceRow')?.classList.remove('coupon-applied');
  const pmBadge = document.getElementById('pmDiscountBadge'); if (pmBadge) pmBadge.style.display = 'none';
  const pmMsg = document.getElementById('pmCouponMsg'); if (pmMsg) { pmMsg.textContent = ''; pmMsg.className = 'pm-coupon-msg'; }

  // 플랜 요약 채우기
  document.getElementById('pmPlanTag').textContent   = plan.label;
  document.getElementById('pmPlanName').textContent  = plan.name;
  document.getElementById('pmPlanPrice').textContent = '₩' + plan.price.toLocaleString();
  const origEl = document.getElementById('pmOriginalPrice');
  origEl.textContent = '₩' + plan.price.toLocaleString();
  origEl.style.display = '';
  document.getElementById('pmPlanDesc').textContent  = plan.desc;
  document.getElementById('pmFeatures').innerHTML    = plan.features.map(f=>`<li>${f}</li>`).join('');

  // 폼 초기화
  ['fi-name','fi-contact','fi-memo'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  document.querySelectorAll('#gameDropdownMenu input[type=checkbox]').forEach(c => c.checked = false);
  const etc = document.getElementById('fi-game-etc'); if (etc) { etc.style.display='none'; etc.value=''; }
  document.getElementById('gameDropdown')?.classList.remove('open');
  onGameChange();
  ['fg-name','fg-contact','fg-game'].forEach(id => document.getElementById(id).classList.remove('error'));

  // 로그인 상태 반영 + 결제 버튼 잠금
  const saved = localStorage.getItem('kakaoUser');
  updateLoginUI(saved ? JSON.parse(saved) : null);
  setPayLock(!saved);
  const btn = document.getElementById('payBtn');
  btn.disabled = false;
  btn.textContent = '카드로 결제하기 →';

  // 폼 화면
  document.getElementById('payStepForm').style.display = '';
  document.getElementById('payStepComplete').style.display = 'none';
  setStep(1);

  document.getElementById('payModalBackdrop').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closePayModal() {
  document.getElementById('payModalBackdrop').classList.remove('open');
  document.body.style.overflow = '';
  _plan = null; _orderId = null;
}

document.getElementById('payModalBackdrop').addEventListener('click', function(e) {
  if (e.target === this) closePayModal();
});

function setPayLock(locked) {
  const btn       = document.getElementById('payBtn');
  const adminBtn  = document.getElementById('adminTestBtn');
  const fields    = ['fi-name','fi-contact','fi-memo'];
  if (!btn) return;
  if (locked) {
    btn.disabled = true;
    btn.textContent = '카카오 로그인 후 결제 가능합니다';
    btn.style.opacity = '.4';
    btn.style.cursor  = 'not-allowed';
    fields.forEach(id => { const el = document.getElementById(id); if(el) el.disabled = true; });
    document.querySelectorAll('#gameDropdownMenu input').forEach(c => c.disabled = true);
    const gdd = document.getElementById('gameDropdown'); if (gdd) gdd.dataset.disabled = '1';
    if (adminBtn) adminBtn.style.display = 'none';
  } else {
    btn.disabled = false;
    btn.textContent = '카드로 결제하기 →';
    btn.style.opacity = '';
    btn.style.cursor  = '';
    fields.forEach(id => { const el = document.getElementById(id); if(el) el.disabled = false; });
    document.querySelectorAll('#gameDropdownMenu input').forEach(c => c.disabled = false);
    const gdd2 = document.getElementById('gameDropdown'); if (gdd2) gdd2.dataset.disabled = '0';
    // 테스트 모드일 때만 어드민 버튼 표시
    if (adminBtn) adminBtn.style.display = TEST_MODE ? '' : 'none';
  }
}

function adminTestPay() {
  // plan이 없으면 lite으로 기본값 사용
  const plan = _plan || PLANS.lite;
  const finalAmt = plan.price - (_couponDiscount || 0);

  const info = {
    planName: plan.name,
    planLabel: plan.label,
    amount:   finalAmt,
    name:     document.getElementById('fi-name')?.value    || '테스트유저',
    contact:  document.getElementById('fi-contact')?.value || '010-1234-5678',
    game:     getSelectedGames().join(', ') || '테스트게임',
    memo:     document.getElementById('fi-memo')?.value || '',
  };

  console.log('[TEST] 테스트 결제 시뮬레이션:', info);

  // 테스트 주문 ID 생성
  const testOrderId = 'TEST-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

  try {
    renderComplete(true, info, testOrderId, finalAmt);
  } catch(e) {
    console.error('[TEST] 테스트 결제 중 에러:', e);
    showToast('테스트 결제 처리 중 오류가 발생했습니다.', 'error');
  }
}

function getSelectedGames() {
  const checked = Array.from(document.querySelectorAll('#gameDropdownMenu input[type=checkbox]:checked')).map(c => c.value);
  return checked.map(v => {
    if (v === '기타') {
      const t = document.getElementById('fi-game-etc')?.value.trim();
      return t ? '기타(' + t + ')' : '기타';
    }
    return v;
  });
}

function validateForm() {
  let ok = true;
  const checks = [
    { id:'fg-name',    val:()=>document.getElementById('fi-name').value.trim() },
    { id:'fg-contact', val:()=>document.getElementById('fi-contact').value.trim() },
    { id:'fg-game',    val:()=>getSelectedGames().length > 0 ? 'ok' : '' },
  ];
  checks.forEach(c => {
    const grp = document.getElementById(c.id);
    if (!c.val()) { grp.classList.add('error'); ok = false; }
    else            grp.classList.remove('error');
  });
  return ok;
}

function triggerNicePay() {
  if (!_plan) return;
  if (!validateForm()) return;

  const buyerName    = document.getElementById('fi-name').value.trim();
  const buyerContact = document.getElementById('fi-contact').value.trim();
  const game         = getSelectedGames().join(', ');
  const memo         = document.getElementById('fi-memo').value.trim();

  // 결제 중 상태 저장 (redirect 후 복원)
  sessionStorage.setItem('payInfo', JSON.stringify({
    name: buyerName, contact: buyerContact, game, memo,
    planLabel: _plan.label, planName: _plan.name, amount: _plan.price,
    orderId: _orderId,
  }));

  const btn = document.getElementById('payBtn');
  btn.disabled = true;
  btn.textContent = '결제창 여는 중...';
  setStep(2);

  AUTHNICE.requestPay({
    clientId:  NICEPAY_CLIENT_ID,
    method:    'card',
    orderId:   _orderId,
    amount:    _plan.price - _couponDiscount,
    goodsName: _plan.name,
    buyerName,
    buyerTel:  buyerContact.replace(/\D/g,'').length >= 10 ? buyerContact : '',
    returnUrl: window.location.origin + '/api/payment-result',
    fnError: function(result) {
      btn.disabled = false;
      btn.textContent = '카드로 결제하기 →';
      setStep(1);
      // 에러 토스트
      showToast('❌ ' + (result.errorMsg || '결제 중 오류가 발생했습니다.'), 'error');
    },
  });
}

// ── 카카오 자동 알림 ──
function kakaoNotify(orderInfo) {
  const stored = localStorage.getItem('kakaoUser');
  if (!stored) return;
  const user = JSON.parse(stored);
  if (!user.accessToken) return;
  fetch('/api/kakao-notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken: user.accessToken, orderInfo }),
  }).catch(() => {});
}

// ── 결제 완료 화면 렌더 ──
function renderComplete(success, info, orderId, amount) {
  setStep(3);
  document.getElementById('payStepForm').style.display = 'none';
  document.getElementById('payStepComplete').style.display = '';

  const el = document.getElementById('payCompleteInner');
  if (success && info) {
    kakaoNotify({ planName: info.planName, amount, orderId, games: info.game, name: info.name });
    // 결제내역 저장
    const hist = JSON.parse(localStorage.getItem('payHistory') || '[]');
    hist.unshift({ orderId, planName: info.planName, amount, game: info.game, name: info.name, date: new Date().toLocaleDateString('ko-KR') });
    localStorage.setItem('payHistory', JSON.stringify(hist.slice(0, 30)));

    // DB 저장
    const kakaoUser = JSON.parse(localStorage.getItem('kakaoUser') || 'null');
    fetch('/api/save-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId,
        planKey:        info.planLabel || '',
        planName:       info.planName,
        amount,
        couponCode:     _couponCode || null,
        couponDiscount: _couponDiscount || 0,
        buyerName:      info.name || null,
        buyerContact:   info.contact || null,
        games:          info.game || null,
        memo:           info.memo || null,
        kakaoId:        kakaoUser?.id || null,
      }),
    }).catch((err) => {
      console.error('주문 저장 오류:', err);
    });
  }
  if (success) {
    el.innerHTML = `
      <div class="pay-complete-icon success">✅</div>
      <h2>결제 완료!</h2>
      <p class="pc-sub">결제가 성공적으로 완료되었습니다.<br/>아래 주문 정보를 카카오 채널로 보내주시면<br/>빠르게 작업 일정을 안내드립니다.</p>
      <div class="pay-complete-card">
        <div class="pc-row"><span>서비스</span><span>${info?.planName || ''}</span></div>
        <div class="pc-row"><span>금액</span><span>₩${(amount||0).toLocaleString()}</span></div>
        ${info?.name    ? `<div class="pc-row"><span>이름</span><span>${info.name}</span></div>` : ''}
        ${info?.contact ? `<div class="pc-row"><span>연락처</span><span>${info.contact}</span></div>` : ''}
        ${info?.game    ? `<div class="pc-row"><span>게임</span><span>${info.game}</span></div>` : ''}
        <div class="pc-row"><span>주문번호</span><span class="pc-order-id">${orderId || ''}</span></div>
      </div>
      <div class="pay-complete-next">
        <strong>📌 다음 단계</strong>
        <p><strong style="color:var(--primary)">10분 이내</strong> 카카오 채널로 문자가 발송됩니다. 순번에 맞춰 작업을 진행하며, 평균 <strong style="color:var(--text)">30~90분</strong> 내 완료됩니다.</p>
      </div>
      <div class="pay-complete-btns">
        <button class="btn-kakao-link" onclick="window.open('https://pf.kakao.com','_blank')">카카오 채널로 문의하기</button>
        <button class="btn-close-link" onclick="closePayModal()">닫기</button>
      </div>`;
  } else {
    el.innerHTML = `
      <div class="pay-complete-icon fail">❌</div>
      <h2>결제 실패</h2>
      <p class="pc-sub">결제가 완료되지 않았습니다.<br/>다시 시도하거나 카카오 채널로 문의해주세요.</p>
      <div class="pay-complete-btns" style="justify-content:center">
        <button class="btn-pay" style="max-width:200px" onclick="retryPayment()">다시 시도</button>
        <button class="btn-close-link" onclick="closePayModal()">닫기</button>
      </div>`;
  }
}

function showPayHistory() {
  const hist = JSON.parse(localStorage.getItem('payHistory') || '[]');
  const body = document.getElementById('payHistBody');
  if (!hist.length) {
    body.innerHTML = '<div class="pay-hist-empty">결제내역이 없습니다.</div>';
  } else {
    body.innerHTML = hist.map(h => `
      <div class="pay-hist-item">
        <div class="pay-hist-top">
          <span class="pay-hist-plan">${h.planName || ''}</span>
          <span class="pay-hist-amount">₩${Number(h.amount||0).toLocaleString('ko-KR')}</span>
        </div>
        <div class="pay-hist-meta">
          ${h.name ? `이름: ${h.name}` : ''}${h.game ? ` &nbsp;·&nbsp; 게임: ${h.game}` : ''}
          ${h.date ? `<br/>${h.date}` : ''}
        </div>
        <div class="pay-hist-order">주문번호: ${h.orderId || ''}</div>
      </div>`).join('');
  }
  document.getElementById('payHistBackdrop').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closePayHistory() {
  document.getElementById('payHistBackdrop').classList.remove('open');
  document.body.style.overflow = '';
}

async function applyCoupon() {
  const code = (document.getElementById('fi-coupon').value || '').trim().toUpperCase();
  const msg  = document.getElementById('pmCouponMsg');

  if (!code) {
    msg.textContent = '쿠폰 코드를 입력해주세요.';
    msg.className = 'pm-coupon-msg err';
    return;
  }

  if (_couponDiscount > 0) {
    msg.textContent = '이미 쿠폰이 적용되었습니다.';
    msg.className = 'pm-coupon-msg err';
    return;
  }

  msg.textContent = '확인 중...';
  msg.className = 'pm-coupon-msg';

  try {
    const res = await fetch(`/api/coupons?code=${encodeURIComponent(code)}`);
    const result = await res.json();

    if (!result.valid) {
      msg.textContent = result.message || '유효하지 않은 쿠폰입니다.';
      msg.className = 'pm-coupon-msg err';
      return;
    }

    const coupon = result.coupon;
    const orig   = _plan.price;
    const discount = coupon.type === 'percent'
      ? Math.floor(orig * coupon.value / 100)
      : Math.min(coupon.value, orig);
    const final = orig - discount;
    _couponDiscount = discount;
    _couponCode = code;

    // 원가 취소선 활성화
    const origEl = document.getElementById('pmOriginalPrice');
    origEl.textContent = '₩' + orig.toLocaleString();
    origEl.style.display = '';
    document.getElementById('pmPriceRow')?.classList.add('coupon-applied');
    const badge = document.getElementById('pmDiscountBadge');
    badge.textContent = '-' + coupon.label;
    badge.style.display = '';

    // 룰렛 숫자 애니메이션
    roulettePrice(orig, final);

    msg.textContent = '✅ ' + coupon.label + ' 적용!';
    msg.className = 'pm-coupon-msg ok';
    document.getElementById('couponApplyBtn').disabled = true;
    document.getElementById('fi-coupon').disabled = true;
  } catch (err) {
    console.error('쿠폰 검증 오류:', err);
    msg.textContent = '쿠폰 확인 중 오류가 발생했습니다.';
    msg.className = 'pm-coupon-msg err';
  }
}

function roulettePrice(from, to) {
  const el = document.getElementById('pmPlanPrice');
  const duration = 1400;
  const start = performance.now();
  function tick(now) {
    const t = Math.min((now - start) / duration, 1);
    // easeOutExpo — 처음엔 빠르게, 끝에서 스르르
    const ease = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    const cur  = Math.round(from - (from - to) * ease);
    el.textContent = '₩' + cur.toLocaleString();
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function toggleGameDropdown() {
  const dd = document.getElementById('gameDropdown');
  if (dd.dataset.disabled === '1') return;
  dd.classList.toggle('open');
}

function onGameChange(isEtc) {
  const etc = document.getElementById('fi-game-etc');
  if (isEtc !== undefined) {
    const cb = document.querySelector('#gameDropdownMenu input[value="기타"]');
    etc.style.display = cb?.checked ? '' : 'none';
    if (!cb?.checked) etc.value = '';
  }
  // 태그 업데이트
  const tags = document.getElementById('gameSelectedTags');
  const sel = getSelectedGames();
  tags.innerHTML = sel.map(g => `<span class="game-tag">${g}<button type="button" onclick="removeGameTag(this,'${g.replace(/'/g,"\\'")}')">✕</button></span>`).join('');
  // 트리거 라벨
  const lbl = document.getElementById('gameDropdownLabel');
  lbl.textContent = sel.length ? sel.join(', ') : '게임을 선택하세요';
  lbl.style.color = sel.length ? 'var(--text)' : '';
}

function removeGameTag(btn, val) {
  // val이 기타(xxx) 형태일 수 있으므로 기타 처리
  const rawVal = val.startsWith('기타(') ? '기타' : val;
  const cb = document.querySelector(`#gameDropdownMenu input[value="${rawVal}"]`);
  if (cb) cb.checked = false;
  if (rawVal === '기타') {
    const etc = document.getElementById('fi-game-etc');
    if (etc) { etc.style.display = 'none'; etc.value = ''; }
  }
  onGameChange();
}

// 드롭다운 외부 클릭 시 닫기
document.addEventListener('click', e => {
  if (!e.target.closest('#gameDropdown')) {
    document.getElementById('gameDropdown')?.classList.remove('open');
  }
});

function retryPayment() {
  const info = JSON.parse(sessionStorage.getItem('payInfo') || '{}');
  if (!info.planLabel) { closePayModal(); return; }
  // 플랜 키 역조회
  const key = Object.keys(PLANS).find(k => PLANS[k].label === info.planLabel);
  if (key) openPayModal(key);
}

// ── 결제 완료 후 redirect 파라미터 처리 ──
(function checkPaymentResult() {
  const p = new URLSearchParams(location.search);
  if (!p.get('payResult')) return;

  const success  = p.get('payResult') === 'ok';
  const orderId  = p.get('orderId') || '';
  const amount   = parseInt(p.get('amount') || '0', 10);
  const info     = JSON.parse(sessionStorage.getItem('payInfo') || 'null');

  if (success) sessionStorage.removeItem('payInfo');

  document.getElementById('payModalBackdrop').classList.add('open');
  document.body.style.overflow = 'hidden';
  renderComplete(success, info, orderId, amount);
  history.replaceState({}, '', location.pathname);
})();

// 토스트
function showToast(msg, type='') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'show' + (type ? ' '+type : '');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.className = '', 3500);
}

// ══ CUSTOM CURSOR ══
(function() {
  // 데스크탑 마우스 환경이 아니면 스킵
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const dot  = document.getElementById('cursor-dot');
  const ring = document.getElementById('cursor-ring');
  const glow = document.getElementById('mouse-glow');
  if (!dot || !ring) return;

  // 초기값: 화면 밖 (CSS에 opacity 없음 → 항상 보임, 그러나 화면 밖에 있어서 안 보임)
  let mx = -200, my = -200, rx = -200, ry = -200;

  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    dot.style.left = mx + 'px';
    dot.style.top  = my + 'px';
    if (glow) { glow.style.left = mx + 'px'; glow.style.top = my + 'px'; }
  });

  // ring: rAF로 부드러운 트레일
  (function animateRing() {
    rx += (mx - rx) * 0.14;
    ry += (my - ry) * 0.14;
    ring.style.left = rx + 'px';
    ring.style.top  = ry + 'px';
    requestAnimationFrame(animateRing);
  })();

  // 인터랙티브 요소 위에서 링 확대
  document.addEventListener('mouseover', e => {
    if (e.target.closest('a, button, .service-card, .game-card, .price-card, .faq-q, .slider-arrow, .kakao-btn')) {
      document.body.classList.add('cursor-hover');
    } else {
      document.body.classList.remove('cursor-hover');
    }
  });
  document.addEventListener('mousedown', () => document.body.classList.add('cursor-click'));
  document.addEventListener('mouseup',   () => document.body.classList.remove('cursor-click'));
})();

// ══ NAV ACTIVE SECTION HIGHLIGHT ══
(function() {
  const sections = ['services','how','features','pricing','reviews'];
  const navLinks = {};
  sections.forEach(id => {
    const a = document.querySelector(`.nav-links a[href="#${id}"]`);
    if (a) navLinks[id] = a;
  });

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      const id = e.target.id;
      if (!navLinks[id]) return;
      if (e.isIntersecting) {
        // remove all active, then set current
        Object.values(navLinks).forEach(a => a.classList.remove('active'));
        navLinks[id].classList.add('active');
      }
    });
  }, {
    rootMargin: '-40% 0px -40% 0px', // 화면 중앙 20% 대역에서 판단
    threshold: 0
  });

  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el) sectionObserver.observe(el);
  });
})();
