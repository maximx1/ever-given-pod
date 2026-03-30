import path from 'path';
import bcrypt from 'bcrypt';
import { JSONFilePreset } from 'lowdb/node';
import { UserDto } from '../dtos/userDto';
import { EpisodeDto } from '../dtos/episodeDto';
import { StreamDto } from '../dtos/streamDto';

export type DatabaseSchema = {
    users: UserDto[];
    streams: StreamDto[];
};

const defaultData: DatabaseSchema = {
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
export const getEpisodes = async (stream: string) => {
    const s = db.data?.streams.find((s) => s.id === stream);
    return s?.episodes ?? [];
};

export const getRandomEpisodes = async (limit: number = 20) => {
    const allEpisodes = db.data?.streams.flatMap((s) => s.episodes ?? []) ?? [];
    const shuffled = allEpisodes.slice().sort(() => Math.random() - 0.5);
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

export const getStream = async (id: string) => {
    return db.data?.streams.find((stream) => stream.id === id);
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

export const updateStreamImage = async (streamId: string, imageUrl: string) => {
    if (!db.data) return null;

    const stream = db.data.streams.find((s) => s.id === streamId);
    if (!stream) return null;

    stream.imageUrl = imageUrl;
    await queueWrite(async () => {
        await db.write();
    });
    return stream;
};

export const deleteStream = async (streamId: string): Promise<StreamDto | null> => {
    if (!db.data) return null;

    const index = db.data.streams.findIndex((s) => s.id === streamId);
    if (index === -1) return null;

    const [removed] = db.data.streams.splice(index, 1);
    await queueWrite(async () => {
        await db.write();
    });
    return removed;
};