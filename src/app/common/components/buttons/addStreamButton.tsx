"use client";

import { useState } from 'react';
import { useFooterHeight } from '@/app/common/hooks/useFooterHeight';
import { resolveApiUrl } from '@/common/helpers/api';
import { FIELD_LIMITS } from '@/common/limits';
import CharCount from '@/app/common/components/charCount';
import FileDropZone from '@/app/common/components/fileDropZone';

type AddStreamButtonProps = {
    onStreamCreated?: () => void;
};

export default function AddStreamButton({ onStreamCreated }: AddStreamButtonProps) {
    const visibleFooterHeight = useFooterHeight(),
        [dialogOpen, setDialogOpen] = useState(false),
        [title, setTitle] = useState(''),
        [description, setDescription] = useState(''),
        [imageFile, setImageFile] = useState<File | null>(null),
        [imagePreview, setImagePreview] = useState<string | null>(null),
        [submitting, setSubmitting] = useState(false);

    const handleImageSelected = (file: File) => {
        if (!file.type.startsWith('image/')) return;
        setImageFile(file);
        const url = URL.createObjectURL(file);
        setImagePreview(url);
    };

    const clearImage = () => {
        setImageFile(null);
        setImagePreview(null);
    };

    const resetForm = () => {
        setTitle('');
        setDescription('');
        clearImage();
    };

    const handleSubmit = async () => {
        if (!title.trim() || submitting) return;

        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('title', title.trim());
            if (description.trim()) formData.append('description', description.trim());
            if (imageFile) formData.append('image', imageFile);

            const res = await fetch(resolveApiUrl('/streams'), {
                method: 'POST',
                body: formData,
            });

            if (res.ok) {
                resetForm();
                setDialogOpen(false);
                onStreamCreated?.();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to create stream');
            }
        } catch {
            alert('Failed to create stream');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <div
                onClick={() => setDialogOpen(true)}
                style={{ position: 'fixed', bottom: `${16 + visibleFooterHeight}px`, right: '16px' }}
                className="w-16 h-16 z-10 shadow-md rounded-full flex items-center justify-center bg-purple-500 cursor-pointer hover:bg-purple-600 transition-colors"
            >
                <span className="text-3xl font-bold text-white">+</span>
            </div>

            {dialogOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                    onClick={() => { if (!submitting) setDialogOpen(false); }}
                >
                    <div
                        className="bg-white rounded-lg shadow-lg p-6 w-[360px]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-lg font-bold text-gray-800 mb-4">New Stream</h3>
                        <div className="space-y-3">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <label className="text-sm font-medium text-gray-700">Title</label>
                                    <CharCount current={title.length} max={FIELD_LIMITS.streamTitle} />
                                </div>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Stream title"
                                    maxLength={FIELD_LIMITS.streamTitle}
                                    className="w-full border border-gray-300 rounded-md p-3 text-sm focus:ring-purple-500 focus:border-purple-500 outline-none"
                                    autoFocus
                                    onKeyDown={(e) => { if (e.key === 'Escape') setDialogOpen(false); }}
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
                                    placeholder="Stream description (optional)"
                                    maxLength={FIELD_LIMITS.description}
                                    rows={3}
                                    className="w-full border border-gray-300 rounded-md p-3 text-sm focus:ring-purple-500 focus:border-purple-500 outline-none resize-vertical"
                                    onKeyDown={(e) => { if (e.key === 'Escape') setDialogOpen(false); }}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700 block mb-1">Image (optional)</label>
                                <FileDropZone
                                    accept="image/*"
                                    label="Drag & drop an image here"
                                    onFileSelected={handleImageSelected}
                                    previewUrl={imagePreview}
                                    onClear={clearImage}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                            <button
                                type="button"
                                onClick={() => setDialogOpen(false)}
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
            )}
        </>
    );
}
