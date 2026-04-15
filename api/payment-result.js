/**
 * NicePay Client 승인 결과 핸들러
 * NicePay가 결제 완료 후 이 URL로 POST 리다이렉트합니다.
 * 결과를 파싱해 메인 페이지로 redirect 합니다.
 */
export default function handler(req, res) {
  // NicePay는 POST로 전송
  const params = req.method === 'POST' ? req.body : req.query;

  const {
    authResultCode,
    authResultMsg,
    orderId,
    amount,
    goodsName,
  } = params || {};

  const success = authResultCode === '0000';
  const base = 'https://www.gameboostpro.co.kr';

  const query = new URLSearchParams({
    payResult: success ? 'ok' : 'fail',
    orderId:   orderId   || '',
    amount:    amount    || '',
    goods:     goodsName || '',
    msg:       success
      ? '결제가 완료되었습니다.'
      : (authResultMsg || '결제에 실패했습니다.'),
  });

  res.redirect(302, `${base}/?${query}`);
}
