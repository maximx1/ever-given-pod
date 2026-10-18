import { NextApiRequest, NextApiResponse } from 'next';
import { getStream, updateEpisodeReleaseDate } from '../../../common/data/db';
import { parseSessionCookie } from '../../../common/helpers/auth';
import { parseReleaseDate } from '../../../common/helpers/schedule';

// Sets when an episode is released. A blank releaseDate releases it now.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'PATCH') {
        res.setHeader('Allow', ['PATCH']);
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

    const { episodeId } = req.body;
    if (!episodeId || typeof episodeId !== 'string') {
        return res.status(400).json({ message: 'episodeId is required' });
    }
    const releaseDate = parseReleaseDate(req.body.releaseDate);
    if (releaseDate === null) {
        return res.status(400).json({ message: 'Release date is not a valid date' });
    }

    const updated = await updateEpisodeReleaseDate(streamData.id, episodeId, releaseDate ?? null);
    if (!updated) {
        return res.status(404).json({ message: 'Episode not found' });
    }

    return res.status(200).json({ releaseDate: updated.releaseDate ?? null, uploadDate: updated.uploadDate });
}
