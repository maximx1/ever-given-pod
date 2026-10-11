import { EpisodeDto } from './episodeDto';

export type StreamAccessEntry = {
    userId: string;
    feedToken: string;
};

export type StreamDto = {
    id: string;
    userId: string;
    name?: string;
    title?: string;
    description?: string;
    feedUrl?: string;
    siteUrl?: string;
    imageUrl?: string;
    author?: string;
    managingEditor?: string;
    webMaster?: string;
    language?: string;
    categories?: string[];
    pubDate?: string;
    ttl?: number;
    episodes?: EpisodeDto[];
    isPrivate?: boolean;
    accessList?: StreamAccessEntry[];
    seasonMode: boolean;
    defaultAddType: 'episode' | 'season';
};

// Derived type for season card rendering
export type SeasonCardData = {
    season: number;
    title: string;
    episodeCount: number;
    imageUrl?: string;
    episodes: EpisodeDto[];
};

// Settings for a stream
export type StreamSettings = {
    seasonMode: boolean;
    defaultAddType: 'episode' | 'season';
};

// Response type for grouped episode lists
export type GroupedEpisodes = {
    seasonMode: boolean;
    defaultAddType: 'episode' | 'season';
    episodes: EpisodeDto[];
    seasons: SeasonCardData[];
};
