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
        .map(({ password, email, ...rest }) => rest);
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