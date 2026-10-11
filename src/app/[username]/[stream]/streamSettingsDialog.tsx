"use client";

import { useState } from 'react';
import { toast } from 'react-toastify';
import { resolveApiUrl } from '@/common/helpers/api';
import { DEFAULT_SPLIT_MINUTES, SPLIT_MINUTES_RANGE } from '@/common/limits';

export type StreamSettings = {
    autoSplit: boolean;
    splitMinutes: number;
};

type StreamSettingsDialogProps = {
    streamId: string;
    autoSplit?: boolean;
    splitMinutes?: number;
    onSaved: (settings: StreamSettings) => void;
    onClose: () => void;
};

export default function StreamSettingsDialog({ streamId, autoSplit = true, splitMinutes = DEFAULT_SPLIT_MINUTES, onSaved, onClose }: StreamSettingsDialogProps) {
    const [split, setSplit] = useState(autoSplit),
        [minutes, setMinutes] = useState(String(splitMinutes)),
        [saving, setSaving] = useState(false);

    const parsedMinutes = Number(minutes);
    const minutesValid = Number.isInteger(parsedMinutes)
        && parsedMinutes >= SPLIT_MINUTES_RANGE.min
        && parsedMinutes <= SPLIT_MINUTES_RANGE.max;

    const handleSave = async () => {
        if (!minutesValid || saving) return;

        setSaving(true);
        try {
            const res = await fetch(resolveApiUrl(`/${streamId}/settings`), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ autoSplit: split, splitMinutes: parsedMinutes }),
            });
            const data = await res.json().catch(() => null);
            if (res.ok && data) {
                onSaved(data);
                onClose();
                return;
            }
            toast.error(data?.message || 'Could not save settings.');
        } catch {
            toast.error('Could not save settings.');
        }
        setSaving(false);
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={() => { if (!saving) onClose(); }}
        >
            <div
                className="bg-white rounded-lg shadow-lg p-6 w-[420px] max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <h3 className="text-lg font-bold text-gray-800 mb-4">Stream Settings</h3>
                <div className="space-y-3">
                    <label className="flex items-start gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={split}
                            onChange={(e) => setSplit(e.target.checked)}
                            className="mt-1 accent-purple-600"
                            disabled={saving}
                        />
                        <span>
                            <span className="text-sm font-medium text-gray-700 block">Split long uploads into parts</span>
                            <span className="text-xs text-gray-500 block">
                                Long audio becomes a season of parts, which podcast apps download far more reliably than one huge file. Audio with chapter markers is split at the chapters.
                            </span>
                        </span>
                    </label>
                    <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">Part length (minutes)</label>
                        <input
                            type="number"
                            value={minutes}
                            onChange={(e) => setMinutes(e.target.value)}
                            min={SPLIT_MINUTES_RANGE.min}
                            max={SPLIT_MINUTES_RANGE.max}
                            step={1}
                            className="w-full border border-gray-300 rounded-md p-3 text-sm focus:ring-purple-500 focus:border-purple-500 outline-none"
                            disabled={saving}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onClose(); }}
                        />
                        <p className={`text-xs mt-1 ${minutesValid ? 'text-gray-500' : 'text-red-600'}`}>
                            {minutesValid
                                ? `Audio longer than ${parsedMinutes * 1.5} minutes is cut into equal parts of at most ${parsedMinutes} minutes. Also used by "Split into parts" on an episode.`
                                : `Enter a whole number from ${SPLIT_MINUTES_RANGE.min} to ${SPLIT_MINUTES_RANGE.max}.`}
                        </p>
                    </div>
                </div>

                <div className="flex justify-end gap-2 mt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                        disabled={saving}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        className="px-4 py-2 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
                        disabled={saving || !minutesValid}
                    >
                        {saving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
}
