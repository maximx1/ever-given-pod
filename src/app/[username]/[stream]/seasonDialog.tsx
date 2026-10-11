"use client";

import { useState } from 'react';
import { toast } from 'react-toastify';
import { resolveApiUrl } from '@/common/helpers/api';
import { FIELD_LIMITS } from '@/common/limits';
import CharCount from '@/app/common/components/charCount';
import FileDropZone from '@/app/common/components/fileDropZone';

type SeasonDialogProps = {
    stream?: string | string[];
    onCreated: () => void;
    onClose: () => void;
};

export default function SeasonDialog({ stream, onCreated, onClose }: SeasonDialogProps) {
    const [title, setTitle] = useState(''),
        [description, setDescription] = useState(''),
        [imageFile, setImageFile] = useState<File | null>(null),
        [imagePreview, setImagePreview] = useState<string | null>(null),
        [submitting, setSubmitting] = useState(false);

    const handleImageSelected = (file: File) => {
        if (!file.type.startsWith('image/')) return;
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const handleSubmit = async () => {
        if (!title.trim() || submitting) return;

        setSubmitting(true);
        try {
            const res = await fetch(resolveApiUrl(`/${stream}/seasons`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: title.trim(), description: description.trim() }),
            });
            if (res.ok) {
                if (imageFile) {
                    const created = await res.json();
                    const formData = new FormData();
                    formData.append('seasonId', created.id);
                    formData.append('image', imageFile);
                    const imageRes = await fetch(resolveApiUrl(`/${stream}/season-image`), { method: 'POST', body: formData });
                    if (!imageRes.ok) toast.error('Season created, but the cover was not saved.');
                }
                onCreated();
                onClose();
                return;
            }
            const data = await res.json().catch(() => null);
            toast.error(data?.message || 'Could not create season.');
        } catch {
            toast.error('Could not create season.');
        }
        setSubmitting(false);
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={() => { if (!submitting) onClose(); }}
        >
            <div
                className="bg-white rounded-lg shadow-lg p-6 w-[420px] max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <h3 className="text-lg font-bold text-gray-800 mb-1">New Season</h3>
                <p className="text-sm text-gray-500 mb-4">A season groups episodes in order: a season of a show, or one book and its parts.</p>
                <div className="space-y-3">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <label className="text-sm font-medium text-gray-700">Title</label>
                            <CharCount current={title.length} max={FIELD_LIMITS.title} />
                        </div>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Season title"
                            maxLength={FIELD_LIMITS.title}
                            className="w-full border border-gray-300 rounded-md p-3 text-sm focus:ring-purple-500 focus:border-purple-500 outline-none"
                            autoFocus
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') onClose(); }}
                        />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <label className="text-sm font-medium text-gray-700">Description</label>
                            <CharCount current={description.length} max={FIELD_LIMITS.description} />
                        </div>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Optional"
                            maxLength={FIELD_LIMITS.description}
                            rows={3}
                            className="w-full border border-gray-300 rounded-md p-3 text-sm focus:ring-purple-500 focus:border-purple-500 outline-none resize-vertical"
                            onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">Cover (optional)</label>
                        <FileDropZone
                            accept="image/*"
                            label="Drag & drop an image here"
                            onFileSelected={handleImageSelected}
                            previewUrl={imagePreview}
                            onClear={() => { setImageFile(null); setImagePreview(null); }}
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-2 mt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                        disabled={submitting}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        className="px-4 py-2 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
                        disabled={submitting || !title.trim()}
                    >
                        {submitting ? 'Creating...' : 'Create'}
                    </button>
                </div>
            </div>
        </div>
    );
}
