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
  };