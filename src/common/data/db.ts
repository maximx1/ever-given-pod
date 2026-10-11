import path from 'path';
import bcrypt from 'bcrypt';
import { JSONFilePreset } from 'lowdb/node';
import { v4 as uuidv4 } from 'uuid';
import { UserDto } from '../dtos/userDto';
import { EpisodeDto } from '../dtos/episodeDto';
import { StreamDto, StreamAccessEntry, SeasonDto } from '../dtos/streamDto';

export type DatabaseSchema = {
    schema_version: number;
    users: UserDto[];
    streams: StreamDto[];
};

const defaultData: DatabaseSchema = {
    schema_version: 1,
    users: [
        {
            id: '1',
            username: 'sampleuser',
            email: 'sample@example.com',
            password: bcrypt.hashSync('abc123', 10),
            name: 'Sample User',
            creationDate: new Date().toISOString()
        }
    ],
    streams: [
        {
            id: 'f60236c3-81dd-47ba-b0ae-afd9229ac6f2',
            userId: '1',
            name: 'audio_books',
            title: 'Audio Books',
            description: 'Personal repo of audio books',
            author: 'anonymous',
            language: 'en',
            categories: ['audiobooks'],
            episodes: [],
        },
    ],
};
const db = await JSONFilePreset(path.join(process.cwd(), 'db.json'), defaultData)
const writeQueue: (() => Promise<void>)[] = [];
let isWriting = false;

const processQueue = async () => {
    if (isWriting || writeQueue.length === 0) return;

    isWriting = true;
    const task = writeQueue.shift();

    try {
        if (task) {
            await task();
        }
    } catch (error) {
        console.error('Database write failed:', error);
    } finally {
        isWriting = false;
    }

    processQueue();
};

const queueWrite = async (task: () => Promise<void>) => {
    writeQueue.push(task);
    processQueue();
};

export const initDb = async () => {
    await db.read();
    db.data ??= defaultData;
    await db.write();
};

await queueWrite(async () => {
    await initDb();
});

// ----------------------
// ----- Operations -----
// ----------------------
export const getEpisodes = async (idOrName: string) => {
    const s = db.data?.streams.find((s) => s.id === idOrName || s.name === idOrName);
    return s?.episodes ?? [];
};

export const getRandomEpisodes = async (limit: number = 20) => {
    const allEpisodes = db.data?.streams
        .filter((s) => !s.isPrivate)
        .flatMap((s) => s.episodes ?? [])
        .filter((e) => e.splitStatus !== 'pending') ?? [];
    const shuffled = allEpisodes.slice().sort(() => Math.random() - 0.5);
    return shuffled.slice(0, limit);
};

export const getRandomStreams = async (limit: number = 12) => {
    const publicStreams = db.data?.streams.filter((s) => !s.isPrivate) ?? [];
    const shuffled = publicStreams.slice().sort(() => Math.random() - 0.5);
    return shuffled.slice(0, limit);
};

const nextEpisodeNumber = (stream: StreamDto, seasonId: string) => {
    const numbers = (stream.episodes ?? [])
        .filter((e) => e.seasonId === seasonId)
        .map((e) => e.episodeNumber ?? 0);
    return Math.max(0, ...numbers) + 1;
};

// With a seasonId the episode is added to the end of that season
const addEpisode = async (episode: EpisodeDto, seasonId?: string) => {
    const stream = db.data?.streams.find((s) => s.id === episode.streamId);
    if (!stream) return;

    if (!stream.episodes) stream.episodes = [];
    if (seasonId && stream.seasons?.some((s) => s.id === seasonId)) {
        // Feed dates only resolve to the second, so keep each new episode at least a second
        // after the season's latest; apps that sort by date then keep the season in order
        const latest = Math.max(0, ...stream.episodes
            .filter((e) => e.seasonId === seasonId)
            .map((e) => Number(e.uploadDate) || 0));
        if ((Number(episode.uploadDate) || 0) < latest + 1000) {
            episode.uploadDate = (latest + 1000).toString();
        }
        episode.episodeNumber = nextEpisodeNumber(stream, seasonId);
        episode.seasonId = seasonId;
    }
    stream.episodes.push(episode);
    await db.write();
};

