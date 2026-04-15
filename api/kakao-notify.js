/**
 * 카카오 결제 완료 자동 알림
 * POST /api/kakao-notify
 * 결제 완료 후 구매자의 카카오톡으로 주문 확인 메시지를 발송합니다.
 *
 * 사전 조건:
 *   - 카카오 개발자 콘솔 → 내 앱 → 카카오 로그인 → 동의항목에 "카카오톡 메시지 전송" 추가
 *   - 로그인 시 scope=talk_message 포함 (OAuth URL에 자동 적용)
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { accessToken, orderInfo } = req.body || {};
  if (!accessToken || !orderInfo) {
    return res.status(400).json({ error: 'Missing accessToken or orderInfo' });
  }

  const { planName, amount, orderId, games, name } = orderInfo;
  const amountStr = Number(amount || 0).toLocaleString('ko-KR');
  const gamesStr  = games || '';

  const templateObject = {
    object_type: 'text',
    text: [
      '✅ GameBoost Pro 결제 완료!',
      '',
      `${name ? name + '님, ' : ''}결제가 완료되었습니다.`,
      '',
      `📦 서비스: ${planName || ''}`,
      `💳 금액: ₩${amountStr}`,
      `🎮 게임: ${gamesStr || '미입력'}`,
      `🔖 주문번호: ${orderId || ''}`,
      '',
      '📌 다음 단계',
      '카카오 채널로 주문번호를 보내주시면',
      '순번에 맞춰 원격 작업 일정을 안내드립니다!',
    ].join('\n'),
    link: {
      web_url:        'https://www.gameboostpro.co.kr',
      mobile_web_url: 'https://www.gameboostpro.co.kr',
    },
  };

  try {
    const r = await fetch('https://kapi.kakao.com/v2/api/talk/memo/send', {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      },
      body: new URLSearchParams({ template_object: JSON.stringify(templateObject) }),
    });

    const data = await r.json();

    // result_code 0 = 성공
    if (data.result_code === 0) {
      return res.status(200).json({ success: true });
    } else {
      console.error('Kakao memo send failed:', data);
      return res.status(200).json({ success: false, reason: data });
    }
  } catch (err) {
    console.error('Kakao notify error:', err);
    return res.status(500).json({ success: false });
  }
}
