import { NextApiRequest, NextApiResponse } from 'next';
import { expandSeason } from '../../../common/data/db';
import { parseSessionCookie } from '../../../common/helpers/auth';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'PATCH') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const session = parseSessionCookie(req.headers.cookie);
    if (!session) {
        return res.status(403).json({ error: 'Access denied' });
    }

    const { season } = req.body as { season?: number };
    const stream = req.query.stream as string;

    if (season === undefined || !stream) {
        return res.status(400).json({ error: 'season and stream are required' });
    }

    const count = await expandSeason(stream, season);
    if (count === 0) {
        return res.status(404).json({ error: 'Season not found' });
    }

    return res.status(200).json({ expanded: count });
}