// Resolves once the episode is in the stream, not merely queued
export const publishEpisode = (episode: EpisodeDto, seasonId?: string) => new Promise<void>((resolve, reject) => {
    queueWrite(async () => {
        try {
            await addEpisode(episode, seasonId);
            resolve();
        } catch (error) {
            reject(error);
        }
    });
});

export const createStream = async (stream: StreamDto) => {
    await queueWrite(async () => {
        db.data?.streams.push(stream);
        await db.write();
    });
    return stream;
};

export const getStreams = async () => {
    return db.data?.streams ?? [];
};

export const getStreamsByUserId = async (userId: string) => {
    return db.data?.streams.filter((stream) => stream.userId === userId) ?? [];
};

export const getStream = async (idOrName: string) => {
    return db.data?.streams.find((stream) => stream.id === idOrName || stream.name === idOrName);
};

export const getUserByEmail = async (email: string) => {
    return db.data?.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
};

export const getUserByUsername = async (username: string) => {
    return db.data?.users.find((user) => user.username?.toLowerCase() === username.toLowerCase());
};

export const getUserById = async (id: string) => {
    return db.data?.users.find((user) => user.id === id);
};

export const createUser = async (user: UserDto) => {
    if (!db.data) return null;

    const existing = db.data.users.find(
        (u) => u.email?.toLowerCase() === user.email?.toLowerCase() || u.username?.toLowerCase() === user.username?.toLowerCase()
    );
    if (existing) {
        return null;
    }

    db.data.users.push(user);
    await db.write();
    return user;
};

export const updateUserImage = async (userId: string, imageUrl: string) => {
    if (!db.data) return null;

    const user = db.data.users.find((u) => u.id === userId);
    if (!user) return null;

    user.imageUrl = imageUrl;
    await queueWrite(async () => {
        await db.write();
    });
    return user;
};

export const updateStreamImage = async (idOrName: string, imageUrl: string) => {
    if (!db.data) return null;

    const stream = db.data.streams.find((s) => s.id === idOrName || s.name === idOrName);
    if (!stream) return null;

    stream.imageUrl = imageUrl;
    await queueWrite(async () => {
        await db.write();
    });
    return stream;
};

export const deleteStream = async (idOrName: string): Promise<StreamDto | null> => {
    if (!db.data) return null;

    const index = db.data.streams.findIndex((s) => s.id === idOrName || s.name === idOrName);
    if (index === -1) return null;

    const [removed] = db.data.streams.splice(index, 1);
    await queueWrite(async () => {
        await db.write();
    });
    return removed;
};

export const updateStreamPrivacy = async (idOrName: string, isPrivate: boolean) => {
    if (!db.data) return null;

    const stream = db.data.streams.find((s) => s.id === idOrName || s.name === idOrName);
    if (!stream) return null;

    stream.isPrivate = isPrivate;
    if (isPrivate) {
        stream.accessList = stream.accessList ?? [];
    }

    await queueWrite(async () => {
        await db.write();
    });
    return stream;
};

export const addStreamAccess = async (idOrName: string, userId: string, feedToken: string): Promise<StreamAccessEntry | null> => {
    if (!db.data) return null;

    const stream = db.data.streams.find((s) => s.id === idOrName || s.name === idOrName);
    if (!stream || !stream.isPrivate) return null;

    if (!stream.accessList) stream.accessList = [];
    const existing = stream.accessList.find((a) => a.userId === userId);
    if (existing) return existing;

    const entry: StreamAccessEntry = { userId, feedToken };
    stream.accessList.push(entry);
    await queueWrite(async () => {
        await db.write();
    });
    return entry;
};

export const removeStreamAccess = async (idOrName: string, userId: string) => {
    if (!db.data) return null;

    const stream = db.data.streams.find((s) => s.id === idOrName || s.name === idOrName);
    if (!stream) return null;

    if (!stream.accessList) return stream;
    stream.accessList = stream.accessList.filter((a) => a.userId !== userId);
    await queueWrite(async () => {
        await db.write();
    });
    return stream;
};

