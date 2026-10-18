import fs from 'fs/promises';
import path from 'path';
import { DB_PATH, UPLOADS_DIR } from '../helpers/paths';

// Changes to the stored data (db.json and the files beside it) that a new version of the app
// needs. They run once, in order, when the server starts and before it takes any request; the
// database's schema_version records how far it has got. Add a migration by appending one with
// the next version number. Each must be safe to run again if the server stops partway through.
type Migration = {
    version: number;
    description: string;
    up: (data: Record<string, unknown>) => Promise<void> | void;
};

const migrations: Migration[] = [
    {
        version: 2,
        description: 'Resized images moved to cache/images; remove the copies kept beside the originals',
        up: async () => {
            // Named <uuid>.<size>.<ext>, as the old resizer made them
            const legacyVariant = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.\d+\.[^.]+$/i;
            const names = await fs.readdir(UPLOADS_DIR).catch(() => [] as string[]);
            await Promise.all(names
                .filter((name) => legacyVariant.test(name))
                .map((name) => fs.unlink(path.join(UPLOADS_DIR, name)).catch(() => {})));
        },
    },
];

export const LATEST_SCHEMA_VERSION = Math.max(1, ...migrations.map((m) => m.version));

const writeAtomically = async (filePath: string, contents: string) => {
    const temp = `${filePath}.${process.pid}.tmp`;
    await fs.writeFile(temp, contents);
    await fs.rename(temp, filePath);
};

export const runMigrations = async () => {
    const raw = await fs.readFile(DB_PATH, 'utf8').catch(() => null);
    // A new database is created at the latest version and has nothing to migrate
    if (!raw?.trim()) return;

    // Not valid JSON: left alone, and the app refuses to start on it as before
    let data: Record<string, unknown>;
    try {
        data = JSON.parse(raw);
    } catch {
        return;
    }

    const from = typeof data.schema_version === 'number' ? data.schema_version : 1;
    if (from > LATEST_SCHEMA_VERSION) {
        console.warn(`db.json is at schema version ${from}, newer than this app (${LATEST_SCHEMA_VERSION}). Was the app downgraded?`);
        return;
    }

    const pending = migrations.filter((m) => m.version > from).sort((a, b) => a.version - b.version);
    if (pending.length === 0) return;

    const backup = `${DB_PATH}.v${from}.bak`;
    await fs.copyFile(DB_PATH, backup);
    console.log(`Migrating db.json from schema version ${from}; the old copy is at ${backup}`);

    for (const migration of pending) {
        console.log(`  v${migration.version}: ${migration.description}`);
        await migration.up(data);
        data.schema_version = migration.version;
        await writeAtomically(DB_PATH, JSON.stringify(data, null, 2));
    }
};
