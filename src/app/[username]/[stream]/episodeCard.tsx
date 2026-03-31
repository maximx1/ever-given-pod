"use client";

import { EpisodeDto } from '@/common/dtos/episodeDto';
import { useEffect, useRef, useState } from 'react';
import DownloadIconButton from '@/app/common/components/buttons/downloadIconButton';
import LinkIconButton from '@/app/common/components/buttons/linkIconButton';
import EditableText from '@/app/common/components/editableText';
import PlaySvg from '@/icons/play.svg';
import DownloadSvg from '@/icons/download.svg';
import { resolveApiUrl, resolveAssetUrl } from '@/common/helpers/api';
import { FIELD_LIMITS } from '@/common/limits';

type EpisodeCardProps = EpisodeDto & {
    fallbackImageUrl?: string;
    canEdit?: boolean;
    stream?: string | string[];
    onTitleChanged?: (episodeId: string, newTitle: string) => void;
};

export default function EpisodeCard({
    episodeId,
    imageUrl,
    title,
    description,
    uploadDate,
    url,
    author,
    fallbackImageUrl,
    canEdit = false,
    stream,
    onTitleChanged,
}: EpisodeCardProps) {
    const [descriptionExpanded, setDescriptionExpanded] = useState(false),
        [needsExpand, setNeedsExpand] = useState(false),
        descRef = useRef<HTMLDivElement>(null),
        toggleExpand = () => {
            setDescriptionExpanded(!descriptionExpanded);
        };

    useEffect(() => {
        const el = descRef.current;
        if (el) {
            setNeedsExpand(el.scrollHeight > el.clientHeight);
        }
    }, [description]);

    const podcastFallback = resolveAssetUrl('/icons/podcast.svg');
    const imgSrc = imageUrl || fallbackImageUrl || podcastFallback;

    return (
        <div className="w-full min-h-[150px] shadow-md rounded-sm overflow-hidden flex m-4 mb-1 bg-purple-200">
            <div className="w-[150px] h-full max-h-[232px] bg-purple-200 flex-shrink-0 relative">
                <img
                    src={imgSrc}
                    alt={title ?? ''}
                    onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (fallbackImageUrl && target.src !== fallbackImageUrl && target.src !== podcastFallback) {
                            target.src = fallbackImageUrl;
                        } else if (target.src !== podcastFallback) {
                            target.src = podcastFallback;
                        }
                    }}
                    className="object-contain w-full h-full"
                />
            </div>

            <div className="p-4 flex-grow flex flex-col">
                <EditableText
                    value={title ?? ''}
                    canEdit={canEdit}
                    maxLength={FIELD_LIMITS.title}
                    tag="h2"
                    className="text-lg font-bold text-gray-800"
                    onSave={async (newTitle) => {
                        if (!stream || !episodeId) return false;
                        try {
                            const res = await fetch(resolveApiUrl(`/${stream}/rename-episode`), {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ episodeId, title: newTitle }),
                            });
                            if (res.ok) {
                                onTitleChanged?.(episodeId, newTitle);
                                return true;
                            }
                        } catch { /* ignore */ }
                        return false;
                    }}
                />
                <div className="relative">
                    <div ref={descRef} className={`text-sm text-gray-600 overflow-hidden transition-all duration-300 whitespace-pre-wrap ${descriptionExpanded ? 'max-h-full' : 'max-h-[60px]'}`}>
                        {description}
                    </div>
                    {!descriptionExpanded && needsExpand && (
                        <div className="absolute bottom-0 left-0 w-full h-6 bg-gradient-to-t from-purple-200 to-transparent pointer-events-none"></div>
                    )}
                </div>
                {needsExpand && (
                    <button onClick={toggleExpand} className="mt-2 text-center text-blue-500 hover:underline text-sm self-center">
                        {descriptionExpanded ? 'Show Less' : 'Show More'}
                    </button>
                )}
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
                            icon={<PlaySvg width={20} height={20} />}
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
                            icon={<DownloadSvg width={20} height={20} />}
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
