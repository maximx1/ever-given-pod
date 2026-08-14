"use client";

import { createContext, useContext, useRef, useState, useCallback, useEffect, ReactNode } from 'react';
import { resolveApiUrl, resolveAssetUrl } from '@/common/helpers/api';
import { useAuth } from '@/app/common/context/AuthContext';

export type QueueItem = {
    episodeId: string;
    title: string;
    streamName: string;
    streamId: string;
    url: string;
    imageUrl?: string;
    fallbackImageUrl?: string;
    resumeFrom?: number;
};

type ResumePrompt = {
    item: QueueItem;
    savedPosition: number;
    savedDuration: number;
    mode: 'play' | 'queue';
};

type PlayerState = {
    queue: QueueItem[];
    currentIndex: number;
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    queueOpen: boolean;
    resumePrompt: ResumePrompt | null;
};

type PlayerContextValue = PlayerState & {
    audioRef: React.RefObject<HTMLAudioElement | null>;
    playNow: (item: QueueItem) => void;
    addToQueue: (item: QueueItem) => void;
    removeFromQueue: (index: number) => void;
    playNext: () => void;
    playPrevious: () => void;
    togglePlayPause: () => void;
    seekRelative: (seconds: number) => void;
    seekTo: (time: number) => void;
    jumpToQueueItem: (index: number) => void;
    toggleQueue: () => void;
    requestPlayNow: (item: QueueItem) => void;
    requestAddToQueue: (item: QueueItem) => void;
    resolveResumePrompt: (resume: boolean) => void;
    dismissResumePrompt: () => void;
    closePlayer: () => void;
    podcastFallbackUrl: string;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const podcastFallbackUrl = resolveAssetUrl('/icons/podcast.svg');
    const { user } = useAuth();

    const [queue, setQueue] = useState<QueueItem[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [queueOpen, setQueueOpen] = useState(false);
    const [resumePrompt, setResumePrompt] = useState<ResumePrompt | null>(null);
    const playCountedRef = useRef<Set<string>>(new Set());
    const positionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    type PersistedPlayer = {
        queue: QueueItem[];
        currentIndex: number;
        currentTime: number;
        isPlaying: boolean;
    };

    // --- Playback position tracking (every 10s while playing) ---
    useEffect(() => {
        if (positionIntervalRef.current) {
            clearInterval(positionIntervalRef.current);
            positionIntervalRef.current = null;
        }
        if (!isPlaying || !user) return;
        positionIntervalRef.current = setInterval(() => {
            const audio = audioRef.current;
            const item = queue[currentIndex];
            if (!audio || !item) return;
            fetch(resolveApiUrl(`/${item.streamId}/playback`), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ episodeId: item.episodeId, position: audio.currentTime, duration: audio.duration || undefined }),
            }).catch(() => {});
        }, 10000);
        return () => {
            if (positionIntervalRef.current) {
                clearInterval(positionIntervalRef.current);
                positionIntervalRef.current = null;
            }
        };
    }, [isPlaying, user, queue, currentIndex]);

    // --- Persist queue and playback state to localStorage and restore on load ---
    useEffect(() => {
        const key = user ? `playerState:${user.id}` : 'playerState:guest';
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return;
            const parsed: PersistedPlayer = JSON.parse(raw);
            if (!parsed) return;
            if (Array.isArray(parsed.queue) && parsed.queue.length > 0) {
                setQueue(parsed.queue);
                setCurrentIndex(typeof parsed.currentIndex === 'number' ? parsed.currentIndex : 0);
                setCurrentTime(typeof parsed.currentTime === 'number' ? parsed.currentTime : 0);
                // restore audio src and seek to time after metadata loads
                const audio = audioRef.current;
                const idx = typeof parsed.currentIndex === 'number' ? parsed.currentIndex : 0;
                const item = parsed.queue[idx];
                if (audio && item) {
                    audio.src = item.url;
                    const onMeta = () => {
                        try { audio.currentTime = parsed.currentTime || 0; } catch { }
                        audio.removeEventListener('loadedmetadata', onMeta);
                    };
                    audio.addEventListener('loadedmetadata', onMeta);
                    if (parsed.isPlaying) {
                        // attempt to play (may be blocked by browser autoplay policies)
                        audio.play().then(() => setIsPlaying(true)).catch(() => {});
                    }
                }
            }
        } catch {
            // ignore parse errors
        }
    }, [user]);

    useEffect(() => {
        const key = user ? `playerState:${user.id}` : 'playerState:guest';
        try {
            const toSave: PersistedPlayer = { queue, currentIndex, currentTime, isPlaying };
            localStorage.setItem(key, JSON.stringify(toSave));
        } catch { /* ignore */ }
    }, [queue, currentIndex, currentTime, isPlaying, user]);

    // --- Increment play count when a new track starts playing ---
    const recordPlayCount = useCallback((item: QueueItem) => {
        const key = `${item.streamId}:${item.episodeId}`;
        if (playCountedRef.current.has(key)) return;
        playCountedRef.current.add(key);
        fetch(resolveApiUrl(`/${item.streamId}/play-count`), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ episodeId: item.episodeId }),
        }).catch(() => {});
    }, []);

    const playAtIndex = useCallback((index: number, newQueue?: QueueItem[], startTime?: number) => {
        const q = newQueue ?? queue;
        const item = q[index];
        if (!item || !audioRef.current) return;
        if (audioRef.current.src !== item.url) {
            audioRef.current.src = item.url;
        }
        const resume = startTime ?? item.resumeFrom;
        if (resume && resume > 0) {
            audioRef.current.currentTime = resume;
        }
        audioRef.current.play().catch(() => {});
        setCurrentIndex(index);
        setIsPlaying(true);
        recordPlayCount(item);
    }, [queue, recordPlayCount]);

    const playNow = useCallback((item: QueueItem) => {
        setQueue(prev => {
            const existingIndex = prev.findIndex(q => q.episodeId === item.episodeId);
            if (existingIndex !== -1) {
                setTimeout(() => playAtIndex(existingIndex, undefined, item.resumeFrom), 0);
                return prev;
            }
            const next = [item, ...prev];
            setTimeout(() => playAtIndex(0, next, item.resumeFrom), 0);
            return next;
        });
    }, [playAtIndex]);

    const addToQueue = useCallback((item: QueueItem) => {
        setQueue(prev => {
            if (prev.some(q => q.episodeId === item.episodeId)) return prev;
            return [...prev, item];
        });
    }, []);

    // --- Resume-aware request functions ---
    const checkAndPrompt = useCallback(async (item: QueueItem, mode: 'play' | 'queue') => {
        if (!user) {
            if (mode === 'play') playNow(item);
            else addToQueue(item);
            return;
        }
        try {
            const res = await fetch(resolveApiUrl(`/${item.streamId}/playback?episodeId=${item.episodeId}`));
            if (res.ok) {
                const data = await res.json();
                if (data.position && data.position > 1) {
                    setResumePrompt({ item, savedPosition: data.position, savedDuration: data.duration ?? 0, mode });
                    return;
                }
            }
        } catch { /* ignore */ }
        if (mode === 'play') playNow(item);
        else addToQueue(item);
    }, [user, playNow, addToQueue]);

    const requestPlayNow = useCallback((item: QueueItem) => {
        checkAndPrompt(item, 'play');
    }, [checkAndPrompt]);

    const requestAddToQueue = useCallback((item: QueueItem) => {
        checkAndPrompt(item, 'queue');
    }, [checkAndPrompt]);

    const resolveResumePrompt = useCallback((resume: boolean) => {
        if (!resumePrompt) return;
        const item = { ...resumePrompt.item };
        if (resume) {
            item.resumeFrom = resumePrompt.savedPosition;
        } else {
            item.resumeFrom = 0;
        }
        if (resumePrompt.mode === 'play') {
            playNow(item);
        } else {
            addToQueue(item);
        }
        setResumePrompt(null);
    }, [resumePrompt, playNow, addToQueue]);

    const dismissResumePrompt = useCallback(() => {
        setResumePrompt(null);
    }, []);

    const closePlayer = useCallback(() => {
        const audio = audioRef.current;
        if (audio) {
            try { audio.pause(); } catch {}
            try { audio.currentTime = 0; } catch {}
            try { audio.src = ''; } catch {}
        }
        setQueue([]);
        setCurrentIndex(0);
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
        playCountedRef.current.clear();
        setResumePrompt(null);
    }, []);

    const removeFromQueue = useCallback((index: number) => {
        setQueue(prev => {
            const next = prev.filter((_, i) => i !== index);
            return next;
        });
        setCurrentIndex(prev => {
            if (index < prev) return prev - 1;
            return prev;
        });
    }, []);

    const playNext = useCallback(() => {
        setQueue(q => {
            const nextIndex = currentIndex + 1;
            if (nextIndex < q.length) {
                const nextItem = q[nextIndex];
                playAtIndex(nextIndex, q, nextItem.resumeFrom);
            } else {
                audioRef.current?.pause();
                setIsPlaying(false);
            }
            return q;
        });
    }, [currentIndex, playAtIndex]);

    const playPrevious = useCallback(() => {
        const audio = audioRef.current;
        if (!audio) return;
        // If more than 3s in, restart current track
        if (audio.currentTime > 3) {
            audio.currentTime = 0;
            return;
        }
        const prevIndex = currentIndex - 1;
        if (prevIndex >= 0) {
            playAtIndex(prevIndex);
        }
    }, [currentIndex, playAtIndex]);

    const togglePlayPause = useCallback(() => {
        const audio = audioRef.current;
        if (!audio || queue.length === 0) return;
        if (isPlaying) {
            audio.pause();
            setIsPlaying(false);
        } else {
            if (!audio.src && queue[currentIndex]) {
                audio.src = queue[currentIndex].url;
            }
            audio.play().catch(() => {});
            setIsPlaying(true);
        }
    }, [isPlaying, queue, currentIndex]);

    const seekRelative = useCallback((seconds: number) => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.currentTime = Math.max(0, Math.min(audio.duration || 0, audio.currentTime + seconds));
    }, []);

    const seekTo = useCallback((time: number) => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.currentTime = Math.max(0, Math.min(audio.duration || 0, time));
    }, []);

    const jumpToQueueItem = useCallback((index: number) => {
        playAtIndex(index);
    }, [playAtIndex]);

    const toggleQueue = useCallback(() => {
        setQueueOpen(prev => !prev);
    }, []);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        const onTimeUpdate = () => setCurrentTime(audio.currentTime);
        const onDurationChange = () => setDuration(audio.duration || 0);
        const onEnded = () => {
            const item = queue[currentIndex];
            if (user && item) {
                fetch(resolveApiUrl(`/${item.streamId}/playback`), {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ episodeId: item.episodeId, position: 0, duration: 0 }),
                }).catch(() => {});
            }
            playNext();
        };
        const onPlay = () => setIsPlaying(true);
        const onPause = () => setIsPlaying(false);

        audio.addEventListener('timeupdate', onTimeUpdate);
        audio.addEventListener('durationchange', onDurationChange);
        audio.addEventListener('ended', onEnded);
        audio.addEventListener('play', onPlay);
        audio.addEventListener('pause', onPause);
        return () => {
            audio.removeEventListener('timeupdate', onTimeUpdate);
            audio.removeEventListener('durationchange', onDurationChange);
            audio.removeEventListener('ended', onEnded);
            audio.removeEventListener('play', onPlay);
            audio.removeEventListener('pause', onPause);
        };
    }, [playNext, queue, currentIndex, user]);

    // Keyboard shortcuts: left/right arrows seek when player is active
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (!queue || queue.length === 0) return;
            const target = e.target as HTMLElement | null;
            if (target) {
                const tag = target.tagName;
                if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) return;
            }
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                seekRelative(-10);
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                seekRelative(10);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [seekRelative, queue]);

    return (
        <PlayerContext.Provider value={{
            queue,
            currentIndex,
            isPlaying,
            currentTime,
            duration,
            queueOpen,
            resumePrompt,
            audioRef,
            playNow,
            addToQueue,
            removeFromQueue,
            playNext,
            playPrevious,
            togglePlayPause,
            seekRelative,
            seekTo,
            jumpToQueueItem,
            toggleQueue,
            requestPlayNow,
            requestAddToQueue,
            resolveResumePrompt,
            dismissResumePrompt,
            closePlayer,
            podcastFallbackUrl,
        }}>
            <audio ref={audioRef} />
            {children}
        </PlayerContext.Provider>
    );
}

export function usePlayer() {
    const ctx = useContext(PlayerContext);
    if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
    return ctx;
}
