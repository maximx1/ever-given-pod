"use client";

import { StreamDto } from '@/common/dtos/streamDto';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { resolveApiUrl, resolveAssetUrl } from '@/common/helpers/api';
import { useAuth } from '@/app/common/context/AuthContext';
import ImageWithActions from '@/app/common/components/image/imageWithActions';

type StreamSummaryType = {
    stream?: string | string[];
};

export default function StreamSummary({ stream }: StreamSummaryType) {

    const [summaryData, setSummaryData] = useState<StreamDto>(),
        { user } = useAuth(),
        router = useRouter(),
        handleNavigation = (url?: string) => {
            if (url) {
                router.push(url);
            }
        };

    useEffect(() => {
        fetch(resolveApiUrl(`/${stream}`))
            .then((res) => res.json())
            .then((data) => setSummaryData(data));
    }, [stream]);

    if (!summaryData) {
        return <p>Loading...</p>;
    }

    const canEdit = user?.id === summaryData.userId;
    const hasUploadedImage = !!summaryData.imageUrl;
    const displayImage = summaryData.imageUrl ?? resolveAssetUrl('/icons/podcast.svg');

    const handleUpload = async (file: File, onProgress: (percent: number) => void) => {
        const formData = new FormData();
        formData.append('image', file);

        return new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', resolveApiUrl(`/${stream}/upload-image`));

            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    onProgress(Math.round((e.loaded / e.total) * 100));
                }
            };

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    const data = JSON.parse(xhr.responseText);
                    setSummaryData((prev) => prev ? { ...prev, imageUrl: resolveAssetUrl(`/uploads/${data.imageUrl}?max=600`) } : prev);
                    resolve();
                } else {
                    reject(new Error('Upload failed'));
                }
            };

            xhr.onerror = () => reject(new Error('Upload failed'));
            xhr.send(formData);
        });
    };

    return (
        <div className="stream-summary w-full h-auto shadow-md overflow-hidden flex flex-col bg-purple-200">
            <div className="flex flex-col md:flex-row md:items-start">
                <div className="relative w-full h-[150px] md:w-1/3 md:h-[376] bg-purple-200 flex-shrink-0">
                    <ImageWithActions
                        src={displayImage}
                        alt={summaryData.title ?? ''}
                        canEdit={canEdit}
                        hasImage={hasUploadedImage}
                        onUpload={handleUpload}
                    />
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

                    <div className="mt-4 flex justify-start space-x-4">
                        <button
                            onClick={() => handleNavigation(summaryData.feedUrl)}
                            className='bg-purple-400 hover:bg-purple-500 text-sm px-4 py-2 rounded-sm'
                        >
                            RSS Feed
                        </button>
                        <button
                            onClick={() => handleNavigation(summaryData.siteUrl)}
                            className='bg-purple-400 hover:bg-purple-500 text-sm px-4 py-2 rounded-sm'
                        >
                            Visit Site
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
