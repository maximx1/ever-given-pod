"use client";

import { useCallback, useRef, useState } from 'react';
import { toast } from 'react-toastify';

type FileDropZoneProps = {
    accept?: string;
    label?: string;
    onFileSelected?: (file: File) => void;
    // With multiple, every accepted file is passed to onFilesSelected instead
    multiple?: boolean;
    onFilesSelected?: (files: File[]) => void;
    previewUrl?: string | null;
    onClear?: () => void;
};

function matchesAccept(file: File, accept?: string): boolean {
    if (!accept) return true;
    return accept.split(',').some(pattern => {
        const p = pattern.trim();
        if (p.endsWith('/*')) return file.type.startsWith(p.replace('/*', '/'));
        return file.type === p;
    });
}

export default function FileDropZone({ accept, label = 'Drag & drop a file here', onFileSelected, multiple = false, onFilesSelected, previewUrl, onClear }: FileDropZoneProps) {
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(false);
    }, []);

    // Returns false when nothing usable was picked
    const selectFiles = useCallback((picked: FileList | null | undefined) => {
        const files = Array.from(picked ?? []);
        if (files.length === 0) return true;

        const expected = accept?.includes('image') ? 'image' : accept?.includes('audio') ? 'audio' : 'valid';
        if (!multiple) {
            if (!matchesAccept(files[0], accept)) {
                toast.error(`Please select an ${expected} file.`);
                return false;
            }
            onFileSelected?.(files[0]);
            return true;
        }

        const accepted = files.filter((file) => matchesAccept(file, accept));
        if (accepted.length < files.length) {
            toast.error(`${files.length - accepted.length} file${files.length - accepted.length === 1 ? ' was' : 's were'} skipped: not ${expected} files.`);
        }
        if (accepted.length === 0) return false;
        onFilesSelected?.(accepted);
        return true;
    }, [accept, multiple, onFileSelected, onFilesSelected]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(false);
        selectFiles(e.dataTransfer.files);
    }, [selectFiles]);

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        selectFiles(e.target.files);
        // Clear the input so picking the same files again still fires a change
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleBrowseClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <>
            <input
                ref={fileInputRef}
                type="file"
                accept={accept}
                multiple={multiple}
                className="hidden"
                onChange={handleFileInputChange}
            />
            <div
                className={`border-2 border-dashed rounded-md flex flex-col items-center justify-center transition-colors cursor-pointer ${
                    dragOver ? 'border-purple-500 bg-purple-50' : 'border-gray-300 bg-gray-50'
                } ${previewUrl ? 'p-2' : 'p-4'}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleBrowseClick}
            >
                {previewUrl ? (
                    <div className="relative w-full">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={previewUrl}
                            alt="Preview"
                            className="max-h-[120px] max-w-full object-contain rounded mx-auto"
                        />
                        {onClear && (
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); onClear(); }}
                                className="absolute top-0 right-0 text-gray-400 hover:text-gray-600 text-lg leading-none bg-white rounded-full w-5 h-5 flex items-center justify-center shadow"
                            >
                                &times;
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <p className="text-sm text-gray-500 mb-1 text-center">{label}</p>
                        <span className="text-sm text-purple-600 font-medium">or browse files</span>
                    </>
                )}
            </div>
        </>
    );
}
