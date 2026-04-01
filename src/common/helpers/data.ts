import fs from 'fs';
import os from 'os';
import path from 'path';
import mime from 'mime-types';
import { EpisodeDto } from '../dtos/episodeDto';
import { resolveApiUrl, resolveAppUrl, resolveAssetUrl } from './api';
import { StreamDto } from '../dtos/streamDto';

export const getFileSize = (filePath: string): number => {
    const stats = fs.statSync(filePath);
    return stats.size;
};

export const getFileMimeType = (filePath: string): string => {
    const ext = path.extname(filePath);
    const mimeType = mime.lookup(ext);
    return mimeType || 'application/octet-stream';
};

export const convertUrlToPublic = (url?: string, max?: number) => {
    if (!url) return undefined;
    const base = resolveAssetUrl(`/uploads/${url}`);
    return max ? `${base}?max=${max}` : base;
};

export const prepareEpisodeItem = (episode: EpisodeDto, token?: string) => {
    let fileSize = 0;
    let fileMimeType = 'application/octet-stream';
    if (episode.url) {
        try {
            fileSize = getFileSize(path.join(process.cwd(), `uploads/${episode.url}`));
            fileMimeType = getFileMimeType(episode.url);
        } catch {
            // File may not exist on disk
        }
    }
    let fileUrl = convertUrlToPublic(episode.url);
    if (fileUrl && token) {
        fileUrl += `${fileUrl.includes('?') ? '&' : '?'}token=${token}`;
    }

    return {
        ...episode,
        imageUrl: convertUrlToPublic(episode.imageUrl, 600),
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

    const { episodes, ...streamWithoutEpisodes } = stream;
    const imageUrl = stream.imageUrl ? convertUrlToPublic(stream.imageUrl, 600) : undefined;
    const slug = encodeURIComponent(stream.name || stream.id);
    const basePath = ownerUsername ? `/${encodeURIComponent(ownerUsername)}/${slug}` : `/${slug}`;
    return {
        ...streamWithoutEpisodes,
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