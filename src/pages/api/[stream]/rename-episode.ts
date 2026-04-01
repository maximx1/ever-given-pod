import { NextApiRequest, NextApiResponse } from 'next';
import { getStream, updateEpisodeTitle } from '../../../common/data/db';
import { parseSessionCookie } from '../../../common/helpers/auth';
import { FIELD_LIMITS } from '../../../common/limits';

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

    const { episodeId, title } = req.body;
    if (!episodeId || typeof episodeId !== 'string') {
        return res.status(400).json({ message: 'episodeId is required' });
    }
    if (!title || typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({ message: 'Title is required' });
    }
    if (title.trim().length > FIELD_LIMITS.title) {
        return res.status(400).json({ message: `Title must be ${FIELD_LIMITS.title} characters or fewer` });
    }

    const updated = await updateEpisodeTitle(stream as string, episodeId, title.trim());
    if (!updated) {
        return res.status(404).json({ message: 'Episode not found' });
    }

    return res.status(200).json({ title: updated.title });
}
