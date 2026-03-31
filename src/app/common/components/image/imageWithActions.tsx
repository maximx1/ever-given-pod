"use client";

import { useState, useRef, useEffect } from 'react';
import FileDropZone from '@/app/common/components/fileDropZone';

type ImageWithActionsProps = {
    src: string;
    alt: string;
    canEdit?: boolean;
    hasImage?: boolean;
    onUpload?: (file: File, onProgress: (percent: number) => void) => Promise<void>;
};

export default function ImageWithActions({ src, alt, canEdit, hasImage, onUpload }: ImageWithActionsProps) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [viewerOpen, setViewerOpen] = useState(false);
    const [uploadOpen, setUploadOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const uploadRef = useRef<HTMLDivElement>(null);
    const selectedFileRef = useRef<File | null>(null);

    const getResizedUrl = (url: string, max: number) => {
        const [base] = url.split('?');
        return `${base}?max=${max}`;
    };

    const getOriginalUrl = (url: string) => url.split('?')[0];

    const viewerSrc = hasImage ? getResizedUrl(src, 2000) : src;
    const originalSrc = hasImage ? getOriginalUrl(src) : src;

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuOpen && menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
            if (uploadOpen && uploadRef.current && !uploadRef.current.contains(e.target as Node)) {
                closeUploadDialog();
            }
        };
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (viewerOpen) setViewerOpen(false);
                else if (menuOpen) setMenuOpen(false);
                else if (uploadOpen) closeUploadDialog();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [menuOpen, uploadOpen, viewerOpen]);

    const closeUploadDialog = () => {
        setUploadOpen(false);
        setPreviewUrl(null);
        setUploadProgress(0);
        selectedFileRef.current = null;
    };

    const handleImageClick = () => {
        if (!hasImage && canEdit) {
            setUploadOpen(true);
            return;
        }
        if (!hasImage) {
            return;
        }
        if (!canEdit) {
            setViewerOpen(true);
            return;
        }
        setMenuOpen((prev) => !prev);
    };

    const handleViewFullSize = () => {
        setMenuOpen(false);
        setViewerOpen(true);
    };

    const handleUploadClick = () => {
        setMenuOpen(false);
        setUploadOpen(true);
    };

    const handleFileSelected = (file: File) => {
        if (!file.type.startsWith('image/')) return;
        selectedFileRef.current = file;
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
    };

    const handleConfirmUpload = async () => {
        const file = selectedFileRef.current;
        if (!file || !onUpload) return;

        setUploading(true);
        setUploadProgress(0);
        try {
            await onUpload(file, (percent) => setUploadProgress(percent));
        } finally {
            setUploading(false);
            closeUploadDialog();
        }
    };

    return (
        <>
            <div className="relative w-full h-full cursor-pointer" onClick={handleImageClick}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={alt} className="absolute inset-0 w-full h-full object-cover md:object-contain" />
                {uploading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-purple-100/70">
                        <span className="text-sm text-gray-600 mb-2">Uploading... {uploadProgress}%</span>
                        <div className="w-3/4 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-purple-500 rounded-full transition-all duration-200"
                                style={{ width: `${uploadProgress}%` }}
                            />
                        </div>
                    </div>
                )}

                {menuOpen && (
                    <div
                        ref={menuRef}
                        className="absolute z-20 top-2 left-2 bg-white shadow-lg rounded-md border border-gray-200 py-1 min-w-[160px]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {hasImage && (
                            <button
                                onClick={handleViewFullSize}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-purple-100 transition"
                            >
                                View full size
                            </button>
                        )}
                        {canEdit && (
                            <button
                                onClick={handleUploadClick}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-purple-100 transition"
                            >
                                Upload image
                            </button>
                        )}
                    </div>
                )}
            </div>

            {uploadOpen && (
                <div
                    ref={uploadRef}
                    className="absolute z-30 top-2 left-2 bg-white shadow-xl rounded-lg border border-gray-200 w-[280px]"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="p-3 border-b border-gray-100 flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-700">Upload Image</span>
                        <button
                            onClick={closeUploadDialog}
                            className="text-gray-400 hover:text-gray-600 text-lg leading-none"
                        >
                            &times;
                        </button>
                    </div>

                    <div className="m-3">
                        <FileDropZone
                            accept="image/*"
                            label="Drag & drop an image here"
                            onFileSelected={handleFileSelected}
                            previewUrl={previewUrl}
                            onClear={() => {
                                setPreviewUrl(null);
                                selectedFileRef.current = null;
                            }}
                        />
                    </div>

                    {previewUrl && (
                        <div className="px-3 pb-3">
                            {uploading ? (
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center justify-between text-xs text-gray-500">
                                        <span>Uploading...</span>
                                        <span>{uploadProgress}%</span>
                                    </div>
                                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-purple-500 rounded-full transition-all duration-200"
                                            style={{ width: `${uploadProgress}%` }}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="flex justify-end">
                                    <button
                                        onClick={handleConfirmUpload}
                                        className="px-4 py-1.5 rounded-md bg-purple-500 text-white text-sm font-semibold hover:bg-purple-600 transition"
                                    >
                                        Upload
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {viewerOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 cursor-pointer"
                    onClick={() => setViewerOpen(false)}
                >
                    <div
                        className="relative bg-white rounded-md overflow-hidden flex flex-col"
                        style={{ width: '80vh', height: '80vh', maxWidth: '90vw', maxHeight: '90vh' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex-1 relative min-h-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={viewerSrc} alt={alt} className="absolute inset-0 w-full h-full object-contain" />
                        </div>
                        <div className="flex items-center justify-center px-3 py-2 bg-gray-50 border-t border-gray-200">
                            <a
                                href={originalSrc}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-purple-600 hover:text-purple-800 font-medium"
                            >
                                Open in new tab
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
