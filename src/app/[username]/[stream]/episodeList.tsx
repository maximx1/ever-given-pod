"use client";

import EpisodeCard from './episodeCard';
import { useEffect, useState } from 'react';
import { EpisodeDto } from '@/common/dtos/episodeDto';
import AddButton from '@/app/common/components/buttons/addButton';
import { resolveApiUrl } from '@/common/helpers/api';

type EpisodeListProps = {
    stream?: string | string[];
}

export default function EpisodeList({ stream }: EpisodeListProps) {
    const [episodeData, setEpisodeData] = useState<EpisodeDto[]>([]);

    const fetchEpisodes = () => {
        fetch(resolveApiUrl(`/${stream}/podcasts`))
            .then((res) => res.json())
            .then((data) => setEpisodeData(data));
    };

    useEffect(() => {
        fetchEpisodes();
    }, [stream]);

    return (
        <div className="episode-list relative max-w-[800px] mx-auto w-full px-4">
            <AddButton stream={stream} onEpisodeCreated={fetchEpisodes} />
            {
                episodeData.map((episode) => (
                    <div key={episode.episodeId} className="flex justify-center">
                        <EpisodeCard
                            title={episode.title}
                            description={episode.description}
                            uploadDate={episode.uploadDate}
                            url={episode.url}
                            author={episode.author}
                            imageUrl={episode.imageUrl}
                        />
                    </div>
                ))
            }
        </div>
    );
}
