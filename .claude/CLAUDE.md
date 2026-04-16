# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Deployment

Vercel 정적 배포. 빌드 과정 없이 파일 그대로 서빙.

```bash
vercel --prod
```

라우팅: `vercel.json` → `/api/*` 서버리스 함수, `/*` → `index.html` SPA fallback.

## File Structure

```
index.html          HTML 구조만 (~1,060줄)
css/style.css       모든 CSS (~1,562줄)
js/app.js           모든 JS (~828줄)
api/
  kakao-callback.js   GET  /api/kakao-callback  — Kakao OAuth 콜백
  kakao-notify.js     POST /api/kakao-notify    — 결제 후 카카오톡 자동 메시지
  payment-confirm.js  POST /api/payment-confirm — PortOne V2 서버 검증
  payment-result.js   GET  /api/payment-result  — PortOne V2 모바일 리다이렉트 처리
```

**중요**: `index.html`의 onclick/onchange 인라인 핸들러가 `js/app.js`의 전역 `function` 선언을 참조함. 함수를 IIFE나 모듈로 감싸면 안 됨.

## Environment Variables (Vercel Dashboard)

| Variable | Used In |
|---|---|
| `KAKAO_REST_API_KEY` | `api/kakao-callback.js` |
| `PORTONE_REST_API_SECRET` | `api/payment-confirm.js`, `api/payment-result.js` |

## Key Frontend Constants

`js/app.js` 상단 (IIFE보다 반드시 위에 — TDZ 위험):

```js
const KAKAO_APP_KEY  = '...'; // JS SDK key
const KAKAO_REST_KEY = '...'; // REST API key (OAuth URL)
const TEST_MODE = true;       // 운영 전 false로 변경
```

## Payment Flow (PortOne V2)

1. `triggerPortOne()` → `PortOne.requestPayment()` 팝업 호출
2. 팝업 결과 수신 → `POST /api/payment-confirm` 서버 검증
3. `renderComplete()` 결과 표시 + `kakaoNotify()` 카카오톡 자동 발송
4. 쿠폰 적용 시 `_couponDiscount` 만큼 차감된 금액으로 결제
5. 모바일: `redirectUrl=/api/payment-result` → PortOne이 리다이렉트, 서버에서 재검증 후 `/?payResult=ok` 리다이렉트

**Frontend 상수** (`js/app.js`):
- `PORTONE_STORE_ID`: PortOne 스토어 ID
- `PORTONE_CHANNEL_KEY`: PortOne 채널 키 (대시보드 → 결제연동 → 채널관리)

## Kakao Login Flow

1. `kakaoLogin()` → OAuth authorize (scope=talk_message)
2. `/api/kakao-callback` → 토큰 교환 → `/?kakaoUser=<base64>` 리다이렉트
3. `localStorage.kakaoUser`에 저장 (accessToken 포함)

**필수 설정**: 카카오 개발자 콘솔 → 동의항목 → "카카오톡 메시지 전송" 활성화

## Custom Cursor

초록 FPS 십자 에임 (`#cursor-dot` 중심점 + `#cursor-ring` 크로스헤어). CSS pseudo-elements로 가로/세로선 구현, 중앙 gap. 데스크탑에서만 동작 (미디어쿼리).

`@media (hover: hover) and (pointer: fine)` → native cursor 숨김. **CSS class 방식(`body.has-cursor *`) 사용 금지** — click event 깨짐.

## TEST_MODE

- 로그인 버튼 hover → 즉시 mock 로그인 + 프로필 드롭다운 강제 오픈 (`.hover-open` 클래스)
- `adminTestPay()` 버튼으로 결제 완료 시뮬레이션
- 쿠폰 코드: `GAMEBOOST10`(10%), `OPEN5000`(₩5,000), `VIP20`(20%), `FREE10000`(₩10,000)
