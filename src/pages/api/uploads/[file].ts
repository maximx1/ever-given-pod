import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import fs from 'fs';
import mime from 'mime-types';
import { getStreamByFile } from '../../../common/data/db';
import { parseSessionCookie } from '../../../common/helpers/auth';
import { UPLOADS_DIR } from '../../../common/helpers/paths';
import { isReleased } from '../../../common/helpers/schedule';
import { DEFAULT_IMAGE_QUALITY, getVariant, snapQuality, snapSize } from '../../../common/helpers/imageCache';

const SUPPORTED_IMAGE_TYPES = new Set([
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/tiff',
]);

const INLINE_MEDIA_TYPES = new Set(['application/mp4', 'application/ogg']);

const isInlineSafe = (type: string) =>
    SUPPORTED_IMAGE_TYPES.has(type) || INLINE_MEDIA_TYPES.has(type) || type.startsWith('audio/') || type.startsWith('video/');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const file = (req.query.file as string)
        ?? req.url?.split('/uploads/')[1]?.split('?')[0];

    if (!file) {
        return res.status(400).json({ error: 'File not specified' });
    }

    const uploadsDir = UPLOADS_DIR;
    const filePath = path.resolve(uploadsDir, file);

    if (!filePath.startsWith(uploadsDir + path.sep)) {
        return res.status(400).json({ error: 'Invalid file path' });
    }

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
    }

    const stream = await getStreamByFile(file);
    if (stream?.isPrivate) {
        const token = typeof req.query.token === 'string' ? req.query.token : undefined;
        if (!token) {
            const session = parseSessionCookie(req.headers.cookie);
            if (!session || (session.userId !== stream.userId && !stream.accessList?.some((a) => a.userId === session.userId))) {
                return res.status(403).json({ error: 'Access denied' });
            }
        } else {
            const validToken = stream.accessList?.some((a) => a.feedToken === token);
            if (!validToken) {
                return res.status(403).json({ error: 'Invalid token' });
            }
        }
    }

    // A scheduled episode's files are the owner's alone until its release date
    const episode = stream?.episodes?.find((e) => e.url === file || e.imageUrl === file);
    const isUnreleased = !!episode && !isReleased(episode);
    if (stream && isUnreleased && parseSessionCookie(req.headers.cookie)?.userId !== stream.userId) {
        return res.status(404).json({ error: 'File not found' });
    }
    const isRestricted = !!stream?.isPrivate || isUnreleased;

    // Anything that is not plain media is sent as a download so it can never run as a page on this origin
    const detectedType = mime.lookup(filePath) || 'application/octet-stream';
    const contentType = isInlineSafe(detectedType) ? detectedType : 'application/octet-stream';
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (!isInlineSafe(detectedType)) {
        res.setHeader('Content-Disposition', 'attachment');
    }

    // ?w= fits the width (next/image), ?max= the longer side (feeds and older links)
    const widthParam = parseInt(req.query.w as string, 10);
    const maxParam = parseInt(req.query.max as string, 10);
    const requested = widthParam > 0 ? widthParam : maxParam;

    if (requested > 0 && SUPPORTED_IMAGE_TYPES.has(contentType)) {
        const qualityParam = parseInt(req.query.q as string, 10);
        try {
            const variant = await getVariant(file, filePath, {
                size: snapSize(requested),
                fit: widthParam > 0 ? 'width' : 'longest',
                quality: snapQuality(qualityParam > 0 ? qualityParam : DEFAULT_IMAGE_QUALITY),
                webp: !!req.headers.accept?.includes('image/webp'),
            });
            // A file name never changes content, but private and unreleased images stay out of shared caches
            res.setHeader('Cache-Control', isRestricted
                ? 'private, max-age=3600'
                : 'public, max-age=31536000, immutable');
            res.setHeader('Vary', 'Accept');
            res.setHeader('Content-Type', variant.contentType);
            fs.createReadStream(variant.path).pipe(res);
            return;
        } catch (error) {
            console.error(`Could not resize ${file}:`, error);
            // Fall through to serve original on resize error
        }
    }

    // Support HTTP Range requests for efficient seeking on large media files
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = end - start + 1;

        res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunkSize,
            'Content-Type': contentType,
        });
        fs.createReadStream(filePath, { start, end }).pipe(res);
    } else {
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Length', fileSize);
        res.setHeader('Accept-Ranges', 'bytes');
        fs.createReadStream(filePath).pipe(res);
    }
}