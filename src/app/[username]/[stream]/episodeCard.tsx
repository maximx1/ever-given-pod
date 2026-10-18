"use client";

import { EpisodeDto } from '@/common/dtos/episodeDto';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import DownloadIconButton from '@/app/common/components/buttons/downloadIconButton';
import IconExpandTextButton from '@/app/common/components/buttons/iconExpandTextButton';
import EditableText from '@/app/common/components/editableText';
import PlaySvg from '@/icons/play.svg';
import DownloadSvg from '@/icons/download.svg';
import AddToQueueSvg from '@/icons/add-to-queue.svg';
import { resolveApiUrl, resolveAssetUrl } from '@/common/helpers/api';
import { FIELD_LIMITS } from '@/common/limits';
import { usePlayer } from '@/app/common/context/PlayerContext';
import { formatReleaseTime, fromDateTimeInput, isReleased, releaseTime, toDateTimeInput } from '@/common/helpers/schedule';
import UploadImage from '@/app/common/components/image/uploadImage';
import { RECENT_DOWNLOAD_DAYS, recentDownloads } from '@/common/helpers/downloadStats';

type EpisodeCardProps = EpisodeDto & {
    fallbackImageUrl?: string;
    streamName?: string;
    canEdit?: boolean;
    stream?: string | string[];
    onTitleChanged?: (episodeId: string, newTitle: string) => void;
    // Called after the owner changes the release date
    onScheduleChanged?: () => void;
    actions?: ReactNode;
};

