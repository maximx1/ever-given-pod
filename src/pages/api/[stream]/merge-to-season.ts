import { NextApiRequest, NextApiResponse } from 'next';
import { mergeEpisodeToSeason } from '../../../common/data/db';
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

    const { episodeId, targetSeason } = req.body as { episodeId?: string; targetSeason?: number };
    const stream = req.query.stream as string;

    if (!episodeId || targetSeason === undefined || !stream) {
        return res.status(400).json({ error: 'episodeId, targetSeason, and stream are required' });
    }

    const result = await mergeEpisodeToSeason(stream, episodeId, targetSeason);
    if (!result) {
        return res.status(404).json({ error: 'Episode not found' });
    }

    return res.status(200).json(result);
}