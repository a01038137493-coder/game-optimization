/**
 * PortOne V2 결제 검증 API
 * POST /api/payment-confirm
 *
 * 환경변수: PORTONE_REST_API_SECRET
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { paymentId, amount } = req.body;
  const API_SECRET = process.env.PORTONE_REST_API_SECRET;

  if (!API_SECRET) {
    console.error('PORTONE_REST_API_SECRET 환경변수 없음');
    return res.status(500).json({ success: false, message: '서버 설정 오류입니다.' });
  }
  if (!paymentId) {
    return res.status(400).json({ success: false, message: 'paymentId가 필요합니다.' });
  }

  try {
    const paymentRes = await fetch(
      `https://api.portone.io/payments/${encodeURIComponent(paymentId)}`,
      { headers: { Authorization: `PortOne ${API_SECRET}` } }
    );

    if (!paymentRes.ok) {
      const err = await paymentRes.json().catch(() => ({}));
      console.error('[PortOne] 결제 조회 실패:', err);
      return res.status(400).json({ success: false, message: err.message || '결제 조회 실패' });
    }

    const payment = await paymentRes.json();

    if (payment.status !== 'PAID') {
      return res.status(400).json({ success: false, message: `결제 상태: ${payment.status}` });
    }

    const paidAmount = payment.amount?.total ?? payment.totalAmount;
    if (paidAmount !== amount) {
      console.error(`[PortOne] 금액 불일치: 기대=${amount}, 실제=${paidAmount}`);
      return res.status(400).json({ success: false, message: '결제 금액이 일치하지 않습니다.' });
    }

    return res.status(200).json({
      success:   true,
      orderId:   payment.merchantPaymentId || paymentId,
      amount:    paidAmount,
      orderName: payment.orderName,
      message:   '결제가 완료되었습니다.',
    });
  } catch (err) {
    console.error('[PortOne] 오류:', err);
    return res.status(500).json({ success: false, message: '결제 처리 중 오류가 발생했습니다.' });
  }
}
