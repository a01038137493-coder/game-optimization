/**
 * NicePay 결제 승인 API
 * POST /api/payment-confirm
 *
 * 환경변수 설정 필요 (Vercel Dashboard → Settings → Environment Variables):
 *   NICEPAY_CLIENT_ID     : 나이스페이 클라이언트 키 (S2_...)
 *   NICEPAY_SECRET_KEY    : 나이스페이 시크릿 키
 */

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { authResultCode, authResultMsg, tid, orderId, clientId, amount } = req.body;

  // 인증 실패
  if (authResultCode !== '0000') {
    return res.status(400).json({
      success: false,
      message: authResultMsg || '결제 인증에 실패했습니다.',
    });
  }

  const CLIENT_ID  = process.env.NICEPAY_CLIENT_ID;
  const SECRET_KEY = process.env.NICEPAY_SECRET_KEY;

  if (!CLIENT_ID || !SECRET_KEY) {
    console.error('NicePay 환경변수가 설정되지 않았습니다.');
    return res.status(500).json({ success: false, message: '서버 설정 오류입니다.' });
  }

  // Basic Auth 헤더 생성
  const credentials = Buffer.from(`${CLIENT_ID}:${SECRET_KEY}`).toString('base64');

  try {
    // 나이스페이 결제 승인 요청
    const approvalRes = await fetch(`https://api.nicepay.co.kr/v1/payments/${tid}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${credentials}`,
      },
      body: JSON.stringify({ amount }),
    });

    const data = await approvalRes.json();

    if (data.resultCode === '0000') {
      // 결제 성공 — 필요 시 DB 저장 로직 추가
      return res.status(200).json({
        success: true,
        orderId: data.orderId,
        amount:  data.amount,
        goodsName: data.goodsName,
        message: '결제가 완료되었습니다.',
      });
    } else {
      return res.status(400).json({
        success: false,
        message: data.resultMsg || '결제 승인에 실패했습니다.',
      });
    }
  } catch (err) {
    console.error('NicePay 승인 오류:', err);
    return res.status(500).json({ success: false, message: '결제 처리 중 오류가 발생했습니다.' });
  }
}
