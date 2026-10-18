export type PlaybackPosition = {
    userId: string;
    position: number;
    duration?: number;
};

// Downloads of an episode's audio, one per listener (IP and user agent) per UTC day
export type DownloadStats = {
    total: number;
    // Keyed by UTC date, YYYY-MM-DD
    daily: Record<string, number>;
};

export type EpisodeDto = {
    episodeId?: string;
    streamId?: string;
    imageUrl?: string;
    title?: string;
    description?: string;
    uploadDate: string;
    // Milliseconds since the epoch, like uploadDate. Until then only the owner sees the episode
    releaseDate?: string;
    url?: string;
    author?: string;
    playCount?: number;
    downloads?: DownloadStats;
    playbackPositions?: PlaybackPosition[];
    seasonId?: string;
    episodeNumber?: number;
    // 'pending' while the audio is waiting to be, or being, split into parts
    splitStatus?: 'pending' | 'failed';
    splitError?: string;
};
