"use client";

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { StreamDto } from '@/common/dtos/streamDto';
import { resolveAppUrl, resolveApiUrl, resolveAssetUrl } from '@/common/helpers/api';

type StreamCardProps = StreamDto & {
    username: string;
    feedUrl?: string;
    siteUrl?: string;
    canEdit?: boolean;
    onDeleted?: () => void;
};

export default function StreamCard({
    id,
    username,
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
            <div className="w-full min-h-[150px] shadow-md rounded-sm overflow-hidden flex m-4 mb-1 bg-purple-200">
                <div className="w-[150px] h-full max-h-[232px] bg-purple-200 flex-shrink-0 relative">
                    <Image src={imageUrl ?? resolveAssetUrl('/icons/podcast.svg')} alt={title ?? ''} layout="fill" className="object-contain" />
                </div>

                <div className="p-4 flex-grow flex flex-col">
                    <h2 className="text-lg font-bold text-gray-800">{title}</h2>
                    {description && <p className="text-sm text-gray-600">{description}</p>}

                    <div className="mt-2 text-sm text-gray-500">
                        {author && <p><strong>Author:</strong> {author}</p>}
                        {managingEditor && <p><strong>Managing Editor:</strong> {managingEditor}</p>}
                        {webMaster && <p><strong>Web Master:</strong> {webMaster}</p>}
                        {language && <p><strong>Language:</strong> {language}</p>}
                        {pubDate && <p><strong>Published Date:</strong> {pubDate}</p>}
                        {ttl != null && <p><strong>TTL:</strong> {ttl} minutes</p>}
                    </div>

                    {categories && categories.length > 0 && (
                        <div className="mt-2">
                            <p className="text-sm font-bold text-gray-700">Categories:</p>
                            <ul className="list-disc list-inside text-sm text-gray-600">
                                {categories.map((category, index) => (
                                    <li key={index}>{category}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 pr-4">
                    {canEdit && (
                        <button
                            onClick={() => setDeleteOpen(true)}
                            className="w-10 h-10 rounded-full border-2 border-red-400 flex items-center justify-center hover:bg-red-100 transition"
                            title="Delete stream"
                        >
                            <Image src={resolveAssetUrl('/icons/trash.svg')} alt="Delete" width={18} height={18} className="[filter:invert(27%)_sepia(80%)_saturate(2000%)_hue-rotate(340deg)_brightness(80%)_contrast(95%)]" />
                        </button>
                    )}
                    <Link
                        href={resolveAppUrl(`/${username}/${id}`)}
                        className="w-10 h-10 rounded-full border-2 border-purple-500 flex items-center justify-center hover:bg-purple-300 transition"
                        title="View episodes"
                    >
                        <Image src={resolveAssetUrl('/icons/chevron-right.svg')} alt="View episodes" width={20} height={20} className="[filter:invert(27%)_sepia(60%)_saturate(1700%)_hue-rotate(245deg)_brightness(92%)_contrast(89%)]" />
                    </Link>
                </div>
            </div>

            {deleteOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                    onClick={() => { if (!deleting) { setDeleteOpen(false); setConfirmText(''); } }}
                >
                    <div
                        className="bg-white rounded-lg shadow-lg p-6 w-[360px]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-lg font-bold text-gray-800 mb-2">Delete Stream</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            This will permanently delete <strong>{title}</strong> and all its episodes. Type <strong>delete</strong> to confirm.
                        </p>
                        <input
                            type="text"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            placeholder='Type "delete" to confirm'
                            className="w-full border border-gray-300 rounded-md p-3 text-sm focus:ring-red-500 focus:border-red-500 outline-none"
                            autoFocus
                            onKeyDown={(e) => { if (e.key === 'Enter') handleDelete(); if (e.key === 'Escape') { setDeleteOpen(false); setConfirmText(''); } }}
                        />
                        <div className="flex justify-end gap-2 mt-4">
                            <button
                                type="button"
                                onClick={() => { setDeleteOpen(false); setConfirmText(''); }}
                                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                                disabled={deleting}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleDelete}
                                className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
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
