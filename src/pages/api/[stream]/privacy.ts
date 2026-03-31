import { NextApiRequest, NextApiResponse } from 'next';
import { parseSessionCookie } from '../../../common/helpers/auth';
import { getStream, updateStreamPrivacy } from '../../../common/data/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'PUT') {
        res.setHeader('Allow', ['PUT']);
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

    const { isPrivate } = req.body;
    if (typeof isPrivate !== 'boolean') {
        return res.status(400).json({ message: 'isPrivate must be a boolean' });
    }

    const updated = await updateStreamPrivacy(streamData.id, isPrivate);
    if (!updated) {
        return res.status(500).json({ message: 'Failed to update privacy' });
    }

    return res.status(200).json({
        isPrivate: updated.isPrivate,
        accessList: updated.accessList,
    });
}
