import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getStream, getStreams, replaceEpisodeWithParts, setEpisodeSplitStatus } from '../data/db';
import { DEFAULT_SPLIT_MINUTES } from '../limits';
import { UPLOADS_DIR } from './paths';
import { deleteUpload } from './storage';

const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';
const FFPROBE = process.env.FFPROBE_PATH || 'ffprobe';

// Containers that need their index moved to the front so apps can start playing while downloading
const MP4_EXTENSIONS = new Set(['.m4a', '.m4b', '.mp4']);

export class FfmpegMissingError extends Error {}

const run = (command: string, args: string[]) =>
    new Promise<string>((resolve, reject) => {
        const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
        let stdout = '';
        let stderr = '';
        child.stdout.on('data', (chunk) => { stdout += chunk; });
        child.stderr.on('data', (chunk) => { stderr = (stderr + chunk).slice(-4000); });
        child.on('error', (error: NodeJS.ErrnoException) => {
            reject(error.code === 'ENOENT' ? new FfmpegMissingError(`${path.basename(command)} is not installed on the server`) : error);
        });
        child.on('close', (code) => {
            if (code === 0) {
                resolve(stdout);
            } else {
                reject(new Error(`${path.basename(command)} failed: ${stderr.trim().split('\n').pop() || `exit code ${code}`}`));
            }
        });
    });

export type AudioProbe = {
    // Seconds
    duration: number;
    chapters: { start: number; title?: string }[];
};

export const probeAudio = async (filePath: string): Promise<AudioProbe> => {
    const output = await run(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-show_chapters', '-of', 'json', filePath]);
    const data = JSON.parse(output);

    const duration = Number(data.format?.duration);
    if (!Number.isFinite(duration) || duration <= 0) {
        throw new Error('Could not read the length of the audio');
    }

    const chapters = ((data.chapters ?? []) as { start_time?: string; tags?: { title?: string } }[])
        .map((chapter) => ({ start: Number(chapter.start_time), title: chapter.tags?.title?.trim() || undefined }))
        .filter((chapter) => Number.isFinite(chapter.start))
        .sort((a, b) => a.start - b.start);

    return { duration, chapters };
};

export type SplitPlan = {
    // Seconds into the audio where each part after the first begins
    cutPoints: number[];
    // One label per part, e.g. "Part 03" or a chapter title
    labels: string[];
};

const numberedLabels = (prefix: string, count: number) => {
    const width = Math.max(2, String(count).length);
    return Array.from({ length: count }, (_, index) => `${prefix} ${String(index + 1).padStart(width, '0')}`);
};

// Returns null when the audio is short enough to stay in one piece.
// Chapter markers win over the clock: with them each chapter becomes a part, however long.
export const planSplit = (probe: AudioProbe, splitMinutes: number): SplitPlan | null => {
    const partSeconds = splitMinutes * 60;
    if (probe.duration <= partSeconds * 1.5) return null;

    const chapterStarts = probe.chapters
        .slice(1)
        .map((chapter) => chapter.start)
        .filter((start, index, starts) => start > 1 && start < probe.duration - 1 && (index === 0 || start > starts[index - 1] + 1));
    if (chapterStarts.length > 0 && chapterStarts.length === probe.chapters.length - 1) {
        const fallback = numberedLabels('Chapter', probe.chapters.length);
        return {
            cutPoints: chapterStarts,
            labels: probe.chapters.map((chapter, index) => chapter.title || fallback[index]),
        };
    }

    // Equal parts, none longer than the configured length
    const count = Math.ceil(probe.duration / partSeconds);
    return {
        cutPoints: Array.from({ length: count - 1 }, (_, index) => ((index + 1) * probe.duration) / count),
        labels: numberedLabels('Part', count),
    };
};

const removeParts = async (uploadDir: string, prefix: string) => {
    const names = await fs.readdir(uploadDir).catch(() => [] as string[]);
    await Promise.all(names.filter((name) => name.startsWith(`${prefix}-`)).map((name) => fs.unlink(path.join(uploadDir, name)).catch(() => {})));
};

// Cuts the audio without re-encoding and returns the new file names, in order
export const splitAudio = async (filePath: string, cutPoints: number[], uploadDir: string): Promise<string[]> => {
    const extension = path.extname(filePath).toLowerCase();
    const prefix = uuidv4();
    const args = [
        '-nostdin', '-v', 'error',
        '-i', filePath,
        '-map', '0:a:0', '-c', 'copy', '-map_chapters', '-1',
        '-f', 'segment',
        '-segment_times', cutPoints.map((seconds) => seconds.toFixed(3)).join(','),
        '-reset_timestamps', '1',
    ];
    if (MP4_EXTENSIONS.has(extension)) {
        args.push('-segment_format_options', 'movflags=+faststart');
    }
    args.push(path.join(uploadDir, `${prefix}-%03d${extension}`));

    try {
        await run(FFMPEG, args);
    } catch (error) {
        await removeParts(uploadDir, prefix);
        throw error;
    }

    const parts = (await fs.readdir(uploadDir)).filter((name) => name.startsWith(`${prefix}-`)).sort();
    if (parts.length < 2) {
        await removeParts(uploadDir, prefix);
        throw new Error('The audio could not be split into parts');
    }
    return parts;
};

// Splits run one at a time, in the background, after the request that asked for them has answered
const globalForSplits = globalThis as typeof globalThis & { splitChain?: Promise<void>; splitsResumed?: boolean };

const runSplit = async (streamId: string, episodeId: string) => {
    const stream = await getStream(streamId);
    const episode = stream?.episodes?.find((e) => e.episodeId === episodeId);
    if (!stream || !episode?.url || episode.splitStatus !== 'pending') return;

    const uploadDir = UPLOADS_DIR;
    const filePath = path.join(uploadDir, episode.url);
    try {
        const plan = planSplit(await probeAudio(filePath), stream.splitMinutes ?? DEFAULT_SPLIT_MINUTES);
        if (!plan) {
            await setEpisodeSplitStatus(streamId, episodeId, undefined);
            return;
        }

        const files = await splitAudio(filePath, plan.cutPoints, uploadDir);
        const labels = files.length === plan.labels.length ? plan.labels : numberedLabels('Part', files.length);
        const title = episode.title || 'Untitled';
        const replaced = await replaceEpisodeWithParts(streamId, episodeId, files.map((url, index) => ({
            url,
            title: `${title} - ${labels[index]}`,
            description: `${index + 1} of ${files.length} · ${title}`,
        })));
        if (!replaced) {
            await Promise.all(files.map((name) => fs.unlink(path.join(uploadDir, name)).catch(() => {})));
            return;
        }

        await fs.unlink(filePath).catch(() => {});
        await deleteUpload(replaced.orphanedImageUrl);
    } catch (error) {
        console.error(`Could not split episode ${episodeId}:`, error);
        await setEpisodeSplitStatus(streamId, episodeId, 'failed', error instanceof Error ? error.message : 'Splitting failed');
    }
};

export const queueSplit = (streamId: string, episodeId: string) => {
    globalForSplits.splitChain = (globalForSplits.splitChain ?? Promise.resolve())
        .then(() => runSplit(streamId, episodeId))
        .catch((error) => console.error('Split job crashed:', error));
};

// Picks up splits that were still waiting or running when the server last stopped
export const resumePendingSplits = async () => {
    if (globalForSplits.splitsResumed) return;
    globalForSplits.splitsResumed = true;

    for (const stream of await getStreams()) {
        for (const episode of stream.episodes ?? []) {
            if (episode.splitStatus === 'pending' && episode.episodeId) {
                queueSplit(stream.id, episode.episodeId);
            }
        }
    }
};
