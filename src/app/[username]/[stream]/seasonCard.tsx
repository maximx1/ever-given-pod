"use client";

import { EpisodeDto } from '@/common/dtos/episodeDto';
import { useState } from 'react';
import { resolveApiUrl, resolveAssetUrl } from '@/common/helpers/api';
import EpisodeCard from './episodeCard';
import PodcastSvg from '@/icons/podcast.svg';

type SeasonCardProps = {
    season: number;
    title: string;
    episodes: EpisodeDto[];
    seasonMode: boolean;
    isOwner: boolean;
    stream?: string | string[];
    onTitleChanged?: (season: number, newTitle: string) => void;
    onEpisodeCreated?: () => void;
};

export default function SeasonCard({
    season,
    title,
    episodes,
    seasonMode,
    isOwner,
    stream,
    onTitleChanged,
    onEpisodeCreated,
}: SeasonCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isConvertingToEpisode, setIsConvertingToEpisode] = useState(false);
    const [isExpanding, setIsExpanding] = useState(false);

    const podcastFallback = resolveAssetUrl('/icons/podcast.svg');

    const handleConvertToEpisode = async () => {
        if (!stream) return;
        // Find the first episode in this season to use as the conversion target
        const seasonEpisode = episodes.find(ep => ep.season === season);
        if (!seasonEpisode?.episodeId) return;
        try {
            const res = await fetch(resolveApiUrl(`/${stream}/convert-to-episode`), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ episodeId: seasonEpisode.episodeId }),
            });
            if (res.ok) {
                setIsConvertingToEpisode(true);
                setTimeout(() => {
                    setIsConvertingToEpisode(false);
                    onEpisodeCreated?.();
                }, 1000);
            }
        } catch { /* ignore */ }
    };

    const handleExpandSeason = async () => {
        if (!stream) return;
        try {
            const res = await fetch(resolveApiUrl(`/${stream}/expand-season`), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ season }),
            });
            if (res.ok) {
                setIsExpanding(true);
                setTimeout(() => {
                    setIsExpanding(false);
                    onEpisodeCreated?.();
                }, 1000);
            }
        } catch { /* ignore */ }
    };

    const isConvertableToEpisode = isOwner && seasonMode;
    const isExpandable = isOwner && seasonMode;

    return (
        <div className="w-full shadow-md rounded-sm overflow-hidden m-4 mb-1 bg-purple-200">
            {/* Season Header */}
            <div
                className="flex items-center gap-4 p-4 cursor-pointer hover:bg-purple-300 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                {/* Season Cover */}
                <div className="w-[80px] h-[80px] flex-shrink-0 bg-purple-300 flex items-center justify-center">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 16C9.79 16 8 14.21 8 12C8 9.79 9.79 8 12 8C14.21 8 16 9.79 16 12C16 14.21 14.21 16 12 16ZM12 10C10.9 10 10 10.9 10 12C10 13.1 10.9 14 12 14C13.1 14 14 13.1 14 12C14 10.9 13.1 10 12 10Z" fill="currentColor"/>
                    </svg>
                </div>
                
                {/* Season Info */}
                <div className="flex-grow">
                    <h3 className="text-lg font-bold text-gray-800">Season {season}: {title}</h3>
                    <p className="text-sm text-gray-600">{episodes.length} episode{episodes.length !== 1 ? 's' : ''}</p>
                </div>
                
                {/* Expand/Collapse Chevron */}
                <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    className={`text-purple-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                >
                    <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2" fill="none"/>
                </svg>
            </div>
            
            {/* Season Actions */}
            {isConvertableToEpisode || isExpandable ? (
                <div className="px-4 pb-2 flex gap-2">
                    {isConvertableToEpisode && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsConvertingToEpisode(true);
                            }}
                            className="text-sm text-gray-500 hover:text-purple-600"
                            title="Convert Season to Episode"
                        >
                            ← Episode
                        </button>
                    )}
                    {isExpandable && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsExpanding(true);
                            }}
                            className="text-sm text-gray-500 hover:text-purple-600"
                            title="Expand Season into Episodes"
                        >
                            → Expand
                        </button>
                    )}
                </div>
            ) : null}
            
            {/* Conversion/Expansion Confirmation Overlays */}
            {isConvertingToEpisode && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-purple-200 rounded-lg shadow-xl max-w-sm w-full mx-4 p-6">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Convert Season to Episode</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            This will convert the season header "{title}" back into a regular episode. It will no longer be a season — the other episodes in this season will remain grouped.
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={handleConvertToEpisode}
                                className="bg-purple-600 text-purple-200 px-4 py-2 rounded-sm hover:bg-purple-700"
                            >
                                Convert
                            </button>
                            <button
                                onClick={() => setIsConvertingToEpisode(false)}
                                className="bg-purple-400 text-gray-800 px-4 py-2 rounded-sm hover:bg-purple-500"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {isExpanding && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-purple-200 rounded-lg shadow-xl max-w-sm w-full mx-4 p-6">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">⚠️ Expand Season</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            This will convert <strong>{episodes.length} episodes</strong> from the season "{title}" into standalone episodes. They will each appear individually in the episode list — the season grouping will be removed.
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={handleExpandSeason}
                                className="bg-red-600 text-white px-4 py-2 rounded-sm hover:bg-red-700"
                            >
                                Expand All
                            </button>
                            <button
                                onClick={() => setIsExpanding(false)}
                                className="bg-purple-400 text-gray-800 px-4 py-2 rounded-sm hover:bg-purple-500"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Expanded Episodes */}
            {isExpanded && (
                <div className="border-t border-purple-300">
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {episodes.map((episode) => (
                            <EpisodeCard
                                key={episode.episodeId}
                                episodeId={episode.episodeId}
                                title={episode.title}
                                description={episode.description}
                                uploadDate={episode.uploadDate}
                                url={episode.url}
                                author={episode.author}
                                imageUrl={episode.imageUrl}
                                fallbackImageUrl={undefined}
                                seasonMode={seasonMode}
                                season={episode.season}
                                episodeNumber={episode.episodeNumber}
                                seasonTitle={episode.seasonTitle}
                                type={episode.type}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}