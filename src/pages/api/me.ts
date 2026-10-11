import type { NextApiRequest, NextApiResponse } from 'next';
import { clearSessionCookieHeader, parseSessionCookie } from '../../common/helpers/auth';
import { getUserById } from '../../common/data/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    // A cookie that no longer works (expired, signed with an old secret, or for a user that is gone)
    // is cleared here; otherwise the middleware keeps bouncing its owner away from /login and /signup
    const session = parseSessionCookie(req.headers.cookie);
    if (!session?.userId) {
        res.setHeader('Set-Cookie', clearSessionCookieHeader());
        return res.status(401).json({ message: 'Not authenticated' });
    }

    const user = await getUserById(session.userId);
    if (!user) {
        res.setHeader('Set-Cookie', clearSessionCookieHeader());
        return res.status(401).json({ message: 'Invalid session' });
    }

    return res.status(200).json({ id: user.id, username: user.username, email: user.email, name: user.name, imageUrl: user.imageUrl });
}
