import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import { getStream, setEpisodeSplitStatus } from '../../../common/data/db';
import { parseSessionCookie } from '../../../common/helpers/auth';
import { FfmpegMissingError, planSplit, probeAudio, queueSplit } from '../../../common/helpers/splitter';
import { DEFAULT_SPLIT_MINUTES } from '../../../common/limits';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
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

    const episode = streamData.episodes?.find((e) => e.episodeId === episodeId);
    if (!episode?.url) {
        return res.status(404).json({ message: 'Episode not found' });
    }
    if (episode.splitStatus === 'pending') {
        return res.status(409).json({ message: 'This episode is already being split' });
    }

    const splitMinutes = streamData.splitMinutes ?? DEFAULT_SPLIT_MINUTES;
    let parts: number;
    try {
        const probe = await probeAudio(path.join(process.cwd(), 'uploads', episode.url));
        const plan = planSplit(probe, splitMinutes);
        if (!plan) {
            return res.status(400).json({
                message: `This episode is ${Math.round(probe.duration / 60)} minutes long, which is too short to split into ${splitMinutes}-minute parts`,
            });
        }
        parts = plan.labels.length;
    } catch (error) {
        if (error instanceof FfmpegMissingError) {
            return res.status(501).json({ message: 'Splitting needs ffmpeg, which is not installed on the server' });
        }
        console.error('Could not inspect audio:', error);
        return res.status(500).json({ message: 'The audio file could not be read' });
    }

    await setEpisodeSplitStatus(streamData.id, episodeId, 'pending');
    queueSplit(streamData.id, episodeId);

    return res.status(202).json({ parts });
}
