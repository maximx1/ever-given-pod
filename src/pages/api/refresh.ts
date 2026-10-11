import type { NextApiRequest, NextApiResponse } from 'next';
import { parse } from 'cookie';
import { signSession, buildSessionCookieHeader, clearSessionCookieHeader, verifyRawSession, isSessionRevoked } from '../../common/helpers/auth';
import { getUserById } from '../../common/data/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const header = req.headers.cookie;
  const parsed = header ? parse(header) : {};
  const token = parsed.session;

  if (!token || isSessionRevoked(token)) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  const session = verifyRawSession(token);
  if (!session) {
    res.setHeader('Set-Cookie', clearSessionCookieHeader());
    return res.status(401).json({ message: 'Invalid or expired session' });
  }

  // Do not keep renewing a session whose user no longer exists
  if (!(await getUserById(session.userId))) {
    res.setHeader('Set-Cookie', clearSessionCookieHeader());
    return res.status(401).json({ message: 'Invalid session' });
  }

  const newToken = signSession({ userId: session.userId, username: session.username, email: session.email, name: session.name });
  res.setHeader('Set-Cookie', buildSessionCookieHeader(newToken));

  return res.status(200).json({ user: session });
}
