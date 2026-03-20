import path from 'path';
import bcrypt from 'bcrypt';
import { JSONFilePreset } from 'lowdb/node';
import { UserDto } from '../dtos/userDto';
import { PodcastDto } from '../dtos/podcastDto';
import { StreamDto } from '../dtos/streamDto';

export type DatabaseSchema = {
    users: UserDto[];
    streams: StreamDto[];
    podcasts: PodcastDto[];
};

const defaultData: DatabaseSchema = {
    users: [
        {
            id: '1',
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
        },
    ],
    podcasts: [],
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
export const getPodcasts = async (stream: string) => {
    return db.data?.podcasts.filter((podcast) => podcast.streamId === stream) ?? [];
};

export const getRandomPodcasts = async (limit: number = 20) => {
    const podcasts = db.data?.podcasts ?? [];
    const shuffled = podcasts.slice().sort(() => Math.random() - 0.5);
    return shuffled.slice(0, limit);
};

export const publishPodcast = async (podcast: PodcastDto) => {
    await queueWrite(async () => {
        db.data?.podcasts.push(podcast);
        await db.write();
    });
};

export const getStreams = async () => {
    return db.data?.streams ?? [];
};

export const getStream = async (id: string) => {
    return db.data?.streams.find((stream) => stream.id === id);
};

export const getUserByEmail = async (email: string) => {
    return db.data?.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
};

export const getUserById = async (id: string) => {
    return db.data?.users.find((user) => user.id === id);
};

export const createUser = async (user: UserDto) => {
    if (!db.data) return null;

    const existing = db.data.users.find((u) => u.email?.toLowerCase() === user.email?.toLowerCase());
    if (existing) {
        return null;
    }

    db.data.users.push(user);
    await db.write();
    return user;
};