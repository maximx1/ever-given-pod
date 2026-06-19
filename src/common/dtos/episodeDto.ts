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
};
