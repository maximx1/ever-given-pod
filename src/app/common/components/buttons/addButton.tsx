"use client";

import { useState, useEffect } from 'react';
import { resolveApiUrl } from '@/common/helpers/api';
import { useAuth } from '@/app/common/context/AuthContext';
import { useFooterHeight } from '@/app/common/hooks/useFooterHeight';
import { StreamDto } from '@/common/dtos/streamDto';
import { FIELD_LIMITS } from '@/common/limits';
import CharCount from '@/app/common/components/charCount';
import FileDropZone from '@/app/common/components/fileDropZone';

export default function AddButton({ stream, onEpisodeCreated }: { stream?: string | string[]; onEpisodeCreated?: () => void }) {
    const { user } = useAuth(),
        visibleFooterHeight = useFooterHeight(),
        [isOwner, setIsOwner] = useState(false),
        [loading, setLoading] = useState(true),
        [dialogOpen, setDialogOpen] = useState(false),
        [title, setTitle] = useState(''),
        [description, setDescription] = useState(''),
        [author, setAuthor] = useState(''),
        [imageFile, setImageFile] = useState<File | null>(null),
        [imagePreview, setImagePreview] = useState<string | null>(null),
        [audioFile, setAudioFile] = useState<File | null>(null),
        [submitting, setSubmitting] = useState(false),
        [progress, setProgress] = useState(-1);

    useEffect(() => {
        if (!user || !stream) {
            setLoading(false);
            return;
        }

        const checkOwnership = async () => {
            try {
                const res = await fetch(resolveApiUrl(`/${stream}`));
                if (res.ok) {
                    const streamData: StreamDto = await res.json();
                    setIsOwner(streamData.userId === user.id);
                } else {
                    setIsOwner(false);
                }
            } catch {
                setIsOwner(false);
            } finally {
                setLoading(false);
            }
        };

        checkOwnership();
    }, [user, stream]);

    const handleImageSelected = (file: File) => {
        if (!file.type.startsWith('image/')) return;
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const handleAudioSelected = (file: File) => {
        setAudioFile(file);
    };

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setAuthor('');
        setImageFile(null);
        setImagePreview(null);
        setAudioFile(null);
        setProgress(-1);
    };

    const handleSubmit = () => {
        if (!title.trim() || !imageFile || !audioFile || submitting) return;

        setSubmitting(true);
        const formData = new FormData();
        formData.append('image', imageFile);
        formData.append('title', title.trim());
        formData.append('description', description.trim());
        formData.append('file', audioFile);
        formData.append('author', author.trim());

        const xhr = new XMLHttpRequest();
        xhr.open('POST', resolveApiUrl(`/${stream}/podcasts`));

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                setProgress(Math.round((event.loaded / event.total) * 100));
            }
        };

        xhr.onload = () => {
            setSubmitting(false);
            if (xhr.status === 201) {
                resetForm();
                setDialogOpen(false);
                onEpisodeCreated?.();
            } else {
                alert('Error uploading episode.');
            }
        };

        xhr.onerror = () => {
            setSubmitting(false);
            alert('Error uploading episode.');
        };

        xhr.send(formData);
    };

    if (loading || !isOwner) {
        return null;
    }

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
                    onClick={() => { if (!submitting) { setDialogOpen(false); resetForm(); } }}
                >
                    <div
                        className="bg-white rounded-lg shadow-lg p-6 w-[420px] max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-lg font-bold text-gray-800 mb-4">New Episode</h3>
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
                                    placeholder="Episode title"
                                    maxLength={FIELD_LIMITS.title}
                                    className="w-full border border-gray-300 rounded-md p-3 text-sm focus:ring-purple-500 focus:border-purple-500 outline-none"
                                    autoFocus
                                    onKeyDown={(e) => { if (e.key === 'Escape') { setDialogOpen(false); resetForm(); } }}
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
                                    placeholder="Episode description"
                                    maxLength={FIELD_LIMITS.description}
                                    rows={3}
                                    className="w-full border border-gray-300 rounded-md p-3 text-sm focus:ring-purple-500 focus:border-purple-500 outline-none resize-vertical"
                                    onKeyDown={(e) => { if (e.key === 'Escape') { setDialogOpen(false); resetForm(); } }}
                                />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <label className="text-sm font-medium text-gray-700">Author</label>
                                    <CharCount current={author.length} max={FIELD_LIMITS.author} />
                                </div>
                                <input
                                    type="text"
                                    value={author}
                                    onChange={(e) => setAuthor(e.target.value)}
                                    placeholder="Author name"
                                    maxLength={FIELD_LIMITS.author}
                                    className="w-full border border-gray-300 rounded-md p-3 text-sm focus:ring-purple-500 focus:border-purple-500 outline-none"
                                    onKeyDown={(e) => { if (e.key === 'Escape') { setDialogOpen(false); resetForm(); } }}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700 block mb-1">Episode Image</label>
                                <FileDropZone
                                    accept="image/*"
                                    label="Drag & drop an image here"
                                    onFileSelected={handleImageSelected}
                                    previewUrl={imagePreview}
                                    onClear={() => { setImageFile(null); setImagePreview(null); }}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700 block mb-1">Audio File</label>
                                {audioFile ? (
                                    <div className="flex items-center justify-between border border-gray-300 rounded-md p-3 bg-gray-50">
                                        <span className="text-sm text-gray-700 truncate">{audioFile.name}</span>
                                        <button
                                            type="button"
                                            onClick={() => setAudioFile(null)}
                                            className="text-gray-400 hover:text-gray-600 text-lg leading-none ml-2"
                                        >
                                            &times;
                                        </button>
                                    </div>
                                ) : (
                                    <FileDropZone
                                        accept="audio/*"
                                        label="Drag & drop an audio file here"
                                        onFileSelected={handleAudioSelected}
                                    />
                                )}
                            </div>
                        </div>

                        {progress > 0 && progress < 100 && (
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                                <div
                                    className="bg-purple-600 h-2 rounded-full transition-all"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        )}

                        <div className="flex justify-end gap-2 mt-4">
                            <button
                                type="button"
                                onClick={() => { setDialogOpen(false); resetForm(); }}
                                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                                disabled={submitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmit}
                                className="px-4 py-2 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
                                disabled={submitting || !title.trim() || !imageFile || !audioFile}
                            >
                                {submitting ? 'Uploading...' : 'Upload'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}