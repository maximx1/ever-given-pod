import fs from 'fs/promises';
import path from 'path';
import mime from 'mime-types';
import type { File } from 'multiparty';
import { MAX_IMAGE_SIZE } from '../limits';

export const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export const detectUploadType = (file: File): string =>
    mime.lookup(file.originalFilename || '') || file.headers?.['content-type'] || '';

export const getUploadExtension = (file: File): string => {
    const fallback = mime.extension(detectUploadType(file));
    return path.extname(file.originalFilename || '') || (fallback ? `.${fallback}` : '.bin');
};

// Returns an error message when the file is not an acceptable image
export const validateImageUpload = async (file: File): Promise<string | null> => {
    if (!ALLOWED_IMAGE_TYPES.has(detectUploadType(file))) {
        return 'Only JPEG, PNG, WebP, and GIF images are allowed';
    }

    const stat = await fs.stat(file.path);
    if (stat.size > MAX_IMAGE_SIZE) {
        return `Image must be ${MAX_IMAGE_SIZE / (1024 * 1024)} MB or smaller`;
    }

    return null;
};

// mime-types calls .mp4 application/mp4, which can hold audio or video; the browser's type says which
const detectMediaType = (file: File): string => {
    const type = detectUploadType(file);
    if (type !== 'application/mp4') return type;
    const sent = file.headers?.['content-type'] || '';
    return sent.startsWith('audio/') ? sent : 'video/mp4';
};

export const isAudioUpload = (file: File): boolean => detectMediaType(file).startsWith('audio/');

export const isVideoUpload = (file: File): boolean => detectMediaType(file).startsWith('video/');

// Removes whatever multiparty left in the upload directory; files already moved to their final name are skipped
export const discardUploads = async (files?: Record<string, File[] | undefined>) => {
    const leftovers = Object.values(files ?? {}).flatMap((group) => group ?? []);
    await Promise.all(leftovers.map((file) => fs.unlink(file.path).catch(() => {})));
};
