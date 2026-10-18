"use client";

import EpisodeCard from './episodeCard';
import SeasonCard from './seasonCard';
import { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import { EpisodeDto } from '@/common/dtos/episodeDto';
import { SeasonDto, StreamDto } from '@/common/dtos/streamDto';
import AddButton from '@/app/common/components/buttons/addButton';
import { resolveApiUrl } from '@/common/helpers/api';
import FloatingActions from '@/app/common/components/floatingActions';
import { useAuth } from '@/app/common/context/AuthContext';
import ArrowIcon from '@/app/common/components/icons/arrowIcon';
import { releaseTime } from '@/common/helpers/schedule';

type SortDir = 'desc' | 'asc';

type EpisodeListProps = {
    stream?: string | string[];
    streamImageUrl?: string;
    streamName?: string;
}

const ADD_BTN_SIZE = 64;
const ADD_BTN_OFFSET = 16;
const ARROW_SIZE = Math.round(ADD_BTN_SIZE * 0.6);
const GAP_ABOVE_ADD = 8;
const GAP_BETWEEN_ARROWS = 6;
// Centred over the add button
const ARROW_RIGHT = ADD_BTN_OFFSET + (ADD_BTN_SIZE - ARROW_SIZE) / 2;
const DOWN_BOTTOM = ADD_BTN_OFFSET + ADD_BTN_SIZE + GAP_ABOVE_ADD;
const UP_BOTTOM = DOWN_BOTTOM + ARROW_SIZE + GAP_BETWEEN_ARROWS;

export default function EpisodeList({ stream, streamImageUrl, streamName }: EpisodeListProps) {
    const [episodeData, setEpisodeData] = useState<EpisodeDto[]>([]);
    const [seasons, setSeasons] = useState<SeasonDto[]>([]);
    const [sortDir, setSortDir] = useState<SortDir>('desc');
    const [isOwner, setIsOwner] = useState(false);
    const { user } = useAuth();

    const fetchEpisodes = useCallback(() => {
        fetch(resolveApiUrl(`/${stream}/podcasts`))
            .then((res) => {
                if (!res.ok) return [];
                return res.json();
            })
            .then((data) => setEpisodeData(Array.isArray(data) ? data : []));
        fetch(resolveApiUrl(`/${stream}/seasons`))
            .then((res) => {
                if (!res.ok) return [];
                return res.json();
            })
            .then((data) => setSeasons(Array.isArray(data) ? data : []));
    }, [stream]);

    useEffect(() => {
        fetchEpisodes();
    }, [fetchEpisodes]);

    // A split replaces an episode with its parts in the background, so keep looking until it lands
    const isSplitting = episodeData.some((episode) => episode.splitStatus === 'pending');
    useEffect(() => {
        if (!isSplitting) return;
        const timer = setInterval(fetchEpisodes, 4000);
        return () => clearInterval(timer);
    }, [isSplitting, fetchEpisodes]);

    useEffect(() => {
        if (!user || !stream) { setIsOwner(false); return; }
        fetch(resolveApiUrl(`/${stream}`))
            .then((res) => res.ok ? res.json() : null)
            .then((data: StreamDto | null) => setIsOwner(data?.userId === user.id))
            .catch(() => setIsOwner(false));
    }, [user, stream]);

    const handleEpisodeTitleChanged = (episodeId: string, newTitle: string) => {
        setEpisodeData((prev) => prev.map((ep) =>
            ep.episodeId === episodeId ? { ...ep, title: newTitle } : ep
        ));
    };

    const handleMoveToSeason = async (episodeId: string | undefined, seasonId: string) => {
        try {
            const res = await fetch(resolveApiUrl(`/${stream}/move-episode`), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ episodeId, seasonId }),
            });
            if (!res.ok) toast.error('Could not move the episode.');
        } catch {
            toast.error('Could not move the episode.');
        }
        fetchEpisodes();
    };

    const sorted = [...episodeData].sort((a, b) => {
        const aTime = releaseTime(a);
        const bTime = releaseTime(b);
        return sortDir === 'desc' ? bTime - aTime : aTime - bTime;
    });

    const sortedSeasons = [...seasons].sort((a, b) => sortDir === 'desc' ? b.number - a.number : a.number - b.number);
    const seasonIds = new Set(seasons.map((season) => season.id));
    const ungrouped = sorted.filter((episode) => !episode.seasonId || !seasonIds.has(episode.seasonId));
    const episodesOf = (seasonId: string) => episodeData
        .filter((episode) => episode.seasonId === seasonId)
        .sort((a, b) => (a.episodeNumber ?? 0) - (b.episodeNumber ?? 0));

    return (
        <div className="episode-list relative max-w-[800px] mx-auto w-full px-4">
            {episodeData.length > 1 && (
                <FloatingActions>
                    <button
                        type="button"
                        onClick={() => setSortDir('asc')}
                        style={{ bottom: `${UP_BOTTOM}px`, right: `${ARROW_RIGHT}px` }}
                        className={`absolute cursor-pointer transition-colors ${sortDir === 'asc' ? 'text-purple-500' : 'text-purple-500/50 hover:text-purple-500'}`}
                        title="Oldest first"
                    >
                        <ArrowIcon direction="up" size={ARROW_SIZE} />
                    </button>
                    <button
                        type="button"
                        onClick={() => setSortDir('desc')}
                        style={{ bottom: `${DOWN_BOTTOM}px`, right: `${ARROW_RIGHT}px` }}
                        className={`absolute cursor-pointer transition-colors ${sortDir === 'desc' ? 'text-purple-500' : 'text-purple-500/50 hover:text-purple-500'}`}
                        title="Newest first"
                    >
                        <ArrowIcon direction="down" size={ARROW_SIZE} />
                    </button>
                </FloatingActions>
            )}
            <AddButton stream={stream} onEpisodeCreated={fetchEpisodes} seasons={sortedSeasons} />
            {
                // Empty seasons are only useful to the owner, who can fill them
                sortedSeasons
                    .filter((season) => isOwner || episodesOf(season.id).length > 0)
                    .map((season) => (
                        <SeasonCard
                            key={season.id}
                            season={season}
                            episodes={episodesOf(season.id)}
                            canEdit={isOwner}
                            stream={stream}
                            streamImageUrl={streamImageUrl}
                            streamName={streamName}
                            onChanged={fetchEpisodes}
                            onEpisodeTitleChanged={handleEpisodeTitleChanged}
                        />
                    ))
            }
            {
                ungrouped.map((episode) => (
                    <div key={episode.episodeId} className="flex justify-center">
                        <EpisodeCard
                            episodeId={episode.episodeId}
                            title={episode.title}
                            description={episode.description}
                            uploadDate={episode.uploadDate}
                            releaseDate={episode.releaseDate}
                            url={episode.url}
                            author={episode.author}
                            imageUrl={episode.imageUrl}
                            fallbackImageUrl={streamImageUrl}
                            streamName={streamName}
                            canEdit={isOwner}
                            stream={stream}
                            onTitleChanged={handleEpisodeTitleChanged}
                            onScheduleChanged={fetchEpisodes}
                            splitStatus={episode.splitStatus}
                            splitError={episode.splitError}
                            downloads={episode.downloads}
                            actions={isOwner && episode.splitStatus !== 'pending' && seasons.length > 0 && (
                                <select
                                    value=""
                                    onChange={(e) => handleMoveToSeason(episode.episodeId, e.target.value)}
                                    className="mt-4 max-w-[160px] text-sm bg-transparent border border-purple-400 rounded-sm px-2 py-1.5 text-gray-700 cursor-pointer"
                                    title="Add to a season"
                                >
                                    <option value="" disabled>Add to season...</option>
                                    {sortedSeasons.map((season) => (
                                        <option key={season.id} value={season.id}>{season.title}</option>
                                    ))}
                                </select>
                            )}
                        />
                    </div>
                ))
            }
        </div>
    );
}
