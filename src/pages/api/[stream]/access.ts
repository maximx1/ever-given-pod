import { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';
import { parseSessionCookie } from '../../../common/helpers/auth';
import { getStream, addStreamAccess, removeStreamAccess, getUserById } from '../../../common/data/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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

    if (req.method === 'POST') {
        const { userId } = req.body;
        if (!userId || typeof userId !== 'string') {
            return res.status(400).json({ message: 'userId is required' });
        }

        const targetUser = await getUserById(userId);
        if (!targetUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        const feedToken = uuidv4();
        const entry = await addStreamAccess(streamData.id, userId, feedToken);
        if (!entry) {
            return res.status(400).json({ message: 'Could not add access. Is the stream private?' });
        }

        return res.status(200).json({
            userId: entry.userId,
            username: targetUser.username,
            name: targetUser.name,
            feedToken: entry.feedToken,
        });
    }

    if (req.method === 'DELETE') {
        const { userId } = req.body;
        if (!userId || typeof userId !== 'string') {
            return res.status(400).json({ message: 'userId is required' });
        }

        await removeStreamAccess(streamData.id, userId);
        return res.status(200).json({ message: 'Access removed' });
    }

    if (req.method === 'GET') {
        const list = streamData.accessList ?? [];
        const enriched = await Promise.all(
            list.map(async (entry) => {
                const user = await getUserById(entry.userId);
                return {
                    userId: entry.userId,
                    username: user?.username,
                    name: user?.name,
                    feedToken: entry.feedToken,
                };
            })
        );
        return res.status(200).json(enriched);
    }

    res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
}
