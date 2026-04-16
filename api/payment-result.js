/**
 * PortOne (iamport) 모바일 결제 결과 핸들러
 * 모바일에서 m_redirect_url로 리다이렉트될 때 처리
 *
 * 성공: ?imp_uid=xxx&merchant_uid=xxx&imp_success=true
 * 실패: ?imp_uid=xxx&merchant_uid=xxx&imp_success=false&error_msg=xxx
 */
export default async function handler(req, res) {
  const params = req.method === 'POST' ? req.body : req.query;
  const { imp_uid, merchant_uid, imp_success, error_msg } = params || {};

  const base = 'https://www.gameboostpro.co.kr';

  // 결제 실패
  if (imp_success !== 'true' || !imp_uid) {
    const query = new URLSearchParams({
      payResult: 'fail',
      msg: error_msg || '결제에 실패했습니다.',
    });
    return res.redirect(302, `${base}/?${query}`);
  }

  // 결제 성공 → 서버 검증
  const IMP_KEY    = process.env.PORTONE_REST_API_KEY;
  const IMP_SECRET = process.env.PORTONE_REST_API_SECRET;

  try {
    // 액세스 토큰 발급
    const tokenRes = await fetch('https://api.iamport.kr/users/getToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imp_key: IMP_KEY, imp_secret: IMP_SECRET }),
    });
    const tokenData = await tokenRes.json();
    const accessToken = tokenData.response?.access_token;

    if (!accessToken) throw new Error('토큰 발급 실패');

    // 결제 정보 조회
    const paymentRes = await fetch(`https://api.iamport.kr/payments/${imp_uid}`, {
      headers: { Authorization: accessToken },
    });
    const paymentData = await paymentRes.json();
    const payment = paymentData.response;

    if (payment && payment.status === 'paid') {
      const query = new URLSearchParams({
        payResult: 'ok',
        orderId:   payment.merchant_uid || merchant_uid || '',
        amount:    String(payment.amount || ''),
        goods:     payment.name || '',
        msg:       '결제가 완료되었습니다.',
      });
      return res.redirect(302, `${base}/?${query}`);
    } else {
      const query = new URLSearchParams({
        payResult: 'fail',
        msg: `결제 상태: ${payment?.status || '알 수 없음'}`,
      });
      return res.redirect(302, `${base}/?${query}`);
    }
  } catch (err) {
    console.error('[PortOne] payment-result 오류:', err);
    const query = new URLSearchParams({ payResult: 'fail', msg: '결제 확인 중 오류가 발생했습니다.' });
    return res.redirect(302, `${base}/?${query}`);
  }
}
