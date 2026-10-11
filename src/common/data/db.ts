import path from 'path';
import bcrypt from 'bcrypt';
import { JSONFilePreset } from 'lowdb/node';
import { UserDto } from '../dtos/userDto';
import { EpisodeDto } from '../dtos/episodeDto';
import { StreamDto, StreamAccessEntry } from '../dtos/streamDto';

export type DatabaseSchema = {
    schema_version: number;
    users: UserDto[];
    streams: StreamDto[];
};

const SCHEMA_VERSION = 2;

const defaultData: DatabaseSchema = {
    schema_version: SCHEMA_VERSION,
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
            seasonMode: true,
            defaultAddType: 'season',
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

    if (task) {
        await task();
    }

    isWriting = false;

    processQueue();
};

const queueWrite = async (task: () => Promise<void>) => {
    writeQueue.push(task);
    processQueue();
};

export const initDb = async () => {
    await db.read();
    db.data ??= defaultData;

    // Migration logic for schema_version < SCHEMA_VERSION
    if (db.data && db.data.schema_version < SCHEMA_VERSION) {
        await queueWrite(async () => {
            // Migrate streams that don't have seasonMode/defaultAddType
            for (const stream of db.data.streams) {
                if (stream.seasonMode === undefined) {
                    stream.seasonMode = false;
                }
                if (stream.defaultAddType === undefined) {
                    stream.defaultAddType = 'episode';
                }
            }
            // Migrate episodes that don't have season fields
            for (const stream of db.data.streams) {
                if (stream.episodes) {
                    for (const episode of stream.episodes) {
                        if (episode.season === undefined) {
                            episode.season = null;
                        }
                        if (episode.episodeNumber === undefined) {
                            episode.episodeNumber = null;
                        }
                        if (episode.seasonTitle === undefined) {
                            episode.seasonTitle = null;
                        }
                        if (episode.type === undefined) {
                            episode.type = 'episode';
                        }
                    }
                }
            }
            db.data.schema_version = SCHEMA_VERSION;
            await db.write();
        });
    }
};

await queueWrite(async () => {
    await initDb();
});

// ----------------------
// ----- Operations -----
// ----------------------

// Get stream settings
export const getStreamSettings = async (idOrName: string) => {
    const stream = db.data?.streams.find((s) => s.id === idOrName || s.name === idOrName);
    if (!stream) return null;
    return {
        seasonMode: stream.seasonMode ?? false,
        defaultAddType: stream.defaultAddType ?? 'episode',
    };
};

// Update stream settings
export const updateStreamSettings = async (
    idOrName: string,
    updates: { seasonMode?: boolean; defaultAddType?: 'episode' | 'season' }
) => {
    if (!db.data) return null;
    const stream = db.data.streams.find((s) => s.id === idOrName || s.name === idOrName);
    if (!stream) return null;
    if (updates.seasonMode !== undefined) stream.seasonMode = updates.seasonMode;
    if (updates.defaultAddType !== undefined) stream.defaultAddType = updates.defaultAddType;
    await queueWrite(async () => {
        await db.write();
    });
    return { seasonMode: stream.seasonMode, defaultAddType: stream.defaultAddType };
};

// Get episodes grouped by season
export type SeasonGroup = {
    season: number;
    title: string;
    episodes: EpisodeDto[];
};

export type SeasonsResponse = {
    seasonMode: boolean;
    defaultAddType: 'episode' | 'season';
    episodes: EpisodeDto[];
    seasons?: SeasonGroup[];
};

