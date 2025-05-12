"use client";

import PodcastCard from './podcastCard';
import { useEffect, useState } from 'react';
import { PodcastDto } from '../../../common/dtos/podcastDto';
import AddPodcastCard from './addPodcastCard';

type PodcastListProps = {
    stream?: string | string[];
}

export default function PodcastList({ stream }: PodcastListProps) {
    const [podcastData, setPodcastData] = useState<PodcastDto[]>([]);

    useEffect(() => {
        fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/${stream}/podcasts`)
            .then((res) => res.json())
            .then((data) => setPodcastData(data));
    }, [stream]);

    return (
        <div className="max-w-[800px] mx-auto w-full px-4">
            <AddPodcastCard stream={stream}/>
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