export const FIELD_LIMITS = {
    username: 30,
    name: 100,
    email: 254,
    password: 128,
    title: 200,
    description: 7000,
    author: 200,
    streamTitle: 200,
    streamName: 50,
} as const;

export const MAX_IMAGE_SIZE = 30 * 1024 * 1024; // 30 MB

// Length of a part when long audio is split, per stream setting
export const DEFAULT_SPLIT_MINUTES = 60;
export const SPLIT_MINUTES_RANGE = { min: 5, max: 600 } as const;
