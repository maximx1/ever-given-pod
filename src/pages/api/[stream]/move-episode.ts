import { NextApiRequest, NextApiResponse } from 'next';
import { getStream, moveEpisodeToSeason } from '../../../common/data/db';
import { parseSessionCookie } from '../../../common/helpers/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'PATCH') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const session = parseSessionCookie(req.headers.cookie);
    if (!session?.userId) {
        return res.status(401).json({ message: 'Not authenticated' });
    }

    const { stream } = req.query;
    const streamData = await getStream(stream as string);
    if (!streamData) {
        return res.status(404).json({ message: 'Stream not found' });
    }
    if (streamData.userId !== session.userId) {
        return res.status(403).json({ message: 'Not authorized' });
    }

    // seasonId null takes the episode out of its season
    const { episodeId, seasonId } = req.body;
    if (!episodeId || typeof episodeId !== 'string') {
        return res.status(400).json({ message: 'episodeId is required' });
    }
    if (seasonId !== null && (typeof seasonId !== 'string' || !seasonId)) {
        return res.status(400).json({ message: 'seasonId must be a season id or null' });
    }

    const moved = await moveEpisodeToSeason(streamData.id, episodeId, seasonId);
    if (!moved) {
        return res.status(404).json({ message: 'Episode or season not found' });
    }

    return res.status(200).json({ episodeId: moved.episodeId, seasonId: moved.seasonId ?? null, episodeNumber: moved.episodeNumber ?? null });
}
