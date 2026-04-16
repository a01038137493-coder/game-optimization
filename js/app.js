window.onerror = function(msg, src, line, col, err) {
  console.error('[JS ERROR]', msg, 'at', src, line + ':' + col, err);
};

// 햄버거 메뉴
const hamburger = document.getElementById('hamburger');
const mobileNav = document.getElementById('mobileNav');
if (hamburger && mobileNav) {
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    mobileNav.classList.toggle('open');
  });
  window.addEventListener('scroll', () => { if (mobileNav.classList.contains('open')) closeMenu(); });
}
function closeMenu() {
  if (hamburger) hamburger.classList.remove('open');
  if (mobileNav) mobileNav.classList.remove('open');
}

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

  // 리사이즈 대응
  window.addEventListener('resize', () => go(cur));

  go(0);
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
if (fpsEl) setInterval(() => {
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
const TEST_MODE = false;

(function initKakao() {
  if (window.Kakao && !Kakao.isInitialized()) Kakao.init(KAKAO_APP_KEY);

  const p = new URLSearchParams(location.search);

  // 카카오 로그인 완료 후 유저 정보 수신
  const encoded = p.get('kakaoUser');
  if (encoded) {
    try {
      const user = JSON.parse(atob(decodeURIComponent(encoded)));

      // Supabase에서 고객 정보 조회
      fetch(`/api/get-customer?kakaoId=${user.id}`)
        .then(r => r.json())
        .then(data => {
          if (data.customer) {
            // Supabase에서 조회된 정보 병합
            if (data.customer.nickname) user.nickname = data.customer.nickname;
            if (data.customer.phone) user.phone = data.customer.phone;
            if (data.customer.email) user.email = data.customer.email;
          }

          localStorage.setItem('kakaoUser', JSON.stringify(user));

          // nickname이 없으면 회원정보 입력 모달 띄우기
          if (!user.nickname) {
            const backdrop = document.getElementById('signupModalBackdrop');
            backdrop.classList.add('open');
            document.getElementById('signupNameInput').value = user.nickname || '';
            document.getElementById('signupPhoneInput').value = user.phone || '';
            document.getElementById('signupEmailInput').value = user.email || '';
          } else {
            localStorage.setItem('signupCompleted', 'true');
            updateLoginUI(user);
            showToast('✅ ' + user.nickname + '님, 카카오 로그인 완료!');
          }
        })
        .catch(err => {
          console.error('[get-customer] 조회 실패:', err);
          // 오류나도 localStorage의 기존 정보로 진행
          const saved = JSON.parse(localStorage.getItem('kakaoUser') || '{}');
          if (saved.nickname) user.nickname = saved.nickname;
          if (saved.phone) user.phone = saved.phone;
          localStorage.setItem('kakaoUser', JSON.stringify(user));
          if (!user.nickname) {
            const backdrop = document.getElementById('signupModalBackdrop');
            backdrop.classList.add('open');
            document.getElementById('signupNameInput').value = user.nickname || '';
            document.getElementById('signupPhoneInput').value = user.phone || '';
            document.getElementById('signupEmailInput').value = user.email || '';
          } else {
            updateLoginUI(user);
            showToast('✅ ' + user.nickname + '님, 카카오 로그인 완료!');
          }
        });
    } catch(e) { console.error(e); }
    history.replaceState({}, '', location.pathname);
    return;
  }

  // 카카오 로그인 에러
  const kakaoError = p.get('kakaoError');
  if (kakaoError) {
    const errorMap = {
      'no_code': '인가 코드 없음',
      'token_fail': '토큰 교환 실패',
      'user_info_fail': '유저 정보 조회 실패',
      'server_config': '서버 설정 오류 (환경변수)',
      'server_error': '서버 오류',
    };
    const desc = errorMap[kakaoError] || kakaoError;
    let msg = `카카오 로그인 실패\n[${kakaoError}] ${desc}`;

    const detail = p.get('detail');
    if (detail) {
      try {
        const detailObj = JSON.parse(decodeURIComponent(detail));
        if (detailObj.error) {
          msg += `\nKakao API Error: ${detailObj.error}`;
          if (detailObj.errorDescription) msg += `\n${detailObj.errorDescription}`;
        }
      } catch(e) {}
    }

    console.error('[Kakao Error]', kakaoError, detail);
    showToast('🔴 ' + msg, 'error');
    history.replaceState({}, '', location.pathname);
    return;
  }

  // 저장된 유저 복원
  const saved = localStorage.getItem('kakaoUser');
  if (saved) {
    const user = JSON.parse(saved);

    // localStorage 데이터로 즉시 UI 업데이트 (깜빡임 방지)
    if (user.nickname) {
      updateLoginUI(user);
    }

    // Supabase에서 최신 정보 조회 후 갱신
    fetch(`/api/get-customer?kakaoId=${user.id}`)
      .then(r => r.json())
      .then(data => {
        if (data.customer) {
          if (data.customer.nickname) user.nickname = data.customer.nickname;
          if (data.customer.phone) user.phone = data.customer.phone;
          if (data.customer.email) user.email = data.customer.email;
        }

        if (!user.nickname) {
          const backdrop = document.getElementById('signupModalBackdrop');
          backdrop.classList.add('open');
          document.getElementById('signupNameInput').value = user.nickname || '';
          document.getElementById('signupPhoneInput').value = user.phone || '';
          document.getElementById('signupEmailInput').value = user.email || '';
        } else {
          localStorage.setItem('signupCompleted', 'true');
          updateLoginUI(user);
        }
      })
      .catch(err => {
        console.error('[get-customer] 조회 실패:', err);
        if (!user.nickname) {
          const backdrop = document.getElementById('signupModalBackdrop');
          backdrop.classList.add('open');
          document.getElementById('signupNameInput').value = user.nickname || '';
          document.getElementById('signupPhoneInput').value = user.phone || '';
          document.getElementById('signupEmailInput').value = user.email || '';
        } else {
          updateLoginUI(user);
        }
      });
  }

})();

function openAuthModal(tab = 'login') {
  const backdrop = document.getElementById('authModalBackdrop');
  if (backdrop) { backdrop.classList.add('open'); document.body.style.overflow = 'hidden'; }
  switchAuthTab(tab);
}

function closeAuthModal() {
  const backdrop = document.getElementById('authModalBackdrop');
  if (backdrop) { backdrop.classList.remove('open'); document.body.style.overflow = ''; }
}

function switchAuthTab(tab) {
  const panels = { login: 'authPanelLogin', signup: 'authPanelSignup', find: 'authPanelFind' };
  Object.values(panels).forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
  const active = document.getElementById(panels[tab]);
  if (active) active.style.display = '';

  const tabLogin  = document.getElementById('authTabLogin');
  const tabSignup = document.getElementById('authTabSignup');
  [tabLogin, tabSignup].forEach(btn => {
    if (!btn) return;
    btn.style.color = 'var(--text-muted)';
    btn.style.borderBottom = '2px solid transparent';
    btn.style.fontWeight = '600';
  });
  if (tab === 'login' && tabLogin) {
    tabLogin.style.color = 'var(--primary)'; tabLogin.style.borderBottom = '2px solid var(--primary)'; tabLogin.style.fontWeight = '700';
  } else if (tab === 'signup' && tabSignup) {
    tabSignup.style.color = 'var(--primary)'; tabSignup.style.borderBottom = '2px solid var(--primary)'; tabSignup.style.fontWeight = '700';
  }
}

function switchFindTab(tab) {
  const isPw = tab === 'pw';
  document.getElementById('findPanelId').style.display = isPw ? 'none' : '';
  document.getElementById('findPanelPw').style.display = isPw ? '' : 'none';
  const btnId = document.getElementById('findTabId');
  const btnPw = document.getElementById('findTabPw');
  btnId.style.background = isPw ? 'transparent' : 'var(--primary)';
  btnId.style.color = isPw ? 'var(--text-muted)' : '#000';
  btnId.style.borderColor = isPw ? 'var(--border)' : 'var(--primary)';
  btnPw.style.background = isPw ? 'var(--primary)' : 'transparent';
  btnPw.style.color = isPw ? '#000' : 'var(--text-muted)';
  btnPw.style.borderColor = isPw ? 'var(--primary)' : 'var(--border)';
}

function findEmailByPhone() {
  const phone = document.getElementById('findPhone')?.value.trim();
  const errEl = document.getElementById('findIdError');
  const resEl = document.getElementById('findIdResult');
  errEl.style.display = 'none'; resEl.style.display = 'none';
  if (!phone) { errEl.textContent = '전화번호를 입력해주세요.'; errEl.style.display = ''; return; }

  fetch('/api/find-email', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  })
  .then(r => r.json())
  .then(data => {
    if (!data.success) { errEl.textContent = data.error; errEl.style.display = ''; return; }
    resEl.textContent = '가입된 이메일: ' + data.email;
    resEl.style.display = '';
  })
  .catch(() => { errEl.textContent = '서버 오류가 발생했습니다.'; errEl.style.display = ''; });
}

function sendPasswordReset() {
  const email = document.getElementById('findPwEmail')?.value.trim();
  const errEl = document.getElementById('findPwError');
  const resEl = document.getElementById('findPwResult');
  errEl.style.display = 'none'; resEl.style.display = 'none';
  if (!email) { errEl.textContent = '이메일을 입력해주세요.'; errEl.style.display = ''; return; }

  fetch('/api/reset-password', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  .then(r => r.json())
  .then(data => {
    if (!data.success) { errEl.textContent = data.error; errEl.style.display = ''; return; }
    resEl.textContent = '재설정 링크를 이메일로 발송했습니다. 메일함을 확인해주세요.';
    resEl.style.display = '';
  })
  .catch(() => { errEl.textContent = '서버 오류가 발생했습니다.'; errEl.style.display = ''; });
}

function emailLogin() {
  const email    = document.getElementById('loginEmail')?.value.trim();
  const password = document.getElementById('loginPassword')?.value;
  const errEl    = document.getElementById('loginError');
  if (!email || !password) { errEl.textContent = '이메일과 비밀번호를 입력해주세요.'; errEl.style.display = ''; return; }
  errEl.style.display = 'none';

  const btn = document.querySelector('#authPanelLogin button[onclick="emailLogin()"]');
  const origText = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.innerHTML = '<span style="display:inline-block;width:16px;height:16px;border:2px solid #000;border-top-color:transparent;border-radius:50%;animation:spin .7s linear infinite;vertical-align:middle;"></span>'; }

  fetch('/api/auth-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  .then(r => r.json())
  .then(data => {
    if (btn) { btn.disabled = false; btn.textContent = origText; }
    if (!data.success) { errEl.textContent = data.error || '로그인 실패'; errEl.style.display = ''; return; }
    localStorage.setItem('kakaoUser', JSON.stringify({ ...data.user, accessToken: data.token }));
    localStorage.setItem('signupCompleted', 'true');
    updateLoginUI(data.user);
    closeAuthModal();
    showToast('환영합니다, ' + data.user.nickname + '님! 🎮');
  })
  .catch(() => { if (btn) { btn.disabled = false; btn.textContent = origText; } errEl.textContent = '서버 오류가 발생했습니다.'; errEl.style.display = ''; });
}

function emailSignup() {
  const name     = document.getElementById('signupName2')?.value.trim();
  const email    = document.getElementById('signupEmail2')?.value.trim();
  const phone    = document.getElementById('signupPhone2')?.value.trim();
  const password = document.getElementById('signupPassword2')?.value;
  const terms    = document.getElementById('signupTerms2')?.checked;
  const errEl    = document.getElementById('signupError2');

  if (!name || !email || !phone || !password) { errEl.textContent = '이름, 이메일, 전화번호, 비밀번호는 필수입니다.'; errEl.style.display = ''; return; }
  if (!/^01[0-9]\d{8,9}$/.test(phone)) { errEl.textContent = '전화번호를 다시 확인해주세요. (예: 01012345678)'; errEl.style.display = ''; return; }
  if (password.length < 6) { errEl.textContent = '비밀번호는 6자 이상이어야 합니다.'; errEl.style.display = ''; return; }
  if (!terms) { errEl.textContent = '이용약관에 동의해주세요.'; errEl.style.display = ''; return; }
  errEl.style.display = 'none';

  const btn = document.querySelector('#authPanelSignup button[onclick="emailSignup()"]');
  const origText = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.innerHTML = '<span style="display:inline-block;width:16px;height:16px;border:2px solid #000;border-top-color:transparent;border-radius:50%;animation:spin .7s linear infinite;vertical-align:middle;"></span>'; }

  fetch('/api/auth-signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, phone, password }),
  })
  .then(r => r.json())
  .then(data => {
    if (btn) { btn.disabled = false; btn.textContent = origText; }
    if (!data.success) { errEl.textContent = data.error || '회원가입 실패'; errEl.style.display = ''; return; }
    localStorage.setItem('kakaoUser', JSON.stringify({ ...data.user, accessToken: data.token }));
    localStorage.setItem('signupCompleted', 'true');
    updateLoginUI(data.user);
    closeAuthModal();
    showToast('환영합니다, ' + data.user.nickname + '님! 🎮');
  })
  .catch(() => { if (btn) { btn.disabled = false; btn.textContent = origText; } errEl.textContent = '서버 오류가 발생했습니다.'; errEl.style.display = ''; });
}

