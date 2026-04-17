/**
 * 관리자 로그아웃
 * POST /api/admin-logout
 * httpOnly 쿠키를 만료시킴
 */
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://www.gameboostpro.co.kr');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  res.setHeader('Set-Cookie',
    'adminToken=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'
  );
  return res.status(200).json({ success: true });
}
