"use client";

import UploadImage from '@/app/common/components/image/uploadImage';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { StreamDto } from '@/common/dtos/streamDto';
import { resolveApiUrl, resolveAssetUrl } from '@/common/helpers/api';

type DiscoveryGridProps = {
    title?: string;
    subtitle?: string;
};

export default function DiscoveryGrid({
    title = "Not sure what you are looking for?",
    subtitle = "Get started by selecting something of interest:",
}: DiscoveryGridProps) {
    const [streams, setStreams] = useState<(StreamDto & { siteUrl?: string })[]>([]);
    const router = useRouter();

    const handleStreamClick = (stream: StreamDto & { siteUrl?: string }) => {
        if (stream.siteUrl) {
            router.push(stream.siteUrl);
        }
    };

    useEffect(() => {
        fetch(resolveApiUrl('/streams/random?limit=12'))
            .then(res => res.json())
            .then(setStreams)
            .catch(() => setStreams([]));
    }, []);

    if (streams.length === 0) return null;

    return (
        <>
            <div className="w-full flex justify-center mt-8 mb-15">
                <div className="w-[500px] flex flex-col items-center">
                    <h1 className="text-2xl font-bold text-on-page text-center">
                        {title}
                    </h1>
                    <p className="text-sm text-on-page mt-2 text-center">
                        {subtitle}
                    </p>
                </div>
            </div>

            <div className="w-full max-w-[1200px] px-8 mt-8 mb-16 mx-auto">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                    {streams.map(stream => (
                        <button
                            key={stream.id}
                            type='button'
                            onClick={() => handleStreamClick(stream)}
                            className="aspect-square rounded-lg overflow-hidden shadow focus:outline-none focus:ring-2 focus:ring-accent transition"
                            title={stream.title}
                        >
                            <UploadImage
                                src={stream.imageUrl}
                                fallbacks={[resolveAssetUrl('/icons/podcast.svg')]}
                                alt={stream.title ?? ''}
                                width={200}
                                height={200}
                                sizes="(min-width: 1024px) 17vw, (min-width: 768px) 25vw, (min-width: 640px) 33vw, 50vw"
                                className="object-cover w-full h-full"
                            />
                        </button>
                    ))}
                </div>
            </div>
        </>
    );
}
