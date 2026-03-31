"use client";

import EpisodeCard from './episodeCard';
import { useEffect, useState } from 'react';
import { EpisodeDto } from '@/common/dtos/episodeDto';
import { StreamDto } from '@/common/dtos/streamDto';
import AddButton from '@/app/common/components/buttons/addButton';
import { resolveApiUrl } from '@/common/helpers/api';
import { useFooterHeight } from '@/app/common/hooks/useFooterHeight';
import { useAuth } from '@/app/common/context/AuthContext';
import ArrowIcon from '@/app/common/components/icons/arrowIcon';

type SortDir = 'desc' | 'asc';

type EpisodeListProps = {
    stream?: string | string[];
    streamImageUrl?: string;
}

const ADD_BTN_SIZE = 64;
const ADD_BTN_OFFSET = 16;
const ARROW_SIZE = Math.round(ADD_BTN_SIZE * 0.6);
const GAP_ABOVE_ADD = 20;
const GAP_BETWEEN_ARROWS = 6;
const ARROW_RIGHT = ADD_BTN_OFFSET + (ADD_BTN_SIZE - ARROW_SIZE) / 2;
const DOWN_BOTTOM = ADD_BTN_OFFSET + ADD_BTN_SIZE + GAP_ABOVE_ADD;
const UP_BOTTOM = DOWN_BOTTOM + ARROW_SIZE + GAP_BETWEEN_ARROWS;

export default function EpisodeList({ stream, streamImageUrl }: EpisodeListProps) {
    const [episodeData, setEpisodeData] = useState<EpisodeDto[]>([]);
    const [sortDir, setSortDir] = useState<SortDir>('desc');
    const [isOwner, setIsOwner] = useState(false);
    const visibleFooterHeight = useFooterHeight();
    const { user } = useAuth();

    const fetchEpisodes = () => {
        fetch(resolveApiUrl(`/${stream}/podcasts`))
            .then((res) => {
                if (!res.ok) return [];
                return res.json();
            })
            .then((data) => setEpisodeData(Array.isArray(data) ? data : []));
    };

    useEffect(() => {
        fetchEpisodes();
    }, [stream]);

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

    const sorted = [...episodeData].sort((a, b) => {
        const aTime = Number(a.uploadDate) || 0;
        const bTime = Number(b.uploadDate) || 0;
        return sortDir === 'desc' ? bTime - aTime : aTime - bTime;
    });

    return (
        <div className="episode-list relative max-w-[800px] mx-auto w-full px-4">
            {episodeData.length > 1 && (
                <>
                    <button
                        type="button"
                        onClick={() => setSortDir('asc')}
                        style={{ position: 'fixed', bottom: `${UP_BOTTOM + visibleFooterHeight}px`, right: `${ARROW_RIGHT}px` }}
                        className={`z-10 cursor-pointer transition-colors ${sortDir === 'asc' ? 'text-purple-500' : 'text-purple-500/50 hover:text-purple-500'}`}
                        title="Oldest first"
                    >
                        <ArrowIcon direction="up" size={ARROW_SIZE} />
                    </button>
                    <button
                        type="button"
                        onClick={() => setSortDir('desc')}
                        style={{ position: 'fixed', bottom: `${DOWN_BOTTOM + visibleFooterHeight}px`, right: `${ARROW_RIGHT}px` }}
                        className={`z-10 cursor-pointer transition-colors ${sortDir === 'desc' ? 'text-purple-500' : 'text-purple-500/50 hover:text-purple-500'}`}
                        title="Newest first"
                    >
                        <ArrowIcon direction="down" size={ARROW_SIZE} />
                    </button>
                </>
            )}
            <AddButton stream={stream} onEpisodeCreated={fetchEpisodes} />
            {
                sorted.map((episode) => (
                    <div key={episode.episodeId} className="flex justify-center">
                        <EpisodeCard
                            episodeId={episode.episodeId}
                            title={episode.title}
                            description={episode.description}
                            uploadDate={episode.uploadDate}
                            url={episode.url}
                            author={episode.author}
                            imageUrl={episode.imageUrl}
                            fallbackImageUrl={streamImageUrl}
                            canEdit={isOwner}
                            stream={stream}
                            onTitleChanged={handleEpisodeTitleChanged}
                        />
                    </div>
                ))
            }
        </div>
    );
}
