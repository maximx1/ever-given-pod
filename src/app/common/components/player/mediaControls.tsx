"use client";

import { usePlayer } from '@/app/common/context/PlayerContext';
import PlaySvg from '@/icons/play.svg';
import PauseSvg from '@/icons/pause.svg';
import SkipNextSvg from '@/icons/skip-next.svg';
import RotateCwSvg from '@/icons/rotate-cw.svg';

type MediaControlsProps = {
    className?: string;
};

type ControlButtonProps = {
    onClick: () => void;
    label: string;
    className?: string;
    children: React.ReactNode;
    disabled?: boolean;
};

function ControlButton({ onClick, label, className = '', children, disabled = false }: ControlButtonProps) {
    const base = 'p-2 rounded-full transition-colors duration-150';
    const activeClass = `hover:bg-purple-400 text-gray-800 cursor-pointer`;
    const disabledClass = `text-gray-400 cursor-not-allowed`;
    return (
        <button
            onClick={onClick}
            aria-label={label}
            aria-disabled={disabled}
            disabled={disabled}
            className={`${base} ${disabled ? disabledClass : activeClass} ${className}`}
        >
            {children}
        </button>
    );
}

type SeekButtonProps = {
    amount: number;
    onClick: () => void;
    className?: string;
    disabled?: boolean;
};

function SeekButton({ amount, onClick, className = '', disabled = false }: SeekButtonProps) {
    const abs = Math.abs(amount);
    const sign = amount > 0 ? '+' : '-';
    const aria = amount > 0 ? `Skip forward ${abs} seconds` : `Skip back ${abs} seconds`;
    const flip = amount < 0;

    return (
        <ControlButton onClick={onClick} label={aria} className={className} disabled={disabled}>
            <div className="relative w-5 h-5 flex items-center justify-center">
                <RotateCwSvg className={`${flip ? 'transform scale-x-[-1]' : ''}`} />
                <span className="absolute text-[9px] font-medium leading-none pointer-events-none text-current drop-shadow-sm">{`${sign}${abs}`}</span>
            </div>
        </ControlButton>
    );
}

export default function MediaControls({ className = '' }: MediaControlsProps) {
    const { isPlaying, togglePlayPause, playNext, playPrevious, seekRelative, queue } = usePlayer();
    const hasQueue = queue.length > 0;
    const { currentIndex } = usePlayer();
    const prevDisabled = !hasQueue || currentIndex <= 0;
    const nextDisabled = !hasQueue || currentIndex >= Math.max(0, queue.length - 1);
    const seekDisabled = !hasQueue;

    return (
        <div className={`flex items-center ${className}`}>
            {/* Previous — hidden below lg */}
            <ControlButton
                onClick={playPrevious}
                label="Previous"
                className="hidden min-[550px]:flex"
                disabled={prevDisabled}
            >
                <SkipNextSvg className="transform scale-x-[-1]" />
            </ControlButton>

            {/* -10s — progressively hidden: visible >=450px */}
            <SeekButton
                amount={-10}
                onClick={() => seekRelative(-10)}
                className="hidden min-[450px]:flex"
                disabled={seekDisabled}
            />

            {/* Play / Pause — always visible */}
            <ControlButton
                onClick={togglePlayPause}
                label={isPlaying ? 'Pause' : 'Play'}
                className={!hasQueue ? 'opacity-40 cursor-not-allowed' : ''}
            >
                {isPlaying
                    ? <PauseSvg />
                    : <PlaySvg />
                }
            </ControlButton>

            {/* +10s — always visible */}
            <SeekButton
                amount={10}
                onClick={() => seekRelative(10)}
                disabled={seekDisabled}
            />

            {/* Next — progressively hidden: visible >=500px */}
            <ControlButton
                onClick={playNext}
                label="Next"
                className="hidden min-[500px]:flex"
                disabled={nextDisabled}
            >
                <SkipNextSvg />
            </ControlButton>
        </div>
    );
}
