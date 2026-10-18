import { NextApiRequest, NextApiResponse } from 'next';
import { getStreamByUsernameAndName } from '../../../../common/data/db';
import { handleFeedRequest } from '../../../../common/helpers/feed';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    // Reached through the middleware's /<user>/<stream>/feed rewrite, a production build leaves req.query
    // without the route params and req.url as the original path, so read the names from that
    const fromUrl = req.url?.split('?')[0].match(/\/([^/]+)\/([^/]+)\/feed$/),
        username = (req.query.username as string) ?? (fromUrl && decodeURIComponent(fromUrl[1])),
        stream = (req.query.stream as string) ?? (fromUrl && decodeURIComponent(fromUrl[2]));

    if (!username || !stream) {
        return res.status(400).json({ message: 'Missing username or stream' });
    }

    const streamData = await getStreamByUsernameAndName(username, stream);

    if (!streamData) {
        return res.status(404).json({ message: 'Stream not found' });
    }

    return handleFeedRequest(req, res, streamData);
}
