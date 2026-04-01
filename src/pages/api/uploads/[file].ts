import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import fs from 'fs';
import mime from 'mime-types';
import sharp from 'sharp';
import { getStreamByFile } from '../../../common/data/db';
import { parseSessionCookie } from '../../../common/helpers/auth';

const SUPPORTED_IMAGE_TYPES = new Set([
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/tiff',
]);

async function getResizedPath(originalPath: string, max: number): Promise<string | null> {
    const ext = path.extname(originalPath);
    const base = path.basename(originalPath, ext);
    const cachedPath = path.join(path.dirname(originalPath), `${base}.${max}${ext}`);

    if (fs.existsSync(cachedPath)) {
        return cachedPath;
    }

    const metadata = await sharp(originalPath).metadata();
    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;

    if (width <= max && height <= max) {
        return null;
    }

    const resizeOptions = width >= height
        ? { width: max }
        : { height: max };

    await sharp(originalPath, { animated: true })
        .resize({ ...resizeOptions, withoutEnlargement: true })
        .toFile(cachedPath);

    return cachedPath;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const file = (req.query.file as string)
        ?? req.url?.split('/uploads/')[1]?.split('?')[0];

    if (!file) {
        return res.status(400).json({ error: 'File not specified' });
    }

    const uploadsDir = path.resolve(process.cwd(), 'uploads');
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

    const contentType = mime.lookup(filePath) || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);

    const maxParam = req.query.max as string | undefined;
    const max = maxParam ? Math.min(parseInt(maxParam, 10), 2000) : NaN;

    if (!isNaN(max) && max > 0 && SUPPORTED_IMAGE_TYPES.has(contentType)) {
        try {
            const resizedPath = await getResizedPath(filePath, max);
            const servePath = resizedPath ?? filePath;
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            fs.createReadStream(servePath).pipe(res);
            return;
        } catch {
            // Fall through to serve original on resize error
        }
    }

    fs.createReadStream(filePath).pipe(res);
}