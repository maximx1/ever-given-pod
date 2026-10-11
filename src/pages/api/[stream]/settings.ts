import { NextApiRequest, NextApiResponse } from 'next';
import { getStream, updateStreamSettings } from '../../../common/data/db';
import { parseSessionCookie } from '../../../common/helpers/auth';
import { DEFAULT_SPLIT_MINUTES, SPLIT_MINUTES_RANGE } from '../../../common/limits';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'PATCH') {
        res.setHeader('Allow', ['PATCH']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
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

    const { autoSplit, splitMinutes } = req.body;
    if (autoSplit !== undefined && typeof autoSplit !== 'boolean') {
        return res.status(400).json({ message: 'autoSplit must be true or false' });
    }
    if (splitMinutes !== undefined
        && (!Number.isInteger(splitMinutes) || splitMinutes < SPLIT_MINUTES_RANGE.min || splitMinutes > SPLIT_MINUTES_RANGE.max)) {
        return res.status(400).json({ message: `Part length must be a whole number of minutes from ${SPLIT_MINUTES_RANGE.min} to ${SPLIT_MINUTES_RANGE.max}` });
    }

    const updated = await updateStreamSettings(streamData.id, { autoSplit, splitMinutes });
    if (!updated) {
        return res.status(500).json({ message: 'Failed to update settings' });
    }

    return res.status(200).json({
        autoSplit: updated.autoSplit ?? true,
        splitMinutes: updated.splitMinutes ?? DEFAULT_SPLIT_MINUTES,
    });
}
