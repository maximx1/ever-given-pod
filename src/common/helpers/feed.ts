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
        seasonNumbers = new Map(streamData.seasons?.map((s) => [s.id, s.number])),
        items = (await getEpisodes(streamData.id)).map((ep) => {
            const uploaded = Number(ep.uploadDate);
            return {
                ...prepareEpisodeItem(ep, feedToken, streamData.seasons),
                date: Number.isFinite(uploaded) && uploaded > 0 ? new Date(uploaded) : undefined,
                itunesSeason: ep.seasonId ? seasonNumbers.get(ep.seasonId) : undefined,
                itunesEpisode: ep.seasonId ? ep.episodeNumber : undefined,
            };
        }),
        // Streams with seasons are meant to be played in order, so apps should list oldest first
        feed = new Podcast({ ...data, itunesType: streamData.seasons?.length ? 'serial' : undefined });

    items.forEach(item => feed.addItem(item));
    res.setHeader('Content-Type', 'application/xml');
    res.status(200).send(feed.buildXml());
}
