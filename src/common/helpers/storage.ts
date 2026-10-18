import fs from 'fs/promises';
import path from 'path';
import { DB_PATH, IMAGE_CACHE_DIR, UPLOADS_DIR } from './paths';
import { clearVariants } from './imageCache';

// Deletes an upload together with every resized copy of it
export const deleteUpload = async (fileName?: string) => {
    if (!fileName) return;
    const filePath = path.resolve(UPLOADS_DIR, fileName);
    if (!filePath.startsWith(UPLOADS_DIR + path.sep)) return;
    await fs.unlink(filePath).catch(() => {});
    await clearVariants(fileName);
};

type StoredData = {
    users?: { imageUrl?: string }[];
    streams?: {
        imageUrl?: string;
        seasons?: { imageUrl?: string }[];
        episodes?: { url?: string; imageUrl?: string }[];
    }[];
};

// Every upload the database points at, or null when the database cannot be read. Read from
// the file rather than the app's copy so a sweep always sees what has been saved.
const readReferencedFiles = async (): Promise<Set<string> | null> => {
    try {
        const data = JSON.parse(await fs.readFile(DB_PATH, 'utf8')) as StoredData;
        if (!Array.isArray(data.users) || !Array.isArray(data.streams)) return null;

        const names = new Set<string>();
        const add = (name?: string) => { if (name) names.add(name); };
        data.users.forEach((u) => add(u.imageUrl));
        for (const stream of data.streams) {
            add(stream.imageUrl);
            stream.seasons?.forEach((s) => add(s.imageUrl));
            stream.episodes?.forEach((e) => { add(e.url); add(e.imageUrl); });
        }
        return names;
    } catch {
        return null;
    }
};

// Uploads still being received, split or saved are younger than this and always kept
const SWEEP_GRACE_MS = 24 * 60 * 60 * 1000;
const SWEEP_INTERVAL_MS = 24 * 60 * 60 * 1000;

const isOlderThan = async (filePath: string, ms: number) => {
    const stat = await fs.stat(filePath).catch(() => null);
    return !!stat && Date.now() - stat.mtimeMs > ms;
};

// Removes uploads nothing points at any more, and resized copies whose original is gone
export const sweepOrphanUploads = async () => {
    const referenced = await readReferencedFiles();
    if (!referenced) {
        console.warn('Skipped cleaning up uploads: the database could not be read');
        return;
    }

    let removed = 0;
    const uploads = await fs.readdir(UPLOADS_DIR).catch(() => [] as string[]);
    for (const name of uploads) {
        if (referenced.has(name)) continue;
        const filePath = path.join(UPLOADS_DIR, name);
        if (!await isOlderThan(filePath, SWEEP_GRACE_MS)) continue;
        await deleteUpload(name);
        removed++;
    }

    const kept = new Set(await fs.readdir(UPLOADS_DIR).catch(() => [] as string[]));
    const cached = await fs.readdir(IMAGE_CACHE_DIR).catch(() => [] as string[]);
    for (const name of cached) {
        if (kept.has(name)) continue;
        await clearVariants(name);
        removed++;
    }

    if (removed > 0) console.log(`Cleaned up ${removed} unused upload${removed === 1 ? '' : 's'}`);
};

const globalForSweeper = globalThis as typeof globalThis & { uploadSweeper?: NodeJS.Timeout };

export const startUploadSweeper = () => {
    if (globalForSweeper.uploadSweeper) return;
    const run = () => sweepOrphanUploads().catch((error) => console.error('Could not clean up uploads:', error));
    run();
    globalForSweeper.uploadSweeper = setInterval(run, SWEEP_INTERVAL_MS);
    globalForSweeper.uploadSweeper.unref();
};
