import { DownloadStats } from '../dtos/episodeDto';

export const RECENT_DOWNLOAD_DAYS = 7;

// The UTC date a download is filed under, YYYY-MM-DD
export const downloadDay = (time: number = Date.now()) => new Date(time).toISOString().slice(0, 10);

// One stats object for a whole stream
export const sumDownloads = (all: (DownloadStats | undefined)[]): DownloadStats =>
    all.reduce<DownloadStats>((sum, stats) => {
        if (!stats) return sum;
        sum.total += stats.total;
        for (const [day, count] of Object.entries(stats.daily)) {
            sum.daily[day] = (sum.daily[day] ?? 0) + count;
        }
        return sum;
    }, { total: 0, daily: {} });

// Downloads over the last RECENT_DOWNLOAD_DAYS days, today included
export const recentDownloads = (stats?: DownloadStats, now: number = Date.now()) => {
    if (!stats) return 0;
    let count = 0;
    for (let i = 0; i < RECENT_DOWNLOAD_DAYS; i++) {
        count += stats.daily[downloadDay(now - i * 24 * 60 * 60 * 1000)] ?? 0;
    }
    return count;
};
