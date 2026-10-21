"use client";

import { useState } from 'react';
import UploadImage from '@/app/common/components/image/uploadImage';
import ImageBackdrop from '@/app/common/components/image/imageBackdrop';
import Link from 'next/link';
import { StreamDto } from '@/common/dtos/streamDto';
import { resolveAppUrl, resolveApiUrl, resolveAssetUrl } from '@/common/helpers/api';
import TrashSvg from '@/icons/trash.svg';
import ChevronRightSvg from '@/icons/chevron-right.svg';
import RssSvg from '@/icons/rss.svg';
import FeedLink from '@/app/common/components/feedLink';

type StreamCardProps = StreamDto & {
    username: string;
    feedUrl?: string;
    // The viewer's token for a private stream's feed
    feedToken?: string;
    siteUrl?: string;
    canEdit?: boolean;
    onDeleted?: () => void;
};

export default function StreamCard({
    id,
    username,
    name,
    title,
    description,
    author,
    managingEditor,
    webMaster,
    language,
    categories,
    pubDate,
    ttl,
    imageUrl,
    feedUrl,
    feedToken,
    isPrivate,
    canEdit,
    onDeleted,
}: StreamCardProps) {
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [confirmText, setConfirmText] = useState('');
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        if (confirmText !== 'delete' || deleting) return;
        setDeleting(true);
        try {
            const res = await fetch(resolveApiUrl(`/${id}`), { method: 'DELETE' });
            if (res.ok) {
                setDeleteOpen(false);
                onDeleted?.();
            } else {
                const data = await res.json();
                alert(data.message || 'Failed to delete stream');
            }
        } catch {
            alert('Failed to delete stream');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <>
            {/* The whole card opens the stream: the > link's click area is stretched over it, and
                the other buttons sit above that */}
            <div className="relative w-full min-h-[150px] shadow-card rounded-sm overflow-hidden flex m-4 mb-1 bg-card hover:ring-2 hover:ring-accent focus-within:ring-2 focus-within:ring-accent transition">
                <div className="w-[96px] sm:w-[150px] h-auto max-h-[232px] bg-card flex-shrink-0 relative overflow-hidden">
                    {imageUrl && <ImageBackdrop src={imageUrl} />}
                    <UploadImage src={imageUrl} fallbacks={[resolveAssetUrl('/icons/podcast.svg')]} alt={title ?? ''} fill sizes="150px" className="object-contain" />
                </div>

                <div className="p-4 flex-grow min-w-0 flex flex-col">
                    <h2 className="text-lg font-bold text-ink break-words">{title}</h2>
                    {name && <p className="text-xs text-ink-5">{name}</p>}
                    {description && <p className="text-sm text-ink-3">{description}</p>}

                    <div className="mt-2 text-sm text-ink-4">
                        {author && <p><strong>Author:</strong> {author}</p>}
                        {managingEditor && <p><strong>Managing Editor:</strong> {managingEditor}</p>}
                        {webMaster && <p><strong>Web Master:</strong> {webMaster}</p>}
                        {language && <p><strong>Language:</strong> {language}</p>}
                        {pubDate && <p><strong>Published Date:</strong> {pubDate}</p>}
                        {ttl != null && <p><strong>TTL:</strong> {ttl} minutes</p>}
                    </div>

                    {categories && categories.length > 0 && (
                        <div className="mt-2">
                            <p className="text-sm font-bold text-ink-2">Categories:</p>
                            <ul className="list-disc list-inside text-sm text-ink-3">
                                {categories.map((category, index) => (
                                    <li key={index}>{category}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                {/* Stacked on phones, where a row of them leaves no room for the text */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pr-3 sm:pr-4 flex-shrink-0">
                    {canEdit && (
                        <button
                            onClick={() => setDeleteOpen(true)}
                            className="relative z-10 w-10 h-10 rounded-full border-2 border-red-400 flex items-center justify-center hover:bg-danger-soft transition"
                            title="Delete stream"
                        >
                            <TrashSvg className="text-red-500" />
                        </button>
                    )}
                    <FeedLink
                        streamId={id}
                        feedUrl={feedUrl}
                        isPrivate={isPrivate}
                        feedToken={feedToken}
                        className="relative z-10 w-10 h-10 rounded-full border-2 border-accent flex items-center justify-center hover:bg-card-deep transition"
                        title="RSS feed: click to copy, or open in a new tab"
                    >
                        <RssSvg className="text-accent" />
                    </FeedLink>
                    <Link
                        href={resolveAppUrl(`/${encodeURIComponent(username)}/${encodeURIComponent(name?.trim() || id)}`)}
                        className="w-10 h-10 rounded-full border-2 border-accent flex items-center justify-center after:absolute after:inset-0 after:content-['']"
                        title="View episodes"
                        aria-label={`View episodes of ${title}`}
                    >
                        <ChevronRightSvg className="text-accent" />
                    </Link>
                </div>
            </div>

            {deleteOpen && (
                <div
                    className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                    onClick={() => { if (!deleting) { setDeleteOpen(false); setConfirmText(''); } }}
                >
                    <div
                        className="bg-raised rounded-lg shadow-lg p-6 w-[360px]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-lg font-bold text-ink mb-2">Delete Stream</h3>
                        <p className="text-sm text-ink-3 mb-4">
                            This will permanently delete <strong>{title}</strong> and all its episodes. Type <strong>delete</strong> to confirm.
                        </p>
                        <input
                            type="text"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            placeholder='Type "delete" to confirm'
                            className="w-full border border-line rounded-md p-3 text-sm focus:ring-red-500 focus:border-red-500 outline-none"
                            autoFocus
                            onKeyDown={(e) => { if (e.key === 'Enter') handleDelete(); if (e.key === 'Escape') { setDeleteOpen(false); setConfirmText(''); } }}
                        />
                        <div className="flex justify-end gap-2 mt-4">
                            <button
                                type="button"
                                onClick={() => { setDeleteOpen(false); setConfirmText(''); }}
                                className="px-4 py-2 text-sm text-ink-3 hover:text-ink"
                                disabled={deleting}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleDelete}
                                className="px-4 py-2 text-sm bg-red-600 text-on-accent rounded-md hover:bg-red-700 disabled:opacity-50"
                                disabled={deleting || confirmText !== 'delete'}
                            >
                                {deleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