function openTermsModal() {
  document.getElementById('termsModalBackdrop').classList.add('open');
}
function closeTermsModal() {
  document.getElementById('termsModalBackdrop').classList.remove('open');
}
function agreeTermsAndClose() {
  const cb = document.getElementById('signupTerms2');
  if (cb) cb.checked = true;
  closeTermsModal();
}

function kakaoLogin() {
  closeAuthModal();
  const redirectUri = 'https://www.gameboostpro.co.kr/api/kakao-callback';
  location.href = `https://kauth.kakao.com/oauth/authorize?client_id=${KAKAO_APP_KEY}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;
}

function closeSignupModal() {
  const backdrop = document.getElementById('signupModalBackdrop');
  backdrop.classList.remove('open');
  document.getElementById('signupNameError').textContent = '';
  document.getElementById('signupPhoneError').textContent = '';
  document.getElementById('signupEmailError').textContent = '';
  document.getElementById('signupTermsError').textContent = '';
  document.getElementById('signupTermsCheckbox').checked = false;
}

function saveSignupInfo() {
  const nameInput = document.getElementById('signupNameInput');
  const phoneInput = document.getElementById('signupPhoneInput');
  const emailInput = document.getElementById('signupEmailInput');
  const termsCheckbox = document.getElementById('signupTermsCheckbox');
  let valid = true;

  document.getElementById('signupNameError').textContent = '';
  document.getElementById('signupPhoneError').textContent = '';
  document.getElementById('signupEmailError').textContent = '';
  document.getElementById('signupTermsError').textContent = '';

  if (!nameInput.value.trim()) {
    document.getElementById('signupNameError').textContent = '이름을 입력하세요';
    valid = false;
  }
  if (!phoneInput.value.trim()) {
    document.getElementById('signupPhoneError').textContent = '전화번호를 입력하세요';
    valid = false;
  }
  if (emailInput.value.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailInput.value.trim())) {
      document.getElementById('signupEmailError').textContent = '올바른 이메일 형식을 입력하세요';
      valid = false;
    }
  }
  if (!termsCheckbox.checked) {
    document.getElementById('signupTermsError').textContent = '이용약관에 동의해야 합니다';
    valid = false;
  }

  if (!valid) return;

  const kakaoUser = JSON.parse(localStorage.getItem('kakaoUser'));
  if (kakaoUser) {
    kakaoUser.nickname = nameInput.value;
    kakaoUser.phone = phoneInput.value;
    kakaoUser.email = emailInput.value;
    localStorage.setItem('kakaoUser', JSON.stringify(kakaoUser));
    localStorage.setItem('signupCompleted', 'true');

    // Supabase에 저장 (선택)
    fetch('/api/save-customer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kakaoId: kakaoUser.id,
        nickname: nameInput.value,
        phone: phoneInput.value,
        email: kakaoUser.email || '',
      })
    }).catch(err => console.error('Save error:', err));

    updateLoginUI(kakaoUser);
    closeSignupModal();
    showToast('환영합니다, ' + nameInput.value + '님! 🎮');
  }
}

function kakaoLogout() {
  localStorage.removeItem('kakaoUser');
  localStorage.removeItem('signupCompleted');
  if (window.Kakao && Kakao.Auth.getAccessToken()) {
    Kakao.Auth.logout(() => location.reload());
  } else {
    location.reload();
  }
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

function toggleProfileDropdown(event) {
  event.stopPropagation();
  const profile = document.getElementById('navProfile');
  profile.classList.toggle('hover-open');
}

// 다른 곳 클릭 시 드롭다운 닫기
document.addEventListener('click', function(e) {
  const profile = document.getElementById('navProfile');
  if (profile && !profile.contains(e.target)) {
    profile.classList.remove('hover-open');
  }
});

// ══════════════════════════════════════
// PORTONE (아임포트) 결제
// ══════════════════════════════════════
const PORTONE_STORE_ID    = 'store-f1358e77-1ff2-4c57-a9a8-0515a6eee134';
const PORTONE_CHANNEL_KEY = 'channel-key-4ab026fa-618a-415e-a278-e43d151a6707';

let _couponDiscount = 0;
let _couponCode = '';

const PLANS = {
  test:     { label:'테스트 결제',       name:'테스트 결제 상품',             price:1000,  desc:'결제 테스트용 상품입니다.', features:['결제 플로우 테스트','주문 DB 저장 확인'] },
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
  if (location.pathname === '/payment-complete') history.replaceState({}, '', '/');
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
    // 테스트 결제 완료 버튼 표시 (항상 활성화)
    if (adminBtn) adminBtn.style.display = '';
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
    contact:  document.getElementById('fi-contact')?.value || '01012345678',
    game:     getSelectedGames().join(', ') || '테스트게임',
    memo:     document.getElementById('fi-memo')?.value || '',
  };

  console.log('[TEST] 테스트 결제 시뮬레이션:', info);

  // 테스트 주문 ID 생성
  const testOrderId = 'TEST-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

  renderComplete(true, info, testOrderId, finalAmt);
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

async function triggerPortOne() {
  if (!_plan) return;
  if (!validateForm()) return;

  const buyerName    = document.getElementById('fi-name').value.trim();
  const buyerContact = document.getElementById('fi-contact').value.trim();
  const game         = getSelectedGames().join(', ');
  const memo         = document.getElementById('fi-memo').value.trim();
  const finalAmount  = _plan.price - _couponDiscount;

  const btn = document.getElementById('payBtn');
  btn.disabled = true;
  btn.textContent = '결제창 여는 중...';
  setStep(2);

  const payInfo = {
    name: buyerName, contact: buyerContact, game, memo,
    planLabel: _plan.label, planName: _plan.name, amount: _plan.price,
    orderId: _orderId,
  };
  sessionStorage.setItem('payInfo', JSON.stringify(payInfo));

  try {
    const response = await PortOne.requestPayment({
      storeId:     PORTONE_STORE_ID,
      channelKey:  PORTONE_CHANNEL_KEY,
      paymentId:   _orderId,
      orderName:   _plan.name,
      totalAmount: finalAmount,
      currency:    'CURRENCY_KRW',
      payMethod:   'CARD',
      customer: {
        fullName:    buyerName,
        phoneNumber: buyerContact.replace(/\D/g, ''),
      },
      redirectUrl: window.location.origin + '/api/payment-result',
    });

    // 결제 실패/취소
    if (response && response.code !== undefined) {
      btn.disabled = false;
      btn.textContent = '카드로 결제하기 →';
      setStep(1);
      showToast('❌ ' + (response.message || '결제가 취소되었습니다.'));
      return;
    }

    // 서버 측 결제 검증
    btn.textContent = '결제 확인 중...';
    const confirmRes = await fetch('/api/payment-confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentId: _orderId, amount: finalAmount }),
    });
    const confirmData = await confirmRes.json();

    if (confirmData.success) {
      sessionStorage.removeItem('payInfo');
      renderComplete(true, payInfo, _orderId, finalAmount);
    } else {
      renderComplete(false, null, _orderId, finalAmount);
    }
  } catch (err) {
    console.error('[PortOne] 결제 오류:', err);
    btn.disabled = false;
    btn.textContent = '카드로 결제하기 →';
    setStep(1);
    showToast('❌ 결제 처리 중 오류가 발생했습니다.');
  }
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
function renderComplete(success, info, orderId, amount, isReplay = false) {
  console.log('[RENDER_COMPLETE] 시작:', { success, info, orderId, amount });
  if (success && !isReplay) history.pushState({}, '', '/payment-complete');
  setStep(3);
  const payStepForm = document.getElementById('payStepForm');
  const payStepComplete = document.getElementById('payStepComplete');
  console.log('[RENDER_COMPLETE] 엘리먼트:', { payStepForm, payStepComplete });
  if (payStepForm) payStepForm.style.display = 'none';
  if (payStepComplete) payStepComplete.style.display = '';

  const el = document.getElementById('payCompleteInner');
  if (success && info) {
    kakaoNotify({ planName: info.planName, amount, orderId, games: info.game, name: info.name });

    // Supabase에만 저장 (localStorage 제거)
    const kakaoUser = JSON.parse(localStorage.getItem('kakaoUser') || 'null');
    console.log('[RENDER_COMPLETE] Supabase에 주문 저장 중:', { orderId, planName: info.planName });
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
    })
    .then(res => {
      if (!res.ok) {
        return res.json().then(errData => {
          throw new Error(`HTTP ${res.status}: ${errData.error || ''} ${errData.details || ''}`);
        }).catch(() => { throw new Error(`HTTP ${res.status}`); });
      }
      return res.json();
    })
    .then(data => console.log('✅ 주문 저장 성공:', data))
    .catch(err => console.error('❌ 주문 저장 오류:', err.message));
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
        <hr style="border:none;border-top:1px solid rgba(255,255,255,.1);margin:8px 0;">
        <p style="margin:0;line-height:1.6;font-size:.9rem;">
          카카오톡에서 10분 이내 결제 완료 메시지를 받으실 수 있습니다.<br><br>
          ⚠️ <strong>윈도우 재설치</strong>
          <hr style="border:none;border-top:1px solid rgba(255,255,255,.3);margin:6px 0;">
          윈도우 재설치 서비스를 신청하신 고객님께서는 작업 시작 전 중요한 파일 (사진, 문서, 즐겨찾기 등)을 외장하드 또는 클라우드에 미리 백업해 주시길 바랍니다.
        </p>
      </div>

      <div class="pay-complete-next" style="background:rgba(168,85,247,0.08);border:1px solid rgba(168,85,247,0.2);">
        <strong style="color:#a855f7;">📋 환불정책</strong>
        <hr style="border:none;border-top:1px solid rgba(255,255,255,.1);margin:8px 0;">
        <p style="margin:0;line-height:1.6;font-size:.9rem;color:var(--text-muted);">
          🕐 3시간 이내: 전액 환불 가능<br/>
          📊 작업 진행 중: 진행률에 따라 환불<br/>
          ✔️ 작업 완료 후: 환불 불가능
        </p>
      </div>

      <div class="pay-complete-btns">
        <button class="btn-kakao-link" onclick="window.open('http://pf.kakao.com/_xkmvxlX/chat','_blank')">📱 카카오채널로 문의하기</button>
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

// 결제내역 폴링 인터벌 ID
let payHistoryPollInterval = null;

// 주문 상태 라벨 변환
function getStatusLabel(status) {
  switch(status) {
    case 'pending':   return '진행중';
    case 'working':   return '작업중';
    case 'done':      return '완료';
    case 'completed': return '완료';
    case 'cancelled': return '취소';
    case 'refunded':  return '환불';
    default: return status || '진행중';
  }
}

function showPayHistory() {
  try {
  console.log('[PAY_HISTORY] 결제내역 표시 시작');
  const backdrop = document.getElementById('payHistBackdrop');
  const body = document.getElementById('payHistBody');

  if (!backdrop || !body) {
    console.error('[PAY_HISTORY] 모달 요소를 찾을 수 없습니다', { backdrop, body });
    alert('결제내역 모달 요소를 찾을 수 없습니다. 페이지를 새로고침 해주세요.');
    return;
  }
  backdrop.style.display = 'flex';

  // 로딩 표시
  body.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px 0;gap:16px;">
      <div style="width:36px;height:36px;border:3px solid rgba(255,255,255,.1);border-top-color:var(--primary);border-radius:50%;animation:spin .8s linear infinite;"></div>
      <div style="color:rgba(255,255,255,.4);font-size:.9rem;">결제내역 불러오는 중...</div>
    </div>`;

  // 즉시 조회 함수
  const loadPayHistory = () => {
    fetch('/api/admin-orders', { cache: 'no-store' })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        const orders = data.orders || [];
        console.log('[PAY_HISTORY] 📊 조회:', orders.length + '개');

        if (orders.length === 0) {
          body.innerHTML = '<div class="pay-hist-empty">결제내역이 없습니다.</div>';
        } else {
          updatePayHistoryDisplay(orders);
        }
      })
      .catch(err => {
        console.error('[PAY_HISTORY] ❌ 조회 실패:', err);
        body.innerHTML = '<div class="pay-hist-empty">결제내역 로드 실패</div>';
      });
  };

  // 즉시 로드
  loadPayHistory();

  // 3초마다 자동 새로고침
  if (payHistoryPollInterval) clearInterval(payHistoryPollInterval);
  console.log('[PAY_HISTORY] 🔄 폴링 시작 (3초마다)');
  payHistoryPollInterval = setInterval(loadPayHistory, 3000);

  backdrop.classList.add('open');
  document.body.style.overflow = 'hidden';
  } catch(e) {
    console.error('[PAY_HISTORY] 오류:', e);
    alert('결제내역 오류: ' + e.message);
  }
}

