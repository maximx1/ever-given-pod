"use client";

import { useState } from 'react';

type PrivacyToggleProps = {
    isPrivate: boolean;
    onChange: (isPrivate: boolean) => void;
};

// What each setting means, shown before the owner changes it
const EXPLANATIONS = {
    private: {
        title: 'Make this stream private?',
        points: [
            'Only you and the people you add under Allowed Users can open it, play its episodes or subscribe to its feed.',
            'Other people no longer see it on your profile or among suggested streams.',
            'Each allowed person gets their own feed address. Anyone subscribed with the current address stops getting episodes.',
        ],
        confirm: 'Make private',
    },
    public: {
        title: 'Make this stream public?',
        points: [
            'Anyone can open it, play its episodes and subscribe to its feed, without logging in.',
            'Other people see it on your profile, and it may be suggested to them.',
        ],
        confirm: 'Make public',
    },
};

export default function PrivacyToggle({ isPrivate, onChange }: PrivacyToggleProps) {
    const [confirmOpen, setConfirmOpen] = useState(false);
    const next = isPrivate ? EXPLANATIONS.public : EXPLANATIONS.private;

    return (
        <>
            <button
                type="button"
                role="switch"
                aria-checked={isPrivate}
                onClick={() => setConfirmOpen(true)}
                className="flex items-center gap-2 transition-all duration-200 bg-transparent rounded-sm hover:bg-card-deep hover:shadow px-2 py-2 text-sm select-none cursor-pointer"
                title={isPrivate
                    ? 'Private: only you and your allowed users can see this stream. Click to change'
                    : 'Public: anyone can see this stream and subscribe to it. Click to change'}
            >
                <div className={`relative w-8 h-4 rounded-full transition-colors ${isPrivate ? 'bg-accent-deep' : 'bg-card-deep'}`}>
                    <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-raised transition-transform ${isPrivate ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                </div>
                <span className="whitespace-nowrap">{isPrivate ? 'Private' : 'Public'}</span>
            </button>

            {confirmOpen && (
                <div
                    className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                    onClick={() => setConfirmOpen(false)}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="privacy-dialog-title"
                        className="bg-raised rounded-lg shadow-lg p-6 w-full max-w-[420px]"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => { if (e.key === 'Escape') setConfirmOpen(false); }}
                    >
                        <h3 id="privacy-dialog-title" className="text-lg font-bold text-ink mb-3">{next.title}</h3>
                        <ul className="list-disc pl-5 space-y-2 text-sm text-ink-3">
                            {next.points.map((point) => <li key={point}>{point}</li>)}
                        </ul>
                        <div className="flex justify-end gap-2 mt-5">
                            <button
                                type="button"
                                onClick={() => setConfirmOpen(false)}
                                className="px-4 py-2 text-sm text-ink-3 hover:text-ink cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                autoFocus
                                onClick={() => { setConfirmOpen(false); onChange(!isPrivate); }}
                                className="px-4 py-2 text-sm bg-accent-strong text-on-accent rounded-md hover:bg-accent-deep cursor-pointer"
                            >
                                {next.confirm}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
