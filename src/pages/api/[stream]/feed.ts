import { NextApiRequest, NextApiResponse } from 'next';
import { getStream } from '../../../common/data/db';
import { handleFeedRequest } from '../../../common/helpers/feed';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const { stream } = req.query,
        streamData = await getStream(stream as string);

    if (!streamData) {
        return res.status(404).json({ message: 'Stream not found' });
    }

    return handleFeedRequest(req, res, streamData);
}