let _payHistOrders = [];

function updatePayHistoryDisplay(orders) {
  _payHistOrders = orders;
  const body = document.getElementById('payHistBody');
  body.innerHTML = orders.map((o, idx) => {
    const statusLabel = getStatusLabel(o.status || 'pending');
    const statusColor = o.status === 'done' || o.status === 'completed' ? 'var(--primary)' :
                       o.status === 'cancelled' ? '#ff6464' :
                       o.status === 'working' ? '#ff9800' : '#ffa500';

    const date = new Date(o.created_at);
    const dateStr = date.toLocaleDateString('ko-KR');
    const games = o.games ? o.games.split(',').join(', ') : '';
    const buyerName = o.buyer_name || '';

    return `
      <div class="pay-hist-item" style="cursor:pointer;" onclick="replayFromHistory(${idx})">
        <div class="pay-hist-top">
          <span class="pay-hist-plan">${o.plan_name || ''}</span>
          <span class="pay-hist-amount">₩${Number(o.amount||0).toLocaleString('ko-KR')}</span>
        </div>
        <div class="pay-hist-meta">
          ${buyerName ? `이름: ${buyerName}` : ''}${games ? ` &nbsp;·&nbsp; 게임: ${games}` : ''}
          ${dateStr ? `<br/>${dateStr}` : ''}
        </div>
        <div class="pay-hist-order">
          주문번호: ${o.order_id || ''}
          <span style="margin-left:8px;color:${statusColor};font-weight:600;font-size:.8rem;">${statusLabel}</span>
        </div>
      </div>`;
  }).join('');
}

