"use client";

import { useEffect, useRef } from 'react';

type ResumeDialogProps = {
    episodeName: string;
    elapsed: number;
    total: number;
    onResume: () => void;
    onRestart: () => void;
    onClose: () => void;
};

function formatTime(seconds: number): string {
    if (!isFinite(seconds) || seconds < 0) return '0s';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const parts: string[] = [];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0 || h > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(' ');
}

export default function ResumeDialog({ episodeName, elapsed, total, onResume, onRestart, onClose }: ResumeDialogProps) {
    const overlayRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    return (
        <div
            ref={overlayRef}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
        >
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
                <h3 className="text-lg font-bold text-gray-800 mb-2 truncate">{episodeName}</h3>
                <p className="text-sm text-gray-600 mb-4">
                    You have a saved position at <span className="font-semibold">{formatTime(elapsed)}</span> / {formatTime(total)}
                </p>
                <div className="flex gap-3">
                    <button
                        onClick={onRestart}
                        className="flex-1 py-2 px-4 rounded bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm font-medium transition-colors cursor-pointer"
                    >
                        Play from beginning
                    </button>
                    <button
                        onClick={onResume}
                        className="flex-1 py-2 px-4 rounded bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium transition-colors cursor-pointer"
                    >
                        Continue {formatTime(elapsed)} / {formatTime(total)}
                    </button>
                </div>
            </div>
        </div>
    );
}
