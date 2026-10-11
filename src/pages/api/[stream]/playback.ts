import { NextApiRequest, NextApiResponse } from 'next';
import { canViewStream, parseSessionCookie } from '../../../common/helpers/auth';
import { getStream, updatePlaybackPosition, getPlaybackPosition } from '../../../common/data/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const stream = req.query.stream as string;

    if (req.method !== 'GET' && req.method !== 'PUT') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const session = parseSessionCookie(req.headers.cookie);
    if (!session) return res.status(401).json({ error: 'Not authenticated' });

    const streamData = await getStream(stream);
    if (!streamData) return res.status(404).json({ error: 'Stream not found' });
    if (!canViewStream(streamData, session)) return res.status(403).json({ error: 'Access denied' });

    if (req.method === 'GET') {
        const episodeId = req.query.episodeId as string;
        if (!episodeId) return res.status(400).json({ error: 'episodeId required' });

        const result = await getPlaybackPosition(streamData.id, episodeId, session.userId);
        return res.status(200).json({ position: result?.position ?? null, duration: result?.duration ?? null });
    }

    const { episodeId, position, duration } = req.body;
    if (!episodeId || typeof position !== 'number') {
        return res.status(400).json({ error: 'episodeId and position required' });
    }
    if (!streamData.episodes?.some((e) => e.episodeId === episodeId)) {
        return res.status(404).json({ error: 'Episode not found' });
    }

    await updatePlaybackPosition(streamData.id, episodeId, session.userId, position, typeof duration === 'number' ? duration : undefined);
    return res.status(200).json({ ok: true });
}
