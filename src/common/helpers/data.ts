import fs from 'fs';
import os from 'os';
import path from 'path';
import mime from 'mime-types';
import { EpisodeDto } from '../dtos/episodeDto';
import { resolveApiUrl, resolveAppUrl, resolveAssetUrl } from './api';
import { SeasonDto, StreamDto } from '../dtos/streamDto';
import { UPLOADS_DIR } from './paths';

export const getFileSize = (filePath: string): number => {
    const stats = fs.statSync(filePath);
    return stats.size;
};

export const getFileMimeType = (filePath: string): string => {
    const ext = path.extname(filePath);
    const mimeType = mime.lookup(ext);
    // Podcast apps look for video/mp4; mime-types names .mp4 application/mp4
    if (mimeType === 'application/mp4') return 'video/mp4';
    return mimeType || 'application/octet-stream';
};

export const convertUrlToPublic = (url?: string, max?: number) => {
    if (!url) return undefined;
    const base = resolveAssetUrl(`/uploads/${url}`);
    return max ? `${base}?max=${max}` : base;
};

// Files of a private stream are only served with a feed token (or a session), images included
export const withFeedToken = (url?: string, token?: string) =>
    url && token ? `${url}${url.includes('?') ? '&' : '?'}token=${token}` : url;

export const prepareSeasonItem = (season: SeasonDto) => ({
    ...season,
    imageUrl: convertUrlToPublic(season.imageUrl, 600),
});

// Pass the stream's seasons so an episode without its own image shows its season's cover
export const prepareEpisodeItem = (episode: EpisodeDto, token?: string, seasons?: SeasonDto[]) => {
    let fileSize = 0;
    let fileMimeType = 'application/octet-stream';
    if (episode.url) {
        try {
            fileSize = getFileSize(path.join(UPLOADS_DIR, episode.url));
            fileMimeType = getFileMimeType(episode.url);
        } catch {
            // File may not exist on disk
        }
    }
    const fileUrl = withFeedToken(convertUrlToPublic(episode.url), token);

    const seasonImageUrl = episode.seasonId ? seasons?.find((s) => s.id === episode.seasonId)?.imageUrl : undefined;
    const publicEpisode = { ...episode };
    delete publicEpisode.playbackPositions;
    // Download counts are the owner's; the episode list adds them back for them
    delete publicEpisode.downloads;

    return {
        ...publicEpisode,
        imageUrl: withFeedToken(convertUrlToPublic(episode.imageUrl ?? seasonImageUrl, 600), token),
        url: fileUrl,
        enclosure: {
            url: fileUrl ?? '',
            type: fileMimeType,
            size: fileSize
        }
    };
};

export const prepareStreamItem = (stream?: StreamDto, ownerUsername?: string) => {
    if (!stream) return undefined;

    // Episodes carry listener data and the access list carries feed tokens; neither belongs in a stream summary
    const streamWithoutEpisodes = { ...stream };
    delete streamWithoutEpisodes.episodes;
    delete streamWithoutEpisodes.accessList;
    const imageUrl = stream.imageUrl ? convertUrlToPublic(stream.imageUrl, 600) : undefined;
    const slug = encodeURIComponent(stream.name || stream.id);
    const basePath = ownerUsername ? `/${encodeURIComponent(ownerUsername)}/${slug}` : `/${slug}`;
    return {
        ...streamWithoutEpisodes,
        seasons: stream.seasons?.map(prepareSeasonItem),
        imageUrl,
        feedUrl: resolveApiUrl(`/${stream.id}/feed`),
        siteUrl: stream.siteUrl ?? resolveAppUrl(basePath)
    };
};

export const getLocalIpAddress = (): string => {
    const networkInterfaces = os.networkInterfaces();

    for (const interfaceName in networkInterfaces) {
        const interfaces = networkInterfaces[interfaceName];
        if (!interfaces) continue;

        for (const iface of interfaces) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }

    return 'localhost';
};