export const getEpisodesGrouped = async (idOrName: string): Promise<SeasonsResponse> => {
    const stream = db.data?.streams.find((s) => s.id === idOrName || s.name === idOrName);
    if (!stream) return { seasonMode: false, defaultAddType: 'episode', episodes: [] };
    
    const seasonMode = stream.seasonMode ?? false;
    const defaultAddType = stream.defaultAddType ?? 'episode';
    
    const episodes = stream.episodes ?? [];
    
    if (!seasonMode) {
        return { seasonMode, defaultAddType, episodes };
    }
    
    // Group episodes by season
    const seasons = new Map<number, EpisodeDto[]>();
    const seasonTitles = new Map<number, string>();
    
    for (const ep of episodes) {
        if (ep.season === null) continue; // Regular episodes, not in a season
        const seasonNum = ep.season;
        if (!seasons.has(seasonNum)) {
            seasons.set(seasonNum, []);
            seasonTitles.set(seasonNum, ep.seasonTitle ?? ep.title ?? `Season ${seasonNum}`);
        }
        seasons.get(seasonNum)!.push(ep);
    }
    
    // Sort each season's episodes by episodeNumber
    for (const [, eps] of seasons) {
        eps.sort((a, b) => (a.episodeNumber ?? 0) - (b.episodeNumber ?? 0));
    }
    
    return {
        seasonMode,
        defaultAddType,
        episodes,
        seasons: Array.from(seasons.entries())
            .sort(([a], [b]) => a - b)
            .map(([seasonNum, seasonEpisodes]) => ({
                season: seasonNum,
                title: seasonTitles.get(seasonNum) ?? `Season ${seasonNum}`,
                episodes: seasonEpisodes,
            })),
    };
};

// Get the next available season number for a stream
export const getNextSeasonNumber = async (idOrName: string): Promise<number> => {
    const stream = db.data?.streams.find((s) => s.id === idOrName || s.name === idOrName);
    if (!stream) return 1;
    const seasons = new Set<number>();
    for (const ep of stream.episodes ?? []) {
        if (ep.season !== null) seasons.add(ep.season);
    }
    return Array.from(seasons).concat(0).sort((a, b) => a - b).find((n) => n === 0) ?? seasons.size + 1;
};

// Get the next available episode number within a season
export const getNextEpisodeNumber = async (streamIdOrName: string, season: number): Promise<number> => {
    const stream = db.data?.streams.find((s) => s.id === streamIdOrName || s.name === streamIdOrName);
    if (!stream) return 1;
    const numbers = stream.episodes
        ?.filter((ep) => ep.season === season && ep.episodeNumber !== null)
        .map((ep) => ep.episodeNumber!);
    if (!numbers || numbers.length === 0) return 1;
    return Math.max(...numbers) + 1;
};

// Delete an episode
export const deleteEpisode = async (streamIdOrName: string, episodeId: string): Promise<EpisodeDto | null> => {
    if (!db.data) return null;
    const stream = db.data.streams.find((s) => s.id === streamIdOrName || s.name === streamIdOrName);
    if (!stream) return null;
    if (!stream.episodes) return null;
    const index = stream.episodes.findIndex((e) => e.episodeId === episodeId);
    if (index === -1) return null;
    const [removed] = stream.episodes.splice(index, 1);
    await queueWrite(async () => {
        await db.write();
    });
    return removed;
};

// Get the stream by ID or name for a given user
export const getStreamByUser = async (userId: string, idOrName: string) => {
    return db.data?.streams.find((s) => s.userId === userId && (s.id === idOrName || s.name === idOrName));
};

// Validate that a stream belongs to a user
export const validateStreamOwnership = async (userId: string, idOrName: string): Promise<boolean> => {
    const stream = db.data?.streams.find((s) => s.userId === userId && (s.id === idOrName || s.name === idOrName));
    return !!stream;
};

export const getEpisodes = async (idOrName: string) => {
    const s = db.data?.streams.find((s) => s.id === idOrName || s.name === idOrName);
    return s?.episodes ?? [];
};

export const getRandomEpisodes = async (limit: number = 20) => {
    const allEpisodes = db.data?.streams
        .filter((s) => !s.isPrivate)
        .flatMap((s) => s.episodes ?? []) ?? [];
    const shuffled = allEpisodes.slice().sort(() => Math.random() - 0.5);
    return shuffled.slice(0, limit);
};

export const getRandomStreams = async (limit: number = 12) => {
    const publicStreams = db.data?.streams.filter((s) => !s.isPrivate) ?? [];
    const shuffled = publicStreams.slice().sort(() => Math.random() - 0.5);
    return shuffled.slice(0, limit);
};