function replayFromHistory(idx) {
  const o = _payHistOrders[idx];
  if (!o) { console.error('[REPLAY] 주문 없음:', idx); return; }

  closePayHistory();

  const info = {
    planName: o.plan_name || o.planName || '',
    planLabel: o.plan_name || o.planLabel || '',
    amount: o.amount,
    name: o.buyer_name || o.name || '',
    contact: o.buyer_contact || o.buyer_phone || o.contact || '',
    game: o.games || o.game || '',
    memo: o.memo || '',
    orderId: o.order_id || o.orderId || '',
  };

  const payBackdrop = document.getElementById('payModalBackdrop');
  if (payBackdrop) {
    payBackdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  renderComplete(true, info, info.orderId, info.amount, true);
}

function refreshPayHistoryStatus() {
  const hist = JSON.parse(localStorage.getItem('payHistory') || '[]');
  if (!hist.length) {
    console.log('[PAY_HISTORY] 로컬 결제내역 없음');
    return;
  }

  console.log('[PAY_HISTORY] 📡 상태 동기화 중... (로컬: ' + hist.length + '개)');

  // admin-orders API에서 최신 상태 조회
  fetch('/api/admin-orders')
    .then(res => {
      console.log('[PAY_HISTORY] API 응답 상태:', res.status);
      return res.json();
    })
    .then(data => {
      const orders = data.orders || [];
      console.log('[PAY_HISTORY] 📊 데이터 비교:');
      console.log('[PAY_HISTORY]   - Supabase 주문: ' + orders.length + '개');
      console.log('[PAY_HISTORY]   - localStorage 주문: ' + hist.length + '개');

      // 각 주문별 상세 로그
      hist.forEach((h, idx) => {
        const localOrderId = String(h.orderId).trim();
        const order = orders.find(o => String(o.order_id).trim() === localOrderId);

        if (order) {
          if (h.status !== order.status) {
            console.log(`[PAY_HISTORY] ✅ [${idx}] 상태 변경: "${localOrderId}" | "${h.status}" → "${order.status}"`);
          } else {
            console.log(`[PAY_HISTORY] 🔄 [${idx}] 상태 동일: "${localOrderId}" | "${h.status}"`);
          }
        } else {
          console.warn(`[PAY_HISTORY] ⚠️ [${idx}] 없음: "${localOrderId}"`);
        }
      });

      // localStorage의 모든 orderId가 Supabase에 있는지 확인
      const updated = hist.map(h => {
        const localOrderId = String(h.orderId).trim();
        const order = orders.find(o => String(o.order_id).trim() === localOrderId);

        if (!order) {
          return null; // Supabase에 없으면 제거
        }

        return { ...h, status: order.status };
      }).filter(item => item !== null);

      if (updated.length !== hist.length) {
        console.warn(`[PAY_HISTORY] ⚠️ 개수 불일치: ${hist.length}개 → ${updated.length}개`);
      }

      localStorage.setItem('payHistory', JSON.stringify(updated));
      updatePayHistoryDisplay(updated);
      console.log('[PAY_HISTORY] ✅ 동기화 완료');
    })
    .catch(err => console.error('[PAY_HISTORY] ❌ API 호출 실패:', err));
}

// 결제내역 재생 (결제완료창 다시 표시)
function replayPaymentResult(historyIndex) {
  const hist = JSON.parse(localStorage.getItem('payHistory') || '[]');
  const h = hist[historyIndex];
  console.log('[REPLAY] 결제내역:', h, '인덱스:', historyIndex);
  if (!h) {
    console.error('[REPLAY] 결제내역이 없습니다');
    return;
  }

  // 결제내역 모달 닫기
  closePayHistory();

  // 결제 정보 복원
  const info = {
    planName: h.planName,
    planLabel: h.planLabel,
    amount: h.amount,
    name: h.name,
    contact: h.contact,
    game: h.game,
    memo: h.memo,
    orderId: h.orderId,
  };

  console.log('[REPLAY] renderComplete 호출:', info);

  // 결제 모달 열기
  const payBackdrop = document.getElementById('payModalBackdrop');
  if (payBackdrop) {
    payBackdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  // 결제완료 페이지 표시
  renderComplete(true, info, h.orderId, h.amount, true);
}

function closePayHistory() {
  const backdrop = document.getElementById('payHistBackdrop');
  backdrop.classList.remove('open');
  backdrop.style.display = '';
  document.body.style.overflow = '';
  // 폴링 중단
  if (payHistoryPollInterval) {
    clearInterval(payHistoryPollInterval);
    payHistoryPollInterval = null;
  }
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

  // 게임 선택 후 드롭다운 자동 닫기
  if (sel.length > 0) {
    setTimeout(() => {
      document.getElementById('gameDropdown')?.classList.remove('open');
    }, 100);
  }
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


// ── Canvas Effect Helper ──
function initCanvas(id) {
  const canvas = document.getElementById(id);
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  let visible = false;
  function resize() {
    const r = canvas.parentElement.getBoundingClientRect();
    canvas.width = r.width; canvas.height = r.height;
  }
  resize();
  window.addEventListener('resize', resize);
  // 화면에 보일 때만 애니메이션 실행
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 });
  io.observe(canvas.parentElement);
  return { canvas, ctx, get W() { return canvas.width; }, get H() { return canvas.height; }, get visible() { return visible; } };
}

// ── Services Section Particles ──
(function() {
  const canvas = document.getElementById('servicesParticles');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const COLORS = ['#00f0ff','#a855f7','#22d3ee','#818cf8','#ffffff'];
  const PARTICLE_COUNT = 60;
  let particles = [];
  let W, H;

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    W = canvas.width  = rect.width;
    H = canvas.height = rect.height;
  }

  function rand(min, max) { return Math.random() * (max - min) + min; }

  function createParticle() {
    return {
      x: rand(0, W),
      y: rand(0, H),
      r: rand(1, 3),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      alpha: rand(0.1, 0.6),
      vx: rand(-0.3, 0.3),
      vy: rand(-0.6, -0.15),
      pulse: rand(0, Math.PI * 2),
      pulseSpeed: rand(0.01, 0.03)
    };
  }

  function init() {
    resize();
    particles = Array.from({ length: PARTICLE_COUNT }, createParticle);
  }

  let svcLast = 0;
  function draw(now) {
    requestAnimationFrame(draw);
    if (now - svcLast < 32) return;
    svcLast = now;
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      p.pulse += p.pulseSpeed;
      const a = p.alpha * (0.6 + 0.4 * Math.sin(p.pulse));
      ctx.save();
      ctx.globalAlpha = a;
      ctx.shadowBlur = 8;
      ctx.shadowColor = p.color;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      p.x += p.vx;
      p.y += p.vy;

      if (p.y < -10 || p.x < -10 || p.x > W + 10) {
        Object.assign(p, createParticle(), { y: H + 5, x: rand(0, W) });
      }
    });
  }

  window.addEventListener('resize', () => { resize(); });
  init();
  requestAnimationFrame(draw);
})();

