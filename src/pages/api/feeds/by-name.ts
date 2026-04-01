import { NextApiRequest, NextApiResponse } from 'next';
import { getStreamByUsernameAndName } from '../../../common/data/db';
import { handleFeedRequest } from '../../../common/helpers/feed';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const { username: usernameVal, stream: streamVal } = req.query;

    if (!usernameVal || !streamVal) {
        return res.status(400).json({ message: 'Missing username or stream' });
    }

    const streamData = await getStreamByUsernameAndName(usernameVal as string, streamVal as string);

    if (!streamData) {
        return res.status(404).json({ message: 'Stream not found' });
    }

    return handleFeedRequest(req, res, streamData);
}
