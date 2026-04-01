import { NextApiRequest, NextApiResponse } from 'next';
import { getStreamByUsernameAndName } from '../../../common/data/db';
import { handleFeedRequest } from '../../../common/helpers/feed';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    let { usernameVal, streamVal } = req.query;

    if (!usernameVal || !streamVal) {
        const url = req.url || '';
        const re = /.*\/([^\/\?#]+)\/([^\/\?#]+)\/feed(?:$|\?.*)/;
        const m = url.match(re);
        if (m) {
            usernameVal = usernameVal || m[1];
            streamVal = streamVal || m[2];
        }
        if (!usernameVal || !streamVal) {
            return res.status(400).json({ message: 'Missing username or stream' });
        }
    }

    const streamData = await getStreamByUsernameAndName(usernameVal as string, streamVal as string);

    if (!streamData) {
        return res.status(404).json({ message: 'Stream not found' });
    }

    return handleFeedRequest(req, res, streamData);
}
