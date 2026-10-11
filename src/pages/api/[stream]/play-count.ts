import { NextApiRequest, NextApiResponse } from 'next';
import { getStream, incrementPlayCount } from '../../../common/data/db';
import { canViewStream, parseSessionCookie } from '../../../common/helpers/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const stream = req.query.stream as string;
    const { episodeId } = req.body;

    if (!episodeId) {
        return res.status(400).json({ error: 'episodeId required' });
    }

    const streamData = await getStream(stream);
    if (!streamData) {
        return res.status(404).json({ error: 'Stream not found' });
    }
    if (!canViewStream(streamData, parseSessionCookie(req.headers.cookie))) {
        return res.status(403).json({ error: 'Access denied' });
    }
    if (!streamData.episodes?.some((e) => e.episodeId === episodeId)) {
        return res.status(404).json({ error: 'Episode not found' });
    }

    await incrementPlayCount(streamData.id, episodeId);
    return res.status(200).json({ ok: true });
}