// ── HOW: 흐르는 네트워크 연결선 ──
(function() {
  const c = initCanvas('howCanvas');
  if (!c) return;
  const { ctx } = c;
  const nodes = [];
  const NODE_COUNT = 40;
  function rand(a, b) { return Math.random() * (b - a) + a; }
  function makeNode() {
    return { x: rand(0, c.W), y: rand(0, c.H), vx: rand(-0.3, 0.3), vy: rand(-0.2, 0.2) };
  }
  for (let i = 0; i < NODE_COUNT; i++) nodes.push(makeNode());
  let _howLast = 0;
  function draw(now) {
    requestAnimationFrame(draw);
    if (!c.visible || now - _howLast < 32) return;
    _howLast = now;
    ctx.clearRect(0, 0, c.W, c.H);
    nodes.forEach(n => {
      n.x += n.vx; n.y += n.vy;
      if (n.x < 0 || n.x > c.W) n.vx *= -1;
      if (n.y < 0 || n.y > c.H) n.vy *= -1;
    });
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 130) {
          ctx.save();
          ctx.globalAlpha = (1 - dist / 130) * 0.25;
          ctx.strokeStyle = '#00f0ff';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.stroke();
          ctx.restore();
        }
      }
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#00f0ff';
      ctx.shadowBlur = 6;
      ctx.shadowColor = '#00f0ff';
      ctx.beginPath();
      ctx.arc(nodes[i].x, nodes[i].y, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    requestAnimationFrame(draw);
  }
  draw();
})();

