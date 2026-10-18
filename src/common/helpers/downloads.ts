import { NextApiRequest } from 'next';
import { incrementDownloadCount } from '../data/db';
import { downloadDay } from './downloadStats';

// Listeners already counted today, by episode, IP and user agent. A podcast app fetches an
// episode in many Range requests, and may come back to resume, so only the first one counts.
// Kept in memory: a restart mid-day can count a listener twice at most.
let countedDay = '';
const counted = new Set<string>();

const clientIp = (req: NextApiRequest) => {
    const forwarded = req.headers['x-forwarded-for'];
    const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0].trim();
    return first || req.socket.remoteAddress || 'unknown';
};

export const countDownload = async (req: NextApiRequest, streamId: string, episodeId: string) => {
    const day = downloadDay();
    if (day !== countedDay) {
        countedDay = day;
        counted.clear();
    }

    const key = `${episodeId}|${clientIp(req)}|${req.headers['user-agent'] ?? ''}`;
    if (counted.has(key)) return;
    counted.add(key);

    await incrementDownloadCount(streamId, episodeId, day);
};
