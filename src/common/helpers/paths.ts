import path from 'path';

// Where the app keeps its state: db.json and the uploads folder. Defaults to the folder the
// app is started from. Set DATA_DIR to keep it somewhere else, such as a Docker volume.
export const DATA_DIR = process.env.DATA_DIR?.trim() ? path.resolve(process.env.DATA_DIR.trim()) : process.cwd();

export const DB_PATH = path.join(DATA_DIR, 'db.json');
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

// Resized copies of uploaded images, one folder per original. Safe to delete at any time:
// everything in it is made again on the next request.
export const IMAGE_CACHE_DIR = path.join(DATA_DIR, 'cache', 'images');