// ── FEATURES: 떠다니는 육각형 ──
(function() {
  const c = initCanvas('featuresCanvas');
  if (!c) return;
  const { ctx } = c;
  const hexagons = [];
  function rand(a, b) { return Math.random() * (b - a) + a; }
  for (let i = 0; i < 18; i++) {
    hexagons.push({
      x: rand(0, c.W), y: rand(0, c.H),
      r: rand(20, 55), vx: rand(-0.2, 0.2), vy: rand(-0.15, 0.15),
      rot: rand(0, Math.PI), rotV: rand(-0.003, 0.003),
      alpha: rand(0.03, 0.1),
      color: Math.random() > 0.5 ? '#a855f7' : '#00f0ff'
    });
  }
  function hexPath(x, y, r, rot) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = rot + (Math.PI / 3) * i;
      i === 0 ? ctx.moveTo(x + r * Math.cos(a), y + r * Math.sin(a))
              : ctx.lineTo(x + r * Math.cos(a), y + r * Math.sin(a));
    }
    ctx.closePath();
  }
  let _featLast = 0;
  function draw(now) {
    requestAnimationFrame(draw);
    if (!c.visible || now - _featLast < 32) return;
    _featLast = now;
    ctx.clearRect(0, 0, c.W, c.H);
    hexagons.forEach(h => {
      h.x += h.vx; h.y += h.vy; h.rot += h.rotV;
      if (h.x < -h.r) h.x = c.W + h.r;
      if (h.x > c.W + h.r) h.x = -h.r;
      if (h.y < -h.r) h.y = c.H + h.r;
      if (h.y > c.H + h.r) h.y = -h.r;
      ctx.save();
      ctx.globalAlpha = h.alpha;
      ctx.strokeStyle = h.color;
      ctx.lineWidth = 1;
      hexPath(h.x, h.y, h.r, h.rot);
      ctx.stroke();
      ctx.restore();
    });
  }
  requestAnimationFrame(draw);
})();