export const searchUsers = async (query: string, excludeUserId?: string, limit: number = 10) => {
    if (!db.data) return [];
    const q = query.toLowerCase();
    return db.data.users
        .filter((u) => u.id !== excludeUserId)
        .filter((u) =>
            u.username.toLowerCase().includes(q) ||
            (u.email && u.email.toLowerCase().includes(q))
        )
        .slice(0, limit)
        .map(({ id, username, name, imageUrl }) => ({ id, username, name, imageUrl }));
};

export const updateStreamTitle = async (idOrName: string, title: string) => {
    if (!db.data) return null;

    const stream = db.data.streams.find((s) => s.id === idOrName || s.name === idOrName);
    if (!stream) return null;

    stream.title = title;
    await queueWrite(async () => {
        await db.write();
    });
    return stream;
};

export const updateEpisodeTitle = async (streamIdOrName: string, episodeId: string, title: string) => {
    if (!db.data) return null;

    const stream = db.data.streams.find((s) => s.id === streamIdOrName || s.name === streamIdOrName);
    if (!stream) return null;

    const episode = stream.episodes?.find((e) => e.episodeId === episodeId);
    if (!episode) return null;

    episode.title = title;
    await queueWrite(async () => {
        await db.write();
    });
    return episode;
};

export const getStreamByFile = async (filename: string) => {
    return db.data?.streams.find((s) =>
        s.imageUrl === filename ||
        s.seasons?.some((season) => season.imageUrl === filename) ||
        s.episodes?.some((e) => e.url === filename || e.imageUrl === filename)
    );
};

export const getStreamByUsernameAndName = async (username: string, streamName: string) => {
    const user = db.data?.users.find((u) => u.username?.toLowerCase() === username.toLowerCase());
    if (!user) return undefined;
    return db.data?.streams.find((s) => s.userId === user.id && s.name === streamName);
};

export const updatePlaybackPosition = async (streamIdOrName: string, episodeId: string, userId: string, position: number, duration?: number) => {
    await queueWrite(async () => {
        const stream = db.data?.streams.find((s) => s.id === streamIdOrName || s.name === streamIdOrName);
        if (!stream) return;
        const episode = stream.episodes?.find((e) => e.episodeId === episodeId);
        if (!episode) return;
        if (!episode.playbackPositions) episode.playbackPositions = [];
        const existing = episode.playbackPositions.find((p) => p.userId === userId);
        if (existing) {
            existing.position = position;
            if (duration !== undefined) existing.duration = duration;
        } else {
            episode.playbackPositions.push({ userId, position, duration });
        }
        await db.write();
    });
};

export const getPlaybackPosition = async (streamIdOrName: string, episodeId: string, userId: string): Promise<{ position: number; duration?: number } | null> => {
    const stream = db.data?.streams.find((s) => s.id === streamIdOrName || s.name === streamIdOrName);
    if (!stream) return null;
    const episode = stream.episodes?.find((e) => e.episodeId === episodeId);
    if (!episode?.playbackPositions) return null;
    const entry = episode.playbackPositions.find((p) => p.userId === userId);
    if (!entry) return null;
    return { position: entry.position, duration: entry.duration };
};

export const incrementPlayCount = async (streamIdOrName: string, episodeId: string) => {
    await queueWrite(async () => {
        const stream = db.data?.streams.find((s) => s.id === streamIdOrName || s.name === streamIdOrName);
        if (!stream) return;
        const episode = stream.episodes?.find((e) => e.episodeId === episodeId);
        if (!episode) return;
        episode.playCount = (episode.playCount ?? 0) + 1;
        await db.write();
    });
};

// ----------------------
// ------ Seasons -------
// ----------------------

// Keeps a season's episode numbers contiguous (1..n) in their current order
const renumberSeason = (stream: StreamDto, seasonId: string) => {
    (stream.episodes ?? [])
        .filter((e) => e.seasonId === seasonId)
        .sort((a, b) => (a.episodeNumber ?? Number.MAX_SAFE_INTEGER) - (b.episodeNumber ?? Number.MAX_SAFE_INTEGER))
        .forEach((e, index) => {
            e.episodeNumber = index + 1;
        });
};

