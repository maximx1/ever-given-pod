"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/common/context/AuthContext';
import { resolveApiUrl } from '@/common/helpers/api';

type SettingsDialogProps = {
    streamId: string;
    onClose: () => void;
    onSettingsChange?: (settings: { seasonMode: boolean; defaultAddType: 'episode' | 'season' }) => void;
};

type StreamSettings = {
    seasonMode: boolean;
    defaultAddType: 'episode' | 'season';
};

export default function SettingsDialog({ streamId, onClose, onSettingsChange }: SettingsDialogProps) {
    const { user } = useAuth();
    const [isOwner, setIsOwner] = useState(false);
    const [settings, setSettings] = useState<StreamSettings>({
        seasonMode: false,
        defaultAddType: 'episode',
    });
    const [isPrivate, setIsPrivate] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!user || !streamId) {
            setIsOwner(false);
            return;
        }
        fetch(resolveApiUrl(`/${streamId}`))
            .then((res) => res.ok ? res.json() : null)
            .then((data) => setIsOwner(data?.userId === user.id))
            .catch(() => setIsOwner(false));
    }, [user, streamId]);

    useEffect(() => {
        if (!streamId) return;
        fetch(resolveApiUrl(`/${streamId}/settings`))
            .then((res) => res.ok ? res.json() : null)
            .then((data) => {
                if (data) {
                    setSettings({
                        seasonMode: data.seasonMode ?? false,
                        defaultAddType: data.defaultAddType ?? 'episode',
                    });
                }
            });
    }, [streamId]);

    const handlePrivacyToggle = async (newValue: boolean) => {
        try {
            const res = await fetch(resolveApiUrl(`/${streamId}/privacy`), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isPrivate: newValue }),
            });
            if (res.ok) {
                const data = await res.json();
                setIsPrivate(data.isPrivate);
            }
        } catch { /* ignore */ }
    };

    const handleSeasonModeChange = async (newValue: boolean) => {
        try {
            setSaving(true);
            const res = await fetch(resolveApiUrl(`/${streamId}/settings`), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ seasonMode: newValue }),
            });
            if (res.ok) {
                const data = await res.json();
                setSettings(prev => ({ ...prev, seasonMode: data.seasonMode }));
                onSettingsChange?.(data);
            }
        } catch { /* ignore */ } finally {
            setSaving(false);
        }
    };

    const handleAddTypeChange = async (newValue: 'episode' | 'season') => {
        try {
            setSaving(true);
            const res = await fetch(resolveApiUrl(`/${streamId}/settings`), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ defaultAddType: newValue }),
            });
            if (res.ok) {
                const data = await res.json();
                setSettings(prev => ({ ...prev, defaultAddType: data.defaultAddType }));
                onSettingsChange?.(data);
            }
        } catch { /* ignore */ } finally {
            setSaving(false);
        }
    };

    if (!isOwner && !isPrivate) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-purple-200 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-800">Stream Settings</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-xl"
                    >
                        ✕
                    </button>
                </div>

                {/* Privacy Toggle */}
                <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-gray-700">
                        {isPrivate ? 'Private' : 'Public'}
                    </span>
                    <button
                        type="button"
                        onClick={() => handlePrivacyToggle(!isPrivate)}
                        className={`relative w-10 h-5 rounded-full transition-colors ${isPrivate ? 'bg-purple-800' : 'bg-purple-400'}`}
                    >
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${isPrivate ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                </div>

                {/* Season Mode */}
                {isOwner && (
                    <>
                        <div className="flex items-center justify-between py-2 border-t border-purple-300">
                            <div>
                                <span className="text-sm text-gray-700">Season Mode</span>
                                <p className="text-xs text-gray-400">Group episodes by season</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleSeasonModeChange(!settings.seasonMode)}
                                className={`relative w-10 h-5 rounded-full transition-colors ${settings.seasonMode ? 'bg-purple-800' : 'bg-purple-400'}`}
                            >
                                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${settings.seasonMode ? 'translate-x-5' : 'translate-x-0.5'}`} />
                            </button>
                        </div>

                        {/* Default Add Type */}
                        {settings.seasonMode && (
                            <div className="flex items-center justify-between py-2 border-t border-purple-300">
                                <div>
                                    <span className="text-sm text-gray-700">Default Add Type</span>
                                    <p className="text-xs text-gray-400">What the Add button adds by default</p>
                                </div>
                                <div className="flex rounded-sm overflow-hidden border border-purple-400">
                                    <button
                                        type="button"
                                        onClick={() => handleAddTypeChange('episode')}
                                        className={`px-3 py-1 text-xs ${settings.defaultAddType === 'episode' ? 'bg-purple-800 text-purple-200' : 'bg-purple-400 text-gray-800'}`}
                                    >
                                        Episode
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleAddTypeChange('season')}
                                        className={`px-3 py-1 text-xs border-l border-purple-400 ${settings.defaultAddType === 'season' ? 'bg-purple-800 text-purple-200' : 'bg-purple-400 text-gray-800'}`}
                                    >
                                        Season
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Allowed Users (if private) */}
                {isPrivate && isOwner && (
                    <div className="mt-4 border-t border-purple-300 pt-4">
                        <p className="text-sm text-gray-700">Allowed Users</p>
                        {/* Could embed ShareDialog here or link to it */}
                    </div>
                )}
            </div>
        </div>
    );
}