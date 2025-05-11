"use client";

import Image from 'next/image';
import { StreamDto } from '../../../common/dtos/streamDto';
import { useEffect, useState } from 'react';

type PodcastSummaryType = {
    stream?: string | string[];
};

export default function PodcastSummary({ stream }: PodcastSummaryType) {
    const [summaryData, setSummaryData] = useState<StreamDto>();

    useEffect(() => {
        fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/${stream}`)
            .then((res) => res.json())
            .then((data) => setSummaryData(data));
    }, []);

    if (!summaryData) {
        return <p>Loading...</p>;
    }

    return (
        <div className="w-full h-auto shadow-md overflow-hidden flex flex-col bg-purple-200">
            <div className="flex flex-col md:flex-row md:items-start">
                <div className="relative w-full h-[150px] md:w-1/3 md:h-[376] bg-purple-100 flex-shrink-0">
                    <Image unoptimized src={summaryData.imageUrl ?? ''} alt={summaryData.title ?? ''} fill className="rounded-md object-cover" />
                </div>

                <div className="p-4 flex-grow flex flex-col md:ml-4">
                    <h2 className="text-lg font-bold text-gray-800">{summaryData.title}</h2>
                    <p className="text-sm text-gray-600">{summaryData.description}</p>

                    <div className="mt-4 text-sm text-gray-500">
                        <p><strong>Author:</strong> {summaryData.author}</p>
                        <p><strong>Managing Editor:</strong> {summaryData.managingEditor}</p>
                        <p><strong>Web Master:</strong> {summaryData.webMaster}</p>
                        <p><strong>Language:</strong> {summaryData.language}</p>
                        <p><strong>Published Date:</strong> {summaryData.pubDate}</p>
                        <p><strong>TTL:</strong> {summaryData.ttl} minutes</p>
                    </div>

                    <div className="mt-4">
                        <p className="text-sm font-bold text-gray-700">Categories:</p>
                        <ul className="list-disc list-inside text-sm text-gray-600">
                            {summaryData.categories?.map((category, index) => (
                                <li key={index}>{category}</li>
                            ))}
                        </ul>
                    </div>

                    <div className="mt-4">
                        <a
                            href={summaryData.feedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline text-sm block"
                        >
                            View Feed
                        </a>
                        <a
                            href={summaryData.siteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline text-sm block mt-2"
                        >
                            Visit Site
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}