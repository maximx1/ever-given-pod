import { NextApiRequest, NextApiResponse } from 'next';
import { incrementPlayCount } from '../../../common/data/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const stream = req.query.stream as string;
    const { episodeId } = req.body;

    if (!episodeId) {
        return res.status(400).json({ error: 'episodeId required' });
    }

    await incrementPlayCount(stream, episodeId);
    return res.status(200).json({ ok: true });
}
