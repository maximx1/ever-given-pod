"use client";

import { useRef, useCallback, useEffect, useState } from 'react';

type CircularProgressProps = {
    currentTime: number;
    duration: number;
    onSeek: (time: number) => void;
    size?: number;
    strokeWidth?: number;
    className?: string;
};

function formatCompact(seconds: number): string {
    if (!isFinite(seconds) || seconds < 0) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
}

// The gap at the top of the ring, where the episode starts and ends, in radians
const GAP_ANGLE = (30 * Math.PI) / 180;
// Where the listener's choice of total or remaining time is kept
const TIME_DISPLAY_KEY = 'playerTimeDisplay';

export default function CircularProgress({
    currentTime,
    duration,
    onSeek,
    size = 40,
    strokeWidth = 4,
    className = '',
}: CircularProgressProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const draggingRef = useRef(false);
    // The lower number shows the episode's length, or the time left in it
    const [showRemaining, setShowRemaining] = useState(false);

    useEffect(() => {
        try {
            setShowRemaining(localStorage.getItem(TIME_DISPLAY_KEY) === 'remaining');
        } catch { /* storage blocked: keep the default */ }
    }, []);

    const toggleTimeDisplay = useCallback(() => {
        setShowRemaining((prev) => {
            try {
                localStorage.setItem(TIME_DISPLAY_KEY, prev ? 'total' : 'remaining');
            } catch { /* storage blocked: the choice lasts until reload */ }
            return !prev;
        });
    }, []);

    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const center = size / 2;

    const gapAngle = GAP_ANGLE;
    // Pressing inside this radius switches the time display; the ring around it seeks
    const innerRadius = radius * 0.55;
    const activeArcLength = circumference * (1 - gapAngle / (2 * Math.PI));
    const fraction = duration > 0 ? Math.min(currentTime / duration, 1) : 0;
    const filled = activeArcLength * fraction;

    const angle = fraction * (2 * Math.PI - gapAngle) + (-Math.PI / 2 + gapAngle / 2);
    const dotX = center + radius * Math.cos(angle);
    const dotY = center + radius * Math.sin(angle);

    const seekFromEvent = useCallback((clientX: number, clientY: number) => {
        const svg = svgRef.current;
        if (!svg || !duration) return;
        const rect = svg.getBoundingClientRect();
        const x = clientX - rect.left - center;
        const y = clientY - rect.top - center;
        let a = Math.atan2(y, x) + Math.PI / 2 - gapAngle / 2;
        if (a < 0) a += 2 * Math.PI;

        const arcEnd = 2 * Math.PI - gapAngle;
        if (a >= arcEnd && a < 2 * Math.PI) {
            onSeek(0);
        } else {
            const ratio = a / arcEnd;
            onSeek(Math.min(ratio, 1) * duration);
        }
    }, [duration, onSeek, center, gapAngle]);

    const onPointerDown = useCallback((e: React.PointerEvent) => {
        const rect = svgRef.current?.getBoundingClientRect();
        if (rect && Math.hypot(e.clientX - rect.left - center, e.clientY - rect.top - center) < innerRadius) {
            toggleTimeDisplay();
            return;
        }
        draggingRef.current = true;
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        seekFromEvent(e.clientX, e.clientY);
    }, [seekFromEvent, center, innerRadius, toggleTimeDisplay]);

    const onPointerMove = useCallback((e: React.PointerEvent) => {
        if (!draggingRef.current) return;
        seekFromEvent(e.clientX, e.clientY);
    }, [seekFromEvent]);

    const onPointerUp = useCallback(() => {
        draggingRef.current = false;
    }, []);

    const fontSize = size * 0.18;

    const gapLength = circumference * gapAngle / (2 * Math.PI);
    const offsetShift = gapAngle / 4 / Math.PI;

    return (
        <svg
            ref={svgRef}
            width={size}
            height={size}
            className={`cursor-pointer select-none touch-none ${className}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
        >
            <title>{showRemaining ? 'Time left. Tap the middle to show the length' : 'Length. Tap the middle to show the time left'}</title>
            <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke="currentColor"
                className="text-ink-4"
                strokeWidth={strokeWidth}
                strokeDasharray={`${activeArcLength} ${gapLength}`}
                strokeDashoffset={circumference * (0.25 - offsetShift)}
            />
            <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke="currentColor"
                className="text-accent-strong"
                strokeWidth={strokeWidth}
                strokeDasharray={`${filled} ${circumference - filled}`}
                strokeDashoffset={circumference * (0.25 - offsetShift)}
                strokeLinecap="round"
                style={{ transition: draggingRef.current ? 'none' : 'stroke-dasharray 0.1s linear' }}
            />
            <circle
                cx={dotX}
                cy={dotY}
                r={strokeWidth}
                fill="currentColor"
                className="text-accent-ink"
                stroke="white"
                strokeWidth={1.5}
            />
            <text
                x={center}
                y={center - fontSize * 0.15}
                textAnchor="middle"
                dominantBaseline="auto"
                fill="currentColor"
                className="text-ink"
                style={{ fontSize: `${fontSize}px`, fontWeight: 600, pointerEvents: 'none' }}
            >
                {formatCompact(currentTime)}
            </text>
            <line
                x1={center - size * 0.18}
                y1={center + fontSize * 0.25}
                x2={center + size * 0.18}
                y2={center + fontSize * 0.25}
                stroke="currentColor"
                className="text-ink-4"
                strokeWidth={0.5}
            />
            <text
                x={center}
                y={center + fontSize * 0.4}
                textAnchor="middle"
                dominantBaseline="hanging"
                fill="currentColor"
                className="text-ink-3"
                style={{ fontSize: `${fontSize * 0.85}px`, fontWeight: 400, pointerEvents: 'none' }}
            >
                {showRemaining ? `-${formatCompact(Math.max(duration - currentTime, 0))}` : formatCompact(duration)}
            </text>
        </svg>
    );
}