"use client";

import Image from 'next/image';
import { PodcastDto } from '@/common/dtos/podcastDto';
import { useState } from 'react';
import DownloadIconButton from '@/app/common/components/buttons/downloadIconButton';
import LinkIconButton from '@/app/common/components/buttons/linkIconButton';
import { resolveAssetUrl } from '@/common/helpers/api';

export default function PodcastCard({
    imageUrl,
    title,
    description,
    uploadDate,
    url,
    author,
}: PodcastDto) {
    const [descriptionExpanded, setDescriptionExpanded] = useState(false),
        toggleExpand = () => {
            setDescriptionExpanded(!descriptionExpanded);
        };

    return (
        <div className="w-full min-h-[150px] shadow-md rounded-sm overflow-hidden flex m-4 mb-1 bg-purple-200">
            <div className="w-[150px] h-full max-h-[232px] bg-purple-100 flex-shrink-0 relative">
                <Image src={imageUrl ?? resolveAssetUrl('/icons/podcast.svg')} alt={title ?? ''} layout="fill" className="object-contain" />
            </div>

            <div className="p-4 flex-grow flex flex-col">
                <h2 className="text-lg font-bold text-gray-800">{title}</h2>
                <div className="relative">
                    <div className={`text-sm text-gray-600 overflow-hidden transition-all duration-300 whitespace-pre-wrap ${descriptionExpanded ? 'max-h-full' : 'max-h-[60px]'}`}>
                        {description}
                    </div>
                    {!descriptionExpanded && (
                        <div className="absolute bottom-0 left-0 w-full h-6 bg-gradient-to-t from-purple-200 to-transparent pointer-events-none"></div>
                    )}
                </div>
                <button onClick={toggleExpand} className="mt-2 text-center text-blue-500 hover:underline text-sm self-center">
                    {descriptionExpanded ? 'Show Less' : 'Show More'}
                </button>
                <div className="mt-2 text-sm text-gray-500">
                    <p>By: {author}</p>
                    <p>Uploaded: {uploadDate ?
                        new Date(Number(uploadDate)).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric"
                        }) : "Unknown"}</p>
                </div>
                <div className="flex">
                    {url &&
                        <LinkIconButton
                            href={url}
                            iconSrc={resolveAssetUrl('/icons/play.svg')}
                            iconAlt="Listen Now"
                            text="Listen Now"
                            className="mt-4"
                        />
                    }
                    <a href={url} target="_blank" rel="noopener noreferrer" className="mt-4 text-blue-500 hover:underline text-sm">
                        
                    </a>
                    {url &&
                        <DownloadIconButton
                            href={url}
                            iconSrc={resolveAssetUrl('/icons/download.svg')}
                            iconAlt="Download"
                            text="Download"
                            download={`${title}-${url.split('/').pop()}`}
                            className="mt-4"
                            debounceMs={2000}
                        />
                    }
                </div>
            </div>
        </div>
    );
}