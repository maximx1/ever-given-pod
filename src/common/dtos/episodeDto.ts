export type PlaybackPosition = {
    userId: string;
    position: number;
    duration?: number;
};

export type SeasonContext = {
    season: number;
    episodeNumber: number;
    seasonTitle: string;
    seasonImageUrl?: string;
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
    season: number | null;
    episodeNumber: number | null;
    seasonTitle: string | null;
    type: 'episode' | 'season';
};

// Type guards
export function isSeason(ep: EpisodeDto): ep is EpisodeDto & { type: 'season' } {
    return ep.type === 'season';
}

export function isEpisode(ep: EpisodeDto): ep is EpisodeDto & { type: 'episode' } {
    return ep.type === 'episode';
}

export function isGroupedEpisode(ep: EpisodeDto): ep is EpisodeDto & { season: number; episodeNumber: number } {
    return ep.season !== null && ep.episodeNumber !== null;
}

export function isRegularEpisode(ep: EpisodeDto): ep is EpisodeDto & { season: null; episodeNumber: null } {
    return ep.season === null && ep.episodeNumber === null;
}
