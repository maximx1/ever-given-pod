"use client";

import { useRef, useCallback } from 'react';

type LinearProgressProps = {
    currentTime: number;
    duration: number;
    onSeek: (time: number) => void;
    className?: string;
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

export default function LinearProgress({ currentTime, duration, onSeek, className = '' }: LinearProgressProps) {
    const barRef = useRef<HTMLDivElement>(null);
    const draggingRef = useRef(false);

    const fraction = duration > 0 ? Math.min(currentTime / duration, 1) : 0;
    const pct = fraction * 100;

    const seekFromEvent = useCallback((clientX: number) => {
        const bar = barRef.current;
        if (!bar || !duration) return;
        const rect = bar.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        onSeek(ratio * duration);
    }, [duration, onSeek]);

    const onPointerDown = useCallback((e: React.PointerEvent) => {
        draggingRef.current = true;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        seekFromEvent(e.clientX);
    }, [seekFromEvent]);

    const onPointerMove = useCallback((e: React.PointerEvent) => {
        if (!draggingRef.current) return;
        seekFromEvent(e.clientX);
    }, [seekFromEvent]);

    const onPointerUp = useCallback(() => {
        draggingRef.current = false;
    }, []);

    return (
        <div className={`flex items-center gap-2 w-full ${className}`}>
            <div
                ref={barRef}
                className="relative flex-1 h-1.5 bg-gray-500 rounded-full cursor-pointer select-none touch-none"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
            >
                {/* Filled portion */}
                <div
                    className="absolute top-0 left-0 h-full bg-purple-600 rounded-full pointer-events-none"
                    style={{ width: `${pct}%` }}
                />
                {/* Draggable dot */}
                <div
                    className="absolute top-1/2 w-3.5 h-3.5 bg-purple-700 border-2 border-white rounded-full shadow pointer-events-none"
                    style={{ left: `${pct}%`, transform: `translate(-50%, -50%)` }}
                />
            </div>
            <span className="text-xs text-gray-700 whitespace-nowrap select-none">
                {formatTime(currentTime)} / {formatTime(duration)}
            </span>
        </div>
    );
}
