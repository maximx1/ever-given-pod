import { NextApiRequest, NextApiResponse } from 'next';
import { parseSessionCookie } from '../../../common/helpers/auth';
import { searchUsers } from '../../../common/data/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const session = parseSessionCookie(req.headers.cookie);
    if (!session?.userId) {
        return res.status(401).json({ message: 'Not authenticated' });
    }

    const q = req.query.q;
    if (!q || typeof q !== 'string' || q.trim().length === 0) {
        return res.status(200).json([]);
    }

    const results = await searchUsers(q.trim(), session.userId);
    return res.status(200).json(results);
}
