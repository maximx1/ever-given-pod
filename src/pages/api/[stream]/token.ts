import { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';
import { parseSessionCookie } from '../../../common/helpers/auth';
import { getStream, addStreamAccess } from '../../../common/data/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const session = parseSessionCookie(req.headers.cookie);
    if (!session?.userId) {
        return res.status(401).json({ message: 'Not authenticated' });
    }

    const { stream } = req.query;
    const streamData = await getStream(stream as string);
    if (!streamData || !streamData.isPrivate) {
        return res.status(404).json({ message: 'Stream not found or not private' });
    }

    const isOwner = session.userId === streamData.userId;
    const hasAccess = streamData.accessList?.some((a) => a.userId === session.userId);
    if (!isOwner && !hasAccess) {
        return res.status(403).json({ message: 'No access' });
    }

    const entry = await addStreamAccess(streamData.id, session.userId, uuidv4());
    if (!entry) {
        return res.status(500).json({ message: 'Failed to generate token' });
    }

    return res.status(200).json({ feedToken: entry.feedToken });
}
