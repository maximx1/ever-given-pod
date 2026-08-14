import { NextApiRequest, NextApiResponse } from 'next';
import { parseSessionCookie } from '../../../common/helpers/auth';
import { updatePlaybackPosition, getPlaybackPosition } from '../../../common/data/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const stream = req.query.stream as string;

    if (req.method === 'GET') {
        const session = parseSessionCookie(req.headers.cookie);
        if (!session) return res.status(401).json({ error: 'Not authenticated' });

        const episodeId = req.query.episodeId as string;
        if (!episodeId) return res.status(400).json({ error: 'episodeId required' });

        const result = await getPlaybackPosition(stream, episodeId, session.userId);
        return res.status(200).json({ position: result?.position ?? null, duration: result?.duration ?? null });
    }

    if (req.method === 'PUT') {
        const session = parseSessionCookie(req.headers.cookie);
        if (!session) return res.status(401).json({ error: 'Not authenticated' });

        const { episodeId, position, duration } = req.body;
        if (!episodeId || typeof position !== 'number') {
            return res.status(400).json({ error: 'episodeId and position required' });
        }

        await updatePlaybackPosition(stream, episodeId, session.userId, position, typeof duration === 'number' ? duration : undefined);
        return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
