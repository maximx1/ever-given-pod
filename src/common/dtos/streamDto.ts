import { EpisodeDto } from './episodeDto';

export type StreamDto = {
    id: string;
    userId: string;
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
  };