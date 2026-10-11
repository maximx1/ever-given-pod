export type PlaybackPosition = {
    userId: string;
    position: number;
    duration?: number;
};

export type EpisodeDto = {
    episodeId?: string;
    streamId?: string;
    imageUrl?: string;
    title?: string;
    description?: string;
    uploadDate: string;
    url?: string;
    author?: string;
    playCount?: number;
    playbackPositions?: PlaybackPosition[];
    seasonId?: string;
    episodeNumber?: number;
    // 'pending' while the audio is waiting to be, or being, split into parts
    splitStatus?: 'pending' | 'failed';
    splitError?: string;
};
