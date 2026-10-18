import { EpisodeDto } from './episodeDto';

export type StreamAccessEntry = {
    userId: string;
    feedToken: string;
};

// A season groups episodes into an ordered set: a show's season, or one book and its parts
export type SeasonDto = {
    id: string;
    number: number;
    title: string;
    description?: string;
    // Cover shared by the season's episodes that have no image of their own
    imageUrl?: string;
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
    seasons?: SeasonDto[];
    // Long uploads are split into parts unless this is false
    autoSplit?: boolean;
    // Longest a part may be; defaults to DEFAULT_SPLIT_MINUTES
    splitMinutes?: number;
    isPrivate?: boolean;
    accessList?: StreamAccessEntry[];
  };