/**
 * 카카오 OAuth 콜백 핸들러
 * 카카오 로그인 후 이 URL로 리다이렉트됩니다.
 * 환경변수: KAKAO_REST_API_KEY (Vercel Dashboard에 설정)
 */
export default async function handler(req, res) {
  const { code, error } = req.query;
  const BASE = 'https://game-optimization.vercel.app';
  const REDIRECT_URI = `${BASE}/api/kakao-callback`;

  if (error || !code) {
    return res.redirect(`${BASE}/?kakaoError=${error || 'no_code'}`);
  }

  const REST_KEY = process.env.KAKAO_REST_API_KEY;
  const CLIENT_SECRET = process.env.KAKAO_CLIENT_SECRET;
  if (!REST_KEY || !CLIENT_SECRET) {
    return res.redirect(`${BASE}/?kakaoError=server_config`);
  }

  try {
    // 1. 인가 코드 → 액세스 토큰
    const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
      body: new URLSearchParams({
        grant_type:   'authorization_code',
        client_id:    REST_KEY,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        code,
      }),
    });
    const tokenData = await tokenRes.json();

    console.log('[Kakao Token Response]', {
      status: tokenRes.status,
      hasAccessToken: !!tokenData.access_token,
      error: tokenData.error,
      errorDescription: tokenData.error_description,
    });

    if (!tokenData.access_token) {
      console.error('[Token Fail Details]', tokenData);
      return res.redirect(`${BASE}/?kakaoError=token_fail`);
    }

    // 2. 유저 정보 조회
    const userRes = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userData = await userRes.json();

    const profile = userData.kakao_account?.profile || {};
    const user = {
      id:           userData.id,
      nickname:     profile.nickname        || '카카오 유저',
      profileImage: profile.profile_image_url || '',
      email:        userData.kakao_account?.email || '',
      accessToken:  tokenData.access_token,
    };

    // 3. 메인 페이지로 리다이렉트 (유저 정보 base64 인코딩)
    const encoded = Buffer.from(JSON.stringify(user)).toString('base64');
    return res.redirect(`${BASE}/?kakaoUser=${encodeURIComponent(encoded)}`);

  } catch (err) {
    console.error('Kakao callback error:', err);
    return res.redirect(`${BASE}/?kakaoError=server_error`);
  }
}
