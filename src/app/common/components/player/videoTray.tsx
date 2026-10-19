"use client";

import ChevronUpSvg from '@/icons/chevron-up.svg';
import FullscreenSvg from '@/icons/fullscreen.svg';

// Height of the player bar the tray sits on
const PLAYER_BAR_HEIGHT = 72;

type VideoTrayProps = {
    mediaRef: React.RefObject<HTMLVideoElement | null>;
    open: boolean;
    onMinimize: () => void;
};

type FullscreenVideo = HTMLVideoElement & { webkitEnterFullscreen?: () => void };

// Slides up above the player bar to show a video episode. Minimized, it slides out of sight but
// the element keeps playing, so the episode carries on as audio. Audio episodes never open it.
export default function VideoTray({ mediaRef, open, onMinimize }: VideoTrayProps) {
    const togglePlay = () => {
        const media = mediaRef.current;
        if (!media) return;
        if (media.paused) media.play().catch(() => {});
        else media.pause();
    };

    const enterFullscreen = () => {
        const media = mediaRef.current as FullscreenVideo | null;
        if (!media) return;
        if (media.requestFullscreen) media.requestFullscreen().catch(() => {});
        // iPhone Safari has only its own video fullscreen
        else media.webkitEnterFullscreen?.();
    };

    return (
        <div
            className={`fixed left-0 right-0 z-[19] flex flex-col items-center bg-black shadow-glow transition-transform duration-300 ease-out ${open ? '' : 'pointer-events-none'}`}
            style={{
                bottom: PLAYER_BAR_HEIGHT,
                transform: open ? 'translateY(0)' : `translateY(calc(100% + ${PLAYER_BAR_HEIGHT}px))`,
            }}
            // Out of sight, its buttons must not take keyboard focus either
            inert={!open}
        >
            <video
                ref={mediaRef}
                playsInline
                onClick={togglePlay}
                onDoubleClick={enterFullscreen}
                className="w-full max-h-[60vh] aspect-video object-contain bg-black cursor-pointer"
            />
            <div className="relative w-full flex justify-center bg-card-strong border-t border-card-deep">
                <button
                    type="button"
                    onClick={onMinimize}
                    aria-label="Minimize video; keeps playing"
                    title="Minimize (keeps playing)"
                    className="flex p-1 px-6 text-ink hover:bg-card-deep transition-colors cursor-pointer"
                >
                    <ChevronUpSvg className="rotate-180" />
                </button>
                <button
                    type="button"
                    onClick={enterFullscreen}
                    aria-label="Full screen"
                    title="Full screen"
                    className="absolute right-2 top-1/2 -translate-y-1/2 flex p-1 rounded text-ink hover:bg-card-deep transition-colors cursor-pointer"
                >
                    <FullscreenSvg className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}