const nextSeasonNumber = (stream: StreamDto) => Math.max(0, ...(stream.seasons ?? []).map((s) => s.number)) + 1;

export const getSeasons = async (idOrName: string) => {
    const stream = db.data?.streams.find((s) => s.id === idOrName || s.name === idOrName);
    return (stream?.seasons ?? []).slice().sort((a, b) => a.number - b.number);
};

export const createSeason = async (idOrName: string, season: Omit<SeasonDto, 'number'>): Promise<SeasonDto | null> => {
    if (!db.data) return null;

    const stream = db.data.streams.find((s) => s.id === idOrName || s.name === idOrName);
    if (!stream) return null;

    if (!stream.seasons) stream.seasons = [];
    const created: SeasonDto = { ...season, number: nextSeasonNumber(stream) };
    stream.seasons.push(created);
    await queueWrite(async () => {
        await db.write();
    });
    return created;
};

export const updateSeason = async (idOrName: string, seasonId: string, updates: { title?: string; description?: string }) => {
    if (!db.data) return null;

    const stream = db.data.streams.find((s) => s.id === idOrName || s.name === idOrName);
    const season = stream?.seasons?.find((s) => s.id === seasonId);
    if (!season) return null;

    if (updates.title !== undefined) season.title = updates.title;
    if (updates.description !== undefined) season.description = updates.description || undefined;
    await queueWrite(async () => {
        await db.write();
    });
    return season;
};

export const updateSeasonImage = async (idOrName: string, seasonId: string, imageUrl: string) => {
    if (!db.data) return null;

    const stream = db.data.streams.find((s) => s.id === idOrName || s.name === idOrName);
    const season = stream?.seasons?.find((s) => s.id === seasonId);
    if (!season) return null;

    season.imageUrl = imageUrl;
    await queueWrite(async () => {
        await db.write();
    });
    return season;
};

// Removes the season only; its episodes stay in the stream as ungrouped episodes
export const deleteSeason = async (idOrName: string, seasonId: string): Promise<SeasonDto | null> => {
    if (!db.data) return null;

    const stream = db.data.streams.find((s) => s.id === idOrName || s.name === idOrName);
    const index = stream?.seasons?.findIndex((s) => s.id === seasonId) ?? -1;
    if (!stream?.seasons || index === -1) return null;

    const [removed] = stream.seasons.splice(index, 1);
    for (const episode of stream.episodes ?? []) {
        if (episode.seasonId === seasonId) {
            delete episode.seasonId;
            delete episode.episodeNumber;
        }
    }
    await queueWrite(async () => {
        await db.write();
    });
    return removed;
};

// Moves an episode to the end of a season, or out of its season when seasonId is null
export const moveEpisodeToSeason = async (idOrName: string, episodeId: string, seasonId: string | null): Promise<EpisodeDto | null> => {
    if (!db.data) return null;

    const stream = db.data.streams.find((s) => s.id === idOrName || s.name === idOrName);
    const episode = stream?.episodes?.find((e) => e.episodeId === episodeId);
    if (!stream || !episode) return null;
    if (seasonId && !stream.seasons?.some((s) => s.id === seasonId)) return null;

    const previousSeasonId = episode.seasonId;
    if (previousSeasonId === (seasonId ?? undefined)) return episode;

    if (seasonId) {
        episode.episodeNumber = nextEpisodeNumber(stream, seasonId);
        episode.seasonId = seasonId;
    } else {
        delete episode.seasonId;
        delete episode.episodeNumber;
    }
    if (previousSeasonId) renumberSeason(stream, previousSeasonId);

    await queueWrite(async () => {
        await db.write();
    });
    return episode;
};

