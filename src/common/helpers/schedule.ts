import { EpisodeDto } from '../dtos/episodeDto';

// When listeners first see the episode: its release date when it was scheduled, else when it was uploaded
export const releaseTime = (episode: Pick<EpisodeDto, 'uploadDate' | 'releaseDate'>) =>
    Number(episode.releaseDate) || Number(episode.uploadDate) || 0;

export const isReleased = (episode: Pick<EpisodeDto, 'uploadDate' | 'releaseDate'>, now = Date.now()) =>
    !episode.releaseDate || releaseTime(episode) <= now;

// Accepts milliseconds since the epoch as a number or numeric string. Blank means "release now".
// Returns undefined for blank, null for anything that is not a usable date.
export const parseReleaseDate = (value: unknown): string | undefined | null => {
    if (value === undefined || value === null || value === '') return undefined;
    const ms = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
    if (!Number.isFinite(ms) || ms <= 0) return null;
    return Math.round(ms).toString();
};

// <input type="datetime-local"> works in the viewer's local time, without seconds
export const toDateTimeInput = (ms: number) => {
    const date = new Date(ms);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

// Blank or unreadable input gives undefined
export const fromDateTimeInput = (value: string) => {
    const ms = value ? new Date(value).getTime() : NaN;
    return Number.isFinite(ms) ? ms : undefined;
};

export const formatReleaseTime = (ms: number) =>
    new Date(ms).toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });
