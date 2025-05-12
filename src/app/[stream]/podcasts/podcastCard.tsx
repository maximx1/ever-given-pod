"use client";

import Image from 'next/image';
import { PodcastDto } from '../../../common/dtos/podcastDto';
import { useState } from 'react';

export default function PodcastCard({
    imageUrl = "https://placehold.co/400",
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
                <Image unoptimized src={imageUrl} alt={title ?? ''} layout="fill" objectFit="contain" />
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
                    <p>Uploaded: {uploadDate}</p>
                </div>
                <a href={url} target="_blank" rel="noopener noreferrer" className="mt-4 text-blue-500 hover:underline text-sm">
                    Listen Now
                </a>
            </div>
        </div>
    );
}