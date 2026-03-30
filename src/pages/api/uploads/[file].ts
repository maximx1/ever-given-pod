import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import fs from 'fs';
import mime from 'mime-types';
import sharp from 'sharp';

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

    const filePath = path.join(process.cwd(), 'uploads', file);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
    }

    const contentType = mime.lookup(filePath) || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);

    const maxParam = req.query.max as string | undefined;
    const max = maxParam ? parseInt(maxParam, 10) : NaN;

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