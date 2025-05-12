import { NextApiRequest, NextApiResponse } from 'next';
import { Podcast } from 'podcast';
import { getPodcasts, getStream } from '../../../common/data/db';
import { preparePodcastItem, prepareStreamItem } from '../../../common/helpers/data';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const { stream } = req.query,
        data = prepareStreamItem(await getStream(stream as string)),
        items = (await getPodcasts(stream as string)).map(preparePodcastItem),
        feed = new Podcast(data);

    items.forEach(item => feed.addItem(item));
    res.setHeader('Content-Type', 'application/xml');
    res.status(200).send(feed.buildXml());
}