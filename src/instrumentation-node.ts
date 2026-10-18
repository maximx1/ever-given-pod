import { runMigrations } from './common/data/migrations';
import { startUploadSweeper } from './common/helpers/storage';

export const register = async () => {
    await runMigrations();
    startUploadSweeper();
};
