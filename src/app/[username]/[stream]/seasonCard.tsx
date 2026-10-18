"use client";

import { useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { EpisodeDto } from '@/common/dtos/episodeDto';
import { SeasonDto } from '@/common/dtos/streamDto';
import { resolveApiUrl, resolveAssetUrl } from '@/common/helpers/api';
import { FIELD_LIMITS } from '@/common/limits';
import EditableText from '@/app/common/components/editableText';
import IconExpandTextButton from '@/app/common/components/buttons/iconExpandTextButton';
import ArrowIcon from '@/app/common/components/icons/arrowIcon';
import ChevronRightSvg from '@/icons/chevron-right.svg';
import RemoveCircleSvg from '@/icons/remove-circle.svg';
import TrashSvg from '@/icons/trash.svg';
import EpisodeCard from './episodeCard';
import { isReleased } from '@/common/helpers/schedule';

type SeasonCardProps = {
    season: SeasonDto;
    // Episodes of this season, already in episode order
    episodes: EpisodeDto[];
    canEdit: boolean;
    stream?: string | string[];
    streamImageUrl?: string;
    streamName?: string;
    onChanged: () => void;
    onEpisodeTitleChanged: (episodeId: string, newTitle: string) => void;
};

export default function SeasonCard({
    season,
    episodes,
    canEdit,
    stream,
    streamImageUrl,
    streamName,
    onChanged,
    onEpisodeTitleChanged,
}: SeasonCardProps) {
    const [expanded, setExpanded] = useState(false),
        [deleteOpen, setDeleteOpen] = useState(false),
        [busy, setBusy] = useState(false),
        coverInputRef = useRef<HTMLInputElement>(null);

    // Only the owner is sent episodes that are not released yet
    const scheduledCount = episodes.filter((episode) => !isReleased(episode)).length;
    const podcastFallback = resolveAssetUrl('/icons/podcast.svg');
    const coverSrc = season.imageUrl || episodes[0]?.imageUrl || streamImageUrl || podcastFallback;

    const handleCoverSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file || busy) return;

        setBusy(true);
        let message = '';
        try {
            const formData = new FormData();
            formData.append('seasonId', season.id);
            formData.append('image', file);
            const res = await fetch(resolveApiUrl(`/${stream}/season-image`), { method: 'POST', body: formData });
            if (!res.ok) {
                const data = await res.json().catch(() => null);
                message = data?.error || 'Could not change the season cover.';
            }
        } catch {
            message = 'Could not change the season cover.';
        }
        if (message) toast.error(message);
        setBusy(false);
        onChanged();
    };

    // Sends one change to the API, then reloads the list whether or not it worked
    const send = async (path: string, method: string, body: object, failure: string) => {
        if (busy) return false;
        setBusy(true);
        let ok = false;
        try {
            const res = await fetch(resolveApiUrl(`/${stream}/${path}`), {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            ok = res.ok;
        } catch { /* reported below */ }
        if (!ok) toast.error(failure);
        setBusy(false);
        onChanged();
        return ok;
    };

    const moveWithinSeason = (index: number, offset: -1 | 1) => {
        const episodeIds = episodes.map((e) => e.episodeId);
        const target = index + offset;
        if (target < 0 || target >= episodeIds.length) return;
        [episodeIds[index], episodeIds[target]] = [episodeIds[target], episodeIds[index]];
        send('seasons', 'PATCH', { seasonId: season.id, episodeIds }, 'Could not reorder the season.');
    };

    const removeFromSeason = (episodeId?: string) =>
        send('move-episode', 'PATCH', { episodeId, seasonId: null }, 'Could not remove the episode from the season.');

    const handleDelete = async () => {
        const ok = await send('seasons', 'DELETE', { seasonId: season.id }, 'Could not remove the season.');
        if (ok) setDeleteOpen(false);
    };

    return (
        <div className="shadow-md rounded-sm m-4 mb-1 bg-purple-300">
            <div
                className="flex items-center gap-3 p-3 cursor-pointer"
                onClick={() => setExpanded(!expanded)}
            >
                <img
                    src={coverSrc}
                    alt=""
                    onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (target.src !== podcastFallback) target.src = podcastFallback;
                    }}
                    onClick={canEdit ? (e) => { e.stopPropagation(); coverInputRef.current?.click(); } : undefined}
                    title={canEdit ? 'Change cover' : undefined}
                    className={`w-14 h-14 object-contain flex-shrink-0 ${canEdit ? 'hover:opacity-70' : ''}`}
                />
                {canEdit && (
                    <input
                        ref={coverInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onClick={(e) => e.stopPropagation()}
                        onChange={handleCoverSelected}
                    />
                )}
                <div className="flex-grow min-w-0">
                    <p className="text-xs font-semibold text-purple-800">
                        Season {season.number} &middot; {episodes.length} episode{episodes.length === 1 ? '' : 's'}
                        {scheduledCount > 0 && <> &middot; {scheduledCount} scheduled</>}
                    </p>
                    <div onClick={canEdit ? (e) => e.stopPropagation() : undefined}>
                        <EditableText
                            value={season.title}
                            canEdit={canEdit}
                            maxLength={FIELD_LIMITS.title}
                            tag="h2"
                            className="text-lg font-bold text-gray-800"
                            onSave={(title) => send('seasons', 'PATCH', { seasonId: season.id, title }, 'Could not rename the season.')}
                        />
                    </div>
                </div>
                {canEdit && (
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setDeleteOpen(true); }}
                        className="w-10 h-10 flex-shrink-0 rounded-full border-2 border-red-400 flex items-center justify-center hover:bg-red-100 transition cursor-pointer"
                        title="Remove season"
                    >
                        <TrashSvg className="text-red-500" />
                    </button>
                )}
                <span
                    className={`w-10 h-10 flex-shrink-0 rounded-full border-2 border-purple-500 flex items-center justify-center transition-transform ${expanded ? 'rotate-90' : ''}`}
                    title={expanded ? 'Hide episodes' : 'Show episodes'}
                >
                    <ChevronRightSvg className="text-purple-500" />
                </span>
            </div>

            {expanded && (
                <div className="pb-3">
                    {season.description && (
                        <p className="px-4 pb-1 text-sm text-gray-700 whitespace-pre-wrap">{season.description}</p>
                    )}
                    {episodes.length === 0 && (
                        <p className="px-4 pb-1 text-sm text-gray-600">
                            No episodes yet.{canEdit ? ' Add one from an episode below, or choose this season when uploading.' : ''}
                        </p>
                    )}
                    {episodes.map((episode, index) => (
                        <div key={episode.episodeId} className="flex justify-center">
                            <EpisodeCard
                                episodeId={episode.episodeId}
                                title={episode.title}
                                description={episode.description}
                                uploadDate={episode.uploadDate}
                                releaseDate={episode.releaseDate}
                                url={episode.url}
                                author={episode.author}
                                imageUrl={episode.imageUrl}
                                fallbackImageUrl={streamImageUrl}
                                streamName={streamName}
                                canEdit={canEdit}
                                stream={stream}
                                onTitleChanged={onEpisodeTitleChanged}
                                onScheduleChanged={onChanged}
                                episodeNumber={episode.episodeNumber}
                                splitStatus={episode.splitStatus}
                                splitError={episode.splitError}
                                actions={canEdit && (
                                    <>
                                        <IconExpandTextButton
                                            icon={<ArrowIcon direction="up" />}
                                            iconAlt="Move up"
                                            text="Move up"
                                            className={`mt-4 ${index === 0 ? 'opacity-30 pointer-events-none' : ''}`}
                                            disabled={index === 0 || busy}
                                            onClick={() => moveWithinSeason(index, -1)}
                                        />
                                        <IconExpandTextButton
                                            icon={<ArrowIcon direction="down" />}
                                            iconAlt="Move down"
                                            text="Move down"
                                            className={`mt-4 ${index === episodes.length - 1 ? 'opacity-30 pointer-events-none' : ''}`}
                                            disabled={index === episodes.length - 1 || busy}
                                            onClick={() => moveWithinSeason(index, 1)}
                                        />
                                        <IconExpandTextButton
                                            icon={<RemoveCircleSvg />}
                                            iconAlt="Remove from season"
                                            text="Remove from season"
                                            className="mt-4"
                                            disabled={busy}
                                            onClick={() => removeFromSeason(episode.episodeId)}
                                        />
                                    </>
                                )}
                            />
                        </div>
                    ))}
                </div>
            )}

            {deleteOpen && (
                <div
                    className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                    onClick={() => { if (!busy) setDeleteOpen(false); }}
                >
                    <div
                        className="bg-white rounded-lg shadow-lg p-6 w-[360px]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-lg font-bold text-gray-800 mb-2">Remove Season</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            This removes <strong>{season.title}</strong>.
                            {episodes.length > 0 && ` Its ${episodes.length} episode${episodes.length === 1 ? '' : 's'} will stay in the stream as ungrouped episodes.`}
                            {season.imageUrl && ' The season cover is deleted.'}
                        </p>
                        <div className="flex justify-end gap-2 mt-4">
                            <button
                                type="button"
                                onClick={() => setDeleteOpen(false)}
                                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                                disabled={busy}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleDelete}
                                className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                                disabled={busy}
                            >
                                {busy ? 'Removing...' : 'Remove'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
