import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { IMAGE_CACHE_DIR } from './paths';

// Every size a resized copy is made at. next/image asks for its default widths (16-3840); the
// feeds and older links ask for 100, 160, 600 and 2000. Anything else is rounded up to the next
// size here, so no request can fill the disk with one-off sizes.
export const IMAGE_SIZES = [16, 32, 48, 64, 96, 128, 160, 256, 384, 600, 640, 750, 828, 1080, 1200, 1920, 2048];
export const IMAGE_QUALITIES = [50, 75, 90];
export const DEFAULT_IMAGE_QUALITY = 75;

export const snapSize = (requested: number) => IMAGE_SIZES.find((size) => size >= requested) ?? IMAGE_SIZES[IMAGE_SIZES.length - 1];

export const snapQuality = (requested: number) =>
    IMAGE_QUALITIES.reduce((best, q) => Math.abs(q - requested) < Math.abs(best - requested) ? q : best);

export type VariantRequest = {
    size: number;
    // 'width' fits the width (next/image's srcset); 'longest' fits the longer side (?max=)
    fit: 'width' | 'longest';
    quality: number;
    webp: boolean;
};

const OUTPUT_TYPES: Record<string, { ext: string; type: string }> = {
    webp: { ext: 'webp', type: 'image/webp' },
    jpeg: { ext: 'jpg', type: 'image/jpeg' },
    png: { ext: 'png', type: 'image/png' },
    gif: { ext: 'gif', type: 'image/gif' },
    avif: { ext: 'avif', type: 'image/avif' },
};

export const variantDir = (fileName: string) => path.join(IMAGE_CACHE_DIR, fileName);

// Removes every resized copy of an upload
export const clearVariants = async (fileName: string) => {
    await fs.rm(variantDir(fileName), { recursive: true, force: true });
};

// Resizing is CPU heavy; a page full of new thumbnails is made a couple at a time
const MAX_CONCURRENT = 2;
let running = 0;
const waiting: (() => void)[] = [];
const withSlot = async <T>(task: () => Promise<T>): Promise<T> => {
    if (running >= MAX_CONCURRENT) await new Promise<void>((resolve) => waiting.push(resolve));
    running++;
    try {
        return await task();
    } finally {
        running--;
        waiting.shift()?.();
    }
};

const inFlight = new Map<string, Promise<string>>();

const render = async (originalPath: string, target: string, request: VariantRequest, format: string) => {
    const image = sharp(originalPath, { animated: true })
        // Turned upright from the camera's orientation tag; the output keeps no metadata
        .rotate()
        .resize(request.fit === 'width'
            ? { width: request.size, withoutEnlargement: true }
            : { width: request.size, height: request.size, fit: 'inside', withoutEnlargement: true });

    const output = format === 'jpeg' || format === 'webp' || format === 'avif'
        ? image.toFormat(format, { quality: request.quality })
        : image.toFormat(format as keyof sharp.FormatEnum);

    await fs.mkdir(path.dirname(target), { recursive: true });
    // Written beside the target and renamed, so a half-written file is never served
    const temp = `${target}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
    try {
        await output.toFile(temp);
        await fs.rename(temp, target);
    } catch (error) {
        await fs.rm(temp, { force: true });
        throw error;
    }
};

// Returns the path and type of a resized copy of an upload, making it on first request
export const getVariant = async (fileName: string, originalPath: string, request: VariantRequest) => {
    const source = (await sharp(originalPath).metadata()).format ?? 'jpeg';
    const format = request.webp ? 'webp' : (OUTPUT_TYPES[source] ? source : 'jpeg');
    const { ext, type } = OUTPUT_TYPES[format];
    const name = `${request.fit === 'width' ? 'w' : 'm'}${request.size}-q${request.quality}.${ext}`;
    const target = path.join(variantDir(fileName), name);

    const exists = await fs.access(target).then(() => true, () => false);
    if (!exists) {
        let pending = inFlight.get(target);
        if (!pending) {
            pending = withSlot(() => render(originalPath, target, request, format).then(() => target))
                .finally(() => inFlight.delete(target));
            inFlight.set(target, pending);
        }
        await pending;
    }

    return { path: target, contentType: type };
};

