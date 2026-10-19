"use client";

import { usePlayer } from '@/app/common/context/PlayerContext';
import ScrollingText from '@/app/common/components/scrollingText';
import MediaControls from '@/app/common/components/player/mediaControls';
import PlayerQueue from '@/app/common/components/player/playerQueue';
import LinearProgress from '@/app/common/components/player/linearProgress';
import CircularProgress from '@/app/common/components/player/circularProgress';
import ChevronUpSvg from '@/icons/chevron-up.svg';
import VideoSvg from '@/icons/video.svg';
import UploadImage from '@/app/common/components/image/uploadImage';

export default function FloatingPlayer() {
    const { queue, currentIndex, currentTime, duration, queueOpen, toggleQueue, seekTo, podcastFallbackUrl, closePlayer, hasVideo, videoOpen, openVideo } = usePlayer();

    if (queue.length === 0) return null;

    const current = queue[currentIndex];

    return (
        <div className="fixed bottom-0 left-0 right-0 z-20">
            {/* Queue accordion */}
            <PlayerQueue />

            {/* Player bar */}
            <div className="bg-card-strong border-t border-card-deep shadow-lg flex items-center h-[72px] px-2 gap-2">

                {/* Circular progress — leftmost */}
                <div className="flex-shrink-0">
                    <CircularProgress currentTime={currentTime} duration={duration} onSeek={seekTo} size={56} />
                </div>

                {/* Episode art — lowest priority, show from 500px up */}
                <div className="hidden min-[500px]:block flex-shrink-0 w-14 h-14">
                    <UploadImage
                        src={current.imageUrl}
                        fallbacks={[current.fallbackImageUrl, podcastFallbackUrl]}
                        alt={current.title ?? ''}
                        width={56}
                        height={56}
                        className="w-full h-full object-contain rounded-sm"
                    />
                </div>

                {/* Text info */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <ScrollingText text={current.streamName} className="text-xs text-ink-3 font-medium" />
                    <ScrollingText text={current.title} className="text-sm text-ink font-semibold" />
                </div>

                {/* Linear progress kept for later but hidden for now */}
                <div className="hidden">
                    <LinearProgress currentTime={currentTime} duration={duration} onSeek={seekTo} />
                </div>

                {/* Brings a minimized video back up */}
                {hasVideo && !videoOpen && (
                    <button
                        onClick={openVideo}
                        aria-label="Show video"
                        title="Show video"
                        className="flex p-2 rounded-full hover:bg-card-deep transition-colors duration-150 text-ink cursor-pointer flex-shrink-0"
                    >
                        <VideoSvg className="w-6 h-6" />
                    </button>
                )}

                {/* Media controls */}
                <MediaControls className="flex-shrink-0" />

                {/* Queue toggle — always visible when queue has multiple items */}
                {queue.length > 1 && (
                    <button
                        onClick={toggleQueue}
                        aria-label={queueOpen ? 'Close queue' : 'Open queue'}
                        className="flex p-2 rounded-full hover:bg-card-deep transition-colors duration-150 text-ink cursor-pointer flex-shrink-0"
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
                    className="flex-shrink-0 p-2 rounded-full text-ink hover:bg-card-deep transition-colors"
                >
                    <span className="text-sm font-bold">×</span>
                </button>
            </div>
        </div>
    );
}