// episodeIds must list every episode of the season exactly once, in the wanted order
export const reorderSeason = async (idOrName: string, seasonId: string, episodeIds: string[]): Promise<EpisodeDto[] | null> => {
    if (!db.data) return null;

    const stream = db.data.streams.find((s) => s.id === idOrName || s.name === idOrName);
    if (!stream?.seasons?.some((s) => s.id === seasonId)) return null;

    const members = (stream.episodes ?? []).filter((e) => e.seasonId === seasonId);
    const isSameSet = members.length === episodeIds.length
        && new Set(episodeIds).size === episodeIds.length
        && members.every((e) => !!e.episodeId && episodeIds.includes(e.episodeId));
    if (!isSameSet) return null;

    for (const episode of members) {
        episode.episodeNumber = episodeIds.indexOf(episode.episodeId!) + 1;
    }
    await queueWrite(async () => {
        await db.write();
    });
    return members.sort((a, b) => (a.episodeNumber ?? 0) - (b.episodeNumber ?? 0));
};

// ----------------------
// ------ Splitting -----
// ----------------------

export const updateStreamSettings = async (idOrName: string, updates: { autoSplit?: boolean; splitMinutes?: number }) => {
    if (!db.data) return null;

    const stream = db.data.streams.find((s) => s.id === idOrName || s.name === idOrName);
    if (!stream) return null;

    if (updates.autoSplit !== undefined) stream.autoSplit = updates.autoSplit;
    if (updates.splitMinutes !== undefined) stream.splitMinutes = updates.splitMinutes;
    await queueWrite(async () => {
        await db.write();
    });
    return stream;
};

export const setEpisodeSplitStatus = async (idOrName: string, episodeId: string, status: EpisodeDto['splitStatus'], error?: string) => {
    if (!db.data) return null;

    const stream = db.data.streams.find((s) => s.id === idOrName || s.name === idOrName);
    const episode = stream?.episodes?.find((e) => e.episodeId === episodeId);
    if (!episode) return null;

    if (status) {
        episode.splitStatus = status;
    } else {
        delete episode.splitStatus;
    }
    if (error) {
        episode.splitError = error;
    } else {
        delete episode.splitError;
    }
    await queueWrite(async () => {
        await db.write();
    });
    return episode;
};

export type SplitPart = { url: string; title: string; description: string };

// Swaps an episode for the parts it was split into. Outside a season, the parts get a new season
// that takes over the episode's title, description and image. Returns the removed episode, plus
// its image when no season could adopt it.
export const replaceEpisodeWithParts = async (idOrName: string, episodeId: string, parts: SplitPart[]) => {
    if (!db.data) return null;

    const stream = db.data.streams.find((s) => s.id === idOrName || s.name === idOrName);
    const index = stream?.episodes?.findIndex((e) => e.episodeId === episodeId) ?? -1;
    if (!stream?.episodes || index === -1) return null;

    const original = stream.episodes[index];
    let orphanedImageUrl: string | undefined;
    let season = stream.seasons?.find((s) => s.id === original.seasonId);
    if (!season) {
        season = {
            id: uuidv4(),
            number: nextSeasonNumber(stream),
            title: original.title || 'Untitled',
            description: original.description || undefined,
            imageUrl: original.imageUrl,
        };
        if (!stream.seasons) stream.seasons = [];
        stream.seasons.push(season);
    } else if (original.imageUrl && !season.imageUrl) {
        season.imageUrl = original.imageUrl;
    } else {
        orphanedImageUrl = original.imageUrl;
    }

    const seasonId = season.id;
    const firstNumber = original.episodeNumber ?? 0;
    const firstDate = Number(original.uploadDate) || Date.now();
    const partEpisodes: EpisodeDto[] = parts.map((part, partIndex) => ({
        episodeId: uuidv4(),
        streamId: stream.id,
        title: part.title,
        description: part.description,
        author: original.author,
        url: part.url,
        // A second apart so feed dates keep the parts in order
        uploadDate: (firstDate + partIndex * 1000).toString(),
        seasonId,
        // Fractions slot the parts in where the original sat; renumbering makes them whole again
        episodeNumber: firstNumber + (partIndex + 1) / (parts.length + 1),
    }));
    stream.episodes.splice(index, 1, ...partEpisodes);
    renumberSeason(stream, seasonId);

    await queueWrite(async () => {
        await db.write();
    });
    return { original, orphanedImageUrl };
};