export default function EpisodeCard({
    episodeId,
    imageUrl,
    title,
    description,
    uploadDate,
    releaseDate,
    url,
    author,
    fallbackImageUrl,
    streamName,
    canEdit = false,
    stream,
    onTitleChanged,
    onScheduleChanged,
    episodeNumber,
    splitStatus,
    splitError,
    downloads,
    actions,
}: EpisodeCardProps) {
    const { requestPlayNow, requestAddToQueue } = usePlayer();

    const streamId = typeof stream === 'string' ? stream : Array.isArray(stream) ? stream[0] : '';

    const buildQueueItem = () => ({
        episodeId: episodeId ?? url ?? '',
        title: title ?? 'Untitled',
        streamName: streamName ?? streamId ?? '',
        streamId,
        url: url!,
        imageUrl: imageUrl ?? undefined,
        fallbackImageUrl: fallbackImageUrl ?? undefined,
    });
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

    const [scheduleOpen, setScheduleOpen] = useState(false),
        [scheduleInput, setScheduleInput] = useState(''),
        [scheduleBusy, setScheduleBusy] = useState(false);
    const released = isReleased({ uploadDate, releaseDate });
    const publishedAt = releaseTime({ uploadDate, releaseDate });

    // A blank date releases the episode now
    const saveSchedule = async (value: number | undefined) => {
        if (!stream || !episodeId || scheduleBusy) return;
        setScheduleBusy(true);
        try {
            const res = await fetch(resolveApiUrl(`/${stream}/schedule-episode`), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ episodeId, releaseDate: value ?? null }),
            });
            if (res.ok) {
                setScheduleOpen(false);
                onScheduleChanged?.();
            } else {
                toast.error('Could not change the release date.');
            }
        } catch {
            toast.error('Could not change the release date.');
        }
        setScheduleBusy(false);
    };

    const podcastFallback = resolveAssetUrl('/icons/podcast.svg');
    // The file is replaced by its parts when the split finishes, so it is not offered meanwhile
    const playable = !!url && splitStatus !== 'pending';

    return (
        <div className="w-full min-h-[150px] shadow-md rounded-sm overflow-hidden flex m-4 mb-1 bg-purple-200">
            <div className="w-[150px] h-full max-h-[232px] bg-purple-200 flex-shrink-0 relative">
                <UploadImage
                    src={imageUrl}
                    fallbacks={[fallbackImageUrl, podcastFallback]}
                    alt={title ?? ''}
                    width={150}
                    height={150}
                    className="object-contain w-full h-full"
                />
            </div>

            <div className="p-4 flex-grow flex flex-col">
                {episodeNumber != null && (
                    <span className="text-xs font-semibold text-purple-700">Episode {episodeNumber}</span>
                )}
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
                {splitStatus === 'pending' && (
                    <p className="mt-2 text-sm font-semibold text-purple-700">Splitting into parts...</p>
                )}
                {splitStatus === 'failed' && canEdit && (
                    <p className="mt-2 text-sm text-red-600">Could not split into parts{splitError ? `: ${splitError}` : ''}</p>
                )}
                <div className="mt-2 text-sm text-gray-500">
                    <p>By: {author}</p>
                    {canEdit && downloads && (
                        <p title="Each listener counts once a day; your own listens are not counted">
                            Downloads: {downloads.total} ({recentDownloads(downloads)} in the last {RECENT_DOWNLOAD_DAYS} days)
                        </p>
                    )}
                    {released ? (
                        <p>Released: {publishedAt ?
                            new Date(publishedAt).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric"
                            }) : "Unknown"}</p>
                    ) : (
                        <p className="font-semibold text-purple-700">Scheduled for {formatReleaseTime(publishedAt)}</p>
                    )}
                    {canEdit && !scheduleOpen && (
                        <div className="flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setScheduleInput(toDateTimeInput(released ? Date.now() + 24 * 60 * 60 * 1000 : publishedAt));
                                    setScheduleOpen(true);
                                }}
                                className="text-purple-700 hover:underline"
                            >
                                {released ? 'Schedule' : 'Change date'}
                            </button>
                            {!released && (
                                <button
                                    type="button"
                                    onClick={() => saveSchedule(undefined)}
                                    className="text-purple-700 hover:underline disabled:opacity-50"
                                    disabled={scheduleBusy}
                                >
                                    Release now
                                </button>
                            )}
                        </div>
                    )}
                    {canEdit && scheduleOpen && (
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                            <input
                                type="datetime-local"
                                value={scheduleInput}
                                onChange={(e) => setScheduleInput(e.target.value)}
                                className="border border-purple-400 rounded-sm px-2 py-1 text-sm text-gray-700 bg-white"
                                aria-label="Release date"
                                disabled={scheduleBusy}
                            />
                            <button
                                type="button"
                                onClick={() => saveSchedule(fromDateTimeInput(scheduleInput))}
                                className="px-3 py-1 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
                                disabled={scheduleBusy || fromDateTimeInput(scheduleInput) === undefined}
                            >
                                Save
                            </button>
                            <button
                                type="button"
                                onClick={() => setScheduleOpen(false)}
                                className="px-2 py-1 text-sm text-gray-600 hover:text-gray-800"
                                disabled={scheduleBusy}
                            >
                                Cancel
                            </button>
                        </div>
                    )}
                </div>
                <div className="flex flex-wrap">
                    {playable &&
                        <IconExpandTextButton
                            icon={<PlaySvg />}
                        iconAlt="Play Now"
                        text="Play Now"
                            className="mt-4"
                        onClick={() => requestPlayNow(buildQueueItem())}
                        />
                    }
                    {playable &&
                        <IconExpandTextButton
                            icon={<AddToQueueSvg />}
                            iconAlt="Add to Queue"
                            text="Add to Queue"
                            className="mt-4"
                            onClick={() => requestAddToQueue(buildQueueItem())}
                        />
                    }
                    {playable && url &&
                        <DownloadIconButton
                            href={url}
                            icon={<DownloadSvg />}
                            iconAlt="Download"
                            text="Download"
                            download={`${title}-${url.split('/').pop()}`}
                            className="mt-4"
                            debounceMs={2000}
                        />
                    }
                    {actions && <div className="flex items-center ml-auto">{actions}</div>}
                </div>
            </div>
        </div>
    );
}
