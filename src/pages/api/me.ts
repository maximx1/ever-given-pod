import type { NextApiRequest, NextApiResponse } from 'next';
import { parseSessionCookie } from '../../common/helpers/auth';
import { getUserById } from '../../common/data/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const session = parseSessionCookie(req.headers.cookie);
    if (!session?.userId) {
        return res.status(401).json({ message: 'Not authenticated' });
    }

    const user = await getUserById(session.userId);
    if (!user) {
        return res.status(401).json({ message: 'Invalid session' });
    }

    return res.status(200).json({ id: user.id, username: user.username, email: user.email, name: user.name, imageUrl: user.imageUrl });
}
