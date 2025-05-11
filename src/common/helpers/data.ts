import fs from 'fs';
import os from 'os';
import path from 'path';
import mime from 'mime-types';
import { PodcastDto } from '../dtos/podcastDto';
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

export const convertUrlToPublic = (url?: string) => {
    return url ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/uploads/${url}` : undefined;
};

export const preparePodcastItem = (podcast: PodcastDto) => {
    const fileSize = getFileSize(path.join(process.cwd(), `public/uploads/${podcast.url}`)),
        fileUrl = convertUrlToPublic(podcast.url);

    return {
        ...podcast,
        imageUrl: convertUrlToPublic(podcast.imageUrl),
        url: fileUrl,
        enclosure: {
            url: fileUrl ?? '',
            type: getFileMimeType(podcast.url ?? ''),
            size: fileSize
        }
    };
};

export const prepareStreamItem = (stream: StreamDto) => {
    return {
        ...stream,
        imageUrl: convertUrlToPublic(stream.imageUrl)
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