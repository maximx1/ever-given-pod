import type { NextApiRequest, NextApiResponse } from 'next';
import { getUserByUsername, getStreamsByUserId } from '../../../common/data/db';
import { prepareStreamItem } from '../../../common/helpers/data';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { username } = req.query;
    if (!username || typeof username !== 'string') {
        return res.status(400).json({ message: 'Username is required' });
    }

    const user = await getUserByUsername(username);
    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    const streams = await getStreamsByUserId(user.id);
    const preparedStreams = streams.map((s) => prepareStreamItem(s, user.username)).filter(Boolean);

    return res.status(200).json({
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        imageUrl: user.imageUrl,
        creationDate: user.creationDate,
        streams: preparedStreams,
    });
}
