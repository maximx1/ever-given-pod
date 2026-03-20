import type { NextApiRequest, NextApiResponse } from 'next';
import { clearSessionCookieHeader, parseSessionCookie, revokeSession } from '../../common/helpers/auth';
import cookie from 'cookie';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const header = req.headers.cookie;
    const parsed = header ? cookie.parse(header) : {};
    const token = parsed.session;
    if (token) revokeSession(token);

    res.setHeader('Set-Cookie', clearSessionCookieHeader());
    return res.status(200).json({ message: 'Logged out' });
}
