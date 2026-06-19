"use client";

import { usePlayer } from '@/app/common/context/PlayerContext';
import ScrollingText from '@/app/common/components/scrollingText';
import MediaControls from '@/app/common/components/player/mediaControls';
import PlayerQueue from '@/app/common/components/player/playerQueue';
import LinearProgress from '@/app/common/components/player/linearProgress';
import CircularProgress from '@/app/common/components/player/circularProgress';
import ChevronUpSvg from '@/icons/chevron-up.svg';

export default function FloatingPlayer() {
    const { queue, currentIndex, currentTime, duration, queueOpen, toggleQueue, seekTo, podcastFallbackUrl, closePlayer } = usePlayer();

    if (queue.length === 0) return null;

    const current = queue[currentIndex];
    const imgSrc = current.imageUrl || current.fallbackImageUrl || podcastFallbackUrl;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-20">
            {/* Queue accordion */}
            <PlayerQueue />

            {/* Player bar */}
            <div className="bg-purple-300 border-t border-purple-400 shadow-lg flex items-center h-[72px] px-2 gap-2">

                {/* Circular progress — leftmost */}
                <div className="flex-shrink-0">
                    <CircularProgress currentTime={currentTime} duration={duration} onSeek={seekTo} size={56} />
                </div>

                {/* Episode art — lowest priority, show from 500px up */}
                <div className="hidden min-[500px]:block flex-shrink-0 w-14 h-14">
                    <img
                        src={imgSrc}
                        alt={current.title}
                        onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (current.fallbackImageUrl && target.src !== current.fallbackImageUrl && target.src !== podcastFallbackUrl) {
                                target.src = current.fallbackImageUrl;
                            } else if (target.src !== podcastFallbackUrl) {
                                target.src = podcastFallbackUrl;
                            }
                        }}
                        className="w-full h-full object-contain rounded-sm"
                    />
                </div>

                {/* Text info */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <ScrollingText text={current.streamName} className="text-xs text-gray-600 font-medium" />
                    <ScrollingText text={current.title} className="text-sm text-gray-800 font-semibold" />
                </div>

                {/* Linear progress kept for later but hidden for now */}
                <div className="hidden">
                    <LinearProgress currentTime={currentTime} duration={duration} onSeek={seekTo} />
                </div>

                {/* Media controls */}
                <MediaControls className="flex-shrink-0" />

                {/* Queue toggle — always visible when queue has multiple items */}
                {queue.length > 1 && (
                    <button
                        onClick={toggleQueue}
                        aria-label={queueOpen ? 'Close queue' : 'Open queue'}
                        className="flex p-2 rounded-full hover:bg-purple-400 transition-colors duration-150 text-gray-800 cursor-pointer flex-shrink-0"
                    >
                        <ChevronUpSvg
                            className={`transition-transform duration-300 ${queueOpen ? 'rotate-180' : ''}`}
                        />
                    </button>
                )}

                {/* Close player — rightmost */}
                <button
                    onClick={closePlayer}
                    aria-label="Close player"
                    className="flex-shrink-0 p-2 rounded-full text-gray-800 hover:bg-purple-400 transition-colors"
                >
                    <span className="text-sm font-bold">×</span>
                </button>
            </div>
        </div>
    );
}
