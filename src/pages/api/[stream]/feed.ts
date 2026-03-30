import { NextApiRequest, NextApiResponse } from 'next';
import { Podcast } from 'podcast';
import { getEpisodes, getStream, getUserById } from '../../../common/data/db';
import { prepareEpisodeItem, prepareStreamItem } from '../../../common/helpers/data';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const { stream } = req.query,
        streamData = await getStream(stream as string),
        owner = streamData ? await getUserById(streamData.userId) : undefined,
        data = prepareStreamItem(streamData, owner?.username),
        items = (await getEpisodes(stream as string)).map(prepareEpisodeItem),
        feed = new Podcast(data);

    items.forEach(item => feed.addItem(item));
    res.setHeader('Content-Type', 'application/xml');
    res.status(200).send(feed.buildXml());
}