import { NextApiRequest, NextApiResponse } from 'next';
import { Podcast } from 'podcast';
import { getEpisodes, getUserById } from '../data/db';
import { prepareEpisodeItem, prepareStreamItem } from './data';
import { parseSessionCookie } from './auth';
import { StreamDto } from '../dtos/streamDto';

export async function handleFeedRequest(
    req: NextApiRequest,
    res: NextApiResponse,
    streamData: StreamDto
) {
    const token = typeof req.query.token === 'string' ? req.query.token : undefined;

    if (streamData.isPrivate) {
        if (!token) {
            const session = parseSessionCookie(req.headers.cookie);
            if (!session || (session.userId !== streamData.userId && !streamData.accessList?.some((a) => a.userId === session.userId))) {
                return res.status(403).json({ message: 'Access denied' });
            }
        } else {
            const validToken = streamData.accessList?.some((a) => a.feedToken === token);
            if (!validToken) {
                return res.status(403).json({ message: 'Invalid feed token' });
            }
        }
    }

    const owner = await getUserById(streamData.userId),
        feedToken = streamData.isPrivate ? token : undefined,
        data = prepareStreamItem(streamData, owner?.username),
        items = (await getEpisodes(streamData.id)).map((ep) => prepareEpisodeItem(ep, feedToken)),
        feed = new Podcast(data);

    items.forEach(item => feed.addItem(item));
    res.setHeader('Content-Type', 'application/xml');
    res.status(200).send(feed.buildXml());
}
