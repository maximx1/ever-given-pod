import type { NextApiRequest, NextApiResponse } from 'next';
import cookie from 'cookie';
import { parseSessionCookie, signSession, buildSessionCookieHeader, verifyRawSession, isSessionRevoked } from '../../common/helpers/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const header = req.headers.cookie;
  const parsed = header ? cookie.parse(header) : {};
  const token = parsed.session;

  if (!token || isSessionRevoked(token)) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  const session = verifyRawSession(token);
  if (!session) {
    return res.status(401).json({ message: 'Invalid or expired session' });
  }

  const newToken = signSession({ userId: session.userId, email: session.email, name: session.name });
  res.setHeader('Set-Cookie', buildSessionCookieHeader(newToken));

  return res.status(200).json({ user: session });
}