// ── PRICING: 펄스 링 ──
(function() {
  const c = initCanvas('pricingCanvas');
  if (!c) return;
  const { ctx } = c;
  const rings = [];
  function spawnRing() {
    rings.push({ x: c.W / 2, y: c.H / 2, r: 0, maxR: Math.max(c.W, c.H) * 0.7, alpha: 0.15, speed: 0.7});
  }
  spawnRing();
  setInterval(spawnRing, 8000);
  let _priceLast = 0;
  function draw(now) {
    requestAnimationFrame(draw);
    if (!c.visible || now - _priceLast < 32) return;
    _priceLast = now;
    ctx.clearRect(0, 0, c.W, c.H);
    for (let i = rings.length - 1; i >= 0; i--) {
      const ring = rings[i];
      ring.r += ring.speed;
      ring.alpha = 0.15 * (1 - ring.r / ring.maxR);
      if (ring.r > ring.maxR) { rings.splice(i, 1); continue; }
      ctx.save();
      ctx.globalAlpha = ring.alpha;
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#a855f7';
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
  requestAnimationFrame(draw);
})();


// ── FAQ: 오로라 웨이브 ──
(function() {
  const c = initCanvas('faqCanvas');
  if (!c) return;
  const { ctx } = c;
  let t = 0;
  let _faqLast = 0;
  function draw(now) {
    requestAnimationFrame(draw);
    if (!c.visible || now - _faqLast < 32) return;
    _faqLast = now;
    ctx.clearRect(0, 0, c.W, c.H);
    for (let i = 0; i < 3; i++) {
      const grad = ctx.createLinearGradient(0, 0, c.W, 0);
      grad.addColorStop(0, 'transparent');
      grad.addColorStop(0.3 + i * 0.1, `hsla(${180 + i * 40},80%,60%,0.07)`);
      grad.addColorStop(0.7 - i * 0.1, `hsla(${260 + i * 30},70%,55%,0.06)`);
      grad.addColorStop(1, 'transparent');
      ctx.save();
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, c.H / 2);
      for (let x = 0; x <= c.W; x += 4) {
        const y = c.H / 2
          + Math.sin((x / c.W) * Math.PI * 2 + t * 0.003 + i) * (40 + i * 20)
          + Math.sin((x / c.W) * Math.PI * 4 + t * 0.002) * 20;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(c.W, c.H); ctx.lineTo(0, c.H); ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    t++;
  }
  requestAnimationFrame(draw);
})();