export const publishEpisode = async (episode: EpisodeDto) => {
    await queueWrite(async () => {
        const stream = db.data?.streams.find((s) => s.id === episode.streamId);
        if (stream) {
            if (!stream.episodes) stream.episodes = [];
            stream.episodes.push(episode);
            await db.write();
        }
    });
};

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
        .map(({ ...rest }) => rest);
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
// ---- Type Conversion -
// ----------------------

// Convert a regular episode into a season header
export const convertEpisodeToSeason = async (
    streamIdOrName: string,
    episodeId: string
): Promise<EpisodeDto | null> => {
    if (!db.data) return null;
    const stream = db.data.streams.find((s) => s.id === streamIdOrName || s.name === streamIdOrName);
    if (!stream) return null;
    const episode = stream.episodes?.find((e) => e.episodeId === episodeId);
    if (!episode) return null;
    
    // Get next available season number
    const existingSeasons = new Set<number>();
    for (const ep of stream.episodes ?? []) {
        if (ep.season !== null) existingSeasons.add(ep.season);
    }
    const sortedSeasons = Array.from(existingSeasons).sort((a, b) => a - b);
    const nextSeason = sortedSeasons.find((n) => n === 0) ?? sortedSeasons.length + 1;
    
    // Update episode
    episode.type = 'season';
    episode.season = nextSeason;
    episode.episodeNumber = 1;
    episode.seasonTitle = episode.seasonTitle ?? episode.title ?? `Season ${nextSeason}`;
    
    await queueWrite(async () => { await db.write(); });
    return episode;
};

// Convert a season header back into a regular episode
export const convertSeasonToEpisode = async (
    streamIdOrName: string,
    episodeId: string
): Promise<EpisodeDto | null> => {
    if (!db.data) return null;
    const stream = db.data.streams.find((s) => s.id === streamIdOrName || s.name === streamIdOrName);
    if (!stream) return null;
    const episode = stream.episodes?.find((e) => e.episodeId === episodeId);
    if (!episode) return null;
    
    episode.type = 'episode';
    episode.season = null;
    episode.episodeNumber = null;
    episode.seasonTitle = null;
    
    await queueWrite(async () => { await db.write(); });
    return episode;
};

// Expand a season into multiple standalone episodes
export const expandSeason = async (
    streamIdOrName: string,
    season: number
): Promise<number> => {
    if (!db.data) return 0;
    const stream = db.data.streams.find((s) => s.id === streamIdOrName || s.name === streamIdOrName);
    if (!stream) return 0;
    let count = 0;
    
    for (const episode of stream.episodes ?? []) {
        if (episode.season === season) {
            episode.season = null;
            episode.episodeNumber = null;
            episode.seasonTitle = null;
            count++;
        }
    }
    
    await queueWrite(async () => { await db.write(); });
    return count;
};

// Merge a regular episode into an existing season
export const mergeEpisodeToSeason = async (
    streamIdOrName: string,
    episodeId: string,
    targetSeason: number
): Promise<EpisodeDto | null> => {
    if (!db.data) return null;
    const stream = db.data.streams.find((s) => s.id === streamIdOrName || s.name === streamIdOrName);
    if (!stream) return null;
    const episode = stream.episodes?.find((e) => e.episodeId === episodeId);
    if (!episode) return null;
    
    // Get next available episode number in target season
    const numbers = stream.episodes
        ?.filter((ep) => ep.season === targetSeason && ep.episodeNumber !== null)
        .map((ep) => ep.episodeNumber!) ?? [];
    const nextEpisodeNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
    
    // Get target season title
    const targetSeasonEpisode = stream.episodes?.find((ep) => ep.season === targetSeason);
    const targetSeasonTitle = targetSeasonEpisode?.seasonTitle ?? `Season ${targetSeason}`;
    
    // Update episode
    episode.season = targetSeason;
    episode.episodeNumber = nextEpisodeNumber;
    episode.seasonTitle = targetSeasonTitle;
    episode.type = 'episode';
    
    await queueWrite(async () => { await db.write(); });
    return episode;
};
