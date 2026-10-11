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

export const isAudioUpload = (file: File): boolean => detectUploadType(file).startsWith('audio/');

// Removes whatever multiparty left in the upload directory; files already moved to their final name are skipped
export const discardUploads = async (files?: Record<string, File[] | undefined>) => {
    const leftovers = Object.values(files ?? {}).flatMap((group) => group ?? []);
    await Promise.all(leftovers.map((file) => fs.unlink(file.path).catch(() => {})));
};
