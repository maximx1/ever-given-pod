"use client";

import PodcastCard from './podcastCard';
import { useEffect, useState } from 'react';
import { PodcastDto } from '@/common/dtos/podcastDto';
import AddButton from '@/app/common/components/buttons/addButton';
import { resolveApiUrl } from '@/common/helpers/api';

type PodcastListProps = {
    stream?: string | string[];
}

export default function PodcastList({ stream }: PodcastListProps) {
    const [podcastData, setPodcastData] = useState<PodcastDto[]>([]);

    useEffect(() => {
        fetch(resolveApiUrl(`/${stream}/podcasts`))
            .then((res) => res.json())
            .then((data) => setPodcastData(data));
    }, [stream]);

    return (
        <div className="max-w-[800px] mx-auto w-full px-4">
            <AddButton stream={stream} />
            {
                podcastData.map((podcast, index) => (
                    <div key={index} className="flex justify-center">
                        <PodcastCard
                            title={podcast.title}
                            description={podcast.description}
                            uploadDate={podcast.uploadDate}
                            url={podcast.url}
                            author={podcast.author}
                            imageUrl={podcast.imageUrl}
                        />
                    </div>
                ))
            }
        </div>
    );
}