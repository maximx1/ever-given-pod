import { NextApiRequest, NextApiResponse } from 'next';
import { Podcast } from 'podcast';
import { getEpisodes, getUserById } from '../data/db';
import { prepareEpisodeItem, prepareStreamItem, withFeedToken } from './data';
import { parseSessionCookie } from './auth';
import { StreamDto } from '../dtos/streamDto';
import { isReleased, releaseTime } from './schedule';

// Podcast apps take only JPEG or PNG artwork, and Apple wants it 1400-3000 pixels square, so the
// feed asks for a large JPEG instead of the site's 600 pixel copy. Smaller uploads stay their size.
const toFeedArtwork = (url?: string) => {
    if (!url) return url;
    const [base, query = ''] = url.split('?');
    const params = new URLSearchParams(query);
    params.set('max', '2048');
    params.set('format', 'jpeg');
    return `${base}?${params}`;
};

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
        // An episode still being split is about to be replaced by its parts; a scheduled one is not out yet
        items = (await getEpisodes(streamData.id)).filter((ep) => ep.splitStatus !== 'pending' && isReleased(ep)).map((ep) => {
            const released = releaseTime(ep);
            const episode = prepareEpisodeItem(ep, feedToken, streamData.seasons);
            return {
                ...episode,
                imageUrl: toFeedArtwork(episode.imageUrl),
                date: released > 0 ? new Date(released) : undefined,
                itunesSeason: ep.seasonId ? seasonNumbers.get(ep.seasonId) : undefined,
                itunesEpisode: ep.seasonId ? ep.episodeNumber : undefined,
            };
        }),
        // Streams with seasons are meant to be played in order, so apps should list oldest first
        feed = new Podcast({
            ...data,
            imageUrl: toFeedArtwork(withFeedToken(data?.imageUrl, feedToken)),
            itunesType: streamData.seasons?.length ? 'serial' : undefined,
        });

    items.forEach(item => feed.addItem(item));
    res.setHeader('Content-Type', 'application/xml');
    res.status(200).send(feed.buildXml());
}
