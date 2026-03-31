import { NextApiRequest, NextApiResponse } from 'next';
import { Podcast } from 'podcast';
import { getEpisodes, getStream, getUserById } from '../../../common/data/db';
import { prepareEpisodeItem, prepareStreamItem } from '../../../common/helpers/data';
import { parseSessionCookie } from '../../../common/helpers/auth';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const { stream, token } = req.query,
        streamData = await getStream(stream as string);

    if (!streamData) {
        return res.status(404).json({ message: 'Stream not found' });
    }

    if (streamData.isPrivate) {
        const feedToken = typeof token === 'string' ? token : undefined;
        if (!feedToken) {
            const session = parseSessionCookie(req.headers.cookie);
            if (!session || !streamData.accessList?.some((a) => a.userId === session.userId)) {
                return res.status(403).json({ message: 'Access denied' });
            }
        } else {
            const validToken = streamData.accessList?.some((a) => a.feedToken === feedToken);
            if (!validToken) {
                return res.status(403).json({ message: 'Invalid feed token' });
            }
        }
    }

    const owner = streamData ? await getUserById(streamData.userId) : undefined,
        data = prepareStreamItem(streamData, owner?.username),
        items = (await getEpisodes(stream as string)).map(prepareEpisodeItem),
        feed = new Podcast(data);

    items.forEach(item => feed.addItem(item));
    res.setHeader('Content-Type', 'application/xml');
    res.status(200).send(feed.buildXml());
}