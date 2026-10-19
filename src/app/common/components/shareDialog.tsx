"use client";

import { useState, useEffect, useRef } from 'react';
import { resolveApiUrl } from '@/common/helpers/api';
import PersonIcon from '@/app/common/components/icons/personIcon';

type AccessUser = {
    userId: string;
    username?: string;
    name?: string;
    feedToken?: string;
};

type SearchResult = {
    id: string;
    username: string;
    name?: string;
    email?: string;
};

type ShareDialogProps = {
    streamId: string;
    accessList: AccessUser[];
    onAccessAdded: (user: AccessUser) => void;
    onAccessRemoved: (userId: string) => void;
    onClose: () => void;
};

export default function ShareDialog({ streamId, accessList, onAccessAdded, onAccessRemoved, onClose }: ShareDialogProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [searching, setSearching] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const dialogRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (query.trim().length === 0) {
            setResults([]);
            return;
        }

        debounceRef.current = setTimeout(async () => {
            setSearching(true);
            try {
                const res = await fetch(resolveApiUrl(`/users/search?q=${encodeURIComponent(query.trim())}`));
                if (res.ok) {
                    const data: SearchResult[] = await res.json();
                    const existingIds = new Set(accessList.map(a => a.userId));
                    setResults(data.filter(u => !existingIds.has(u.id)));
                }
            } catch {
                setResults([]);
            } finally {
                setSearching(false);
            }
        }, 400);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [query, accessList]);

    const handleAddUser = async (user: SearchResult) => {
        try {
            const res = await fetch(resolveApiUrl(`/${streamId}/access`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id }),
            });
            if (res.ok) {
                const data = await res.json();
                onAccessAdded({
                    userId: data.userId,
                    username: data.username,
                    name: data.name,
                    feedToken: data.feedToken,
                });
                setQuery('');
                setResults([]);
            }
        } catch {
            // ignore
        }
    };

    const handleRemoveUser = async (userId: string) => {
        try {
            await fetch(resolveApiUrl(`/${streamId}/access`), {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId }),
            });
            onAccessRemoved(userId);
        } catch {
            // ignore
        }
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
            onClose();
        }
    };

    return (
        <div
            className="modal-overlay fixed inset-0 z-50 flex items-start justify-center pt-32 bg-black/30"
            onClick={handleBackdropClick}
        >
            <div
                ref={dialogRef}
                className="bg-raised rounded-lg shadow-xl w-[380px] max-h-[500px] flex flex-col"
            >
                <div className="p-4 border-b border-line-soft">
                    <h3 className="text-sm font-bold text-ink-2">Share Stream</h3>
                </div>

                <div className="p-4 relative">
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search by username or email..."
                            className="flex-1 px-3 py-2 border border-line rounded-sm text-sm outline-none focus:border-card-deep"
                            autoFocus
                        />
                        <div className="w-6 h-6 flex items-center justify-center text-accent-soft">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                        </div>
                    </div>

                    {results.length > 0 && (
                        <div className="absolute left-4 right-4 top-full mt-1 bg-raised border border-line-soft rounded-sm shadow-lg z-10 max-h-[160px] overflow-y-auto">
                            {results.map((user) => (
                                <button
                                    key={user.id}
                                    type="button"
                                    onClick={() => handleAddUser(user)}
                                    className="w-full text-left px-3 py-2 hover:bg-tint-soft text-sm flex items-center gap-2 border-b border-line-soft last:border-b-0"
                                >
                                    <PersonIcon size={16} className="opacity-50" />
                                    <div>
                                        <span className="font-medium text-ink-2">{user.username}</span>
                                        {user.name && <span className="text-ink-5 ml-1">({user.name})</span>}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {searching && query.trim().length > 0 && results.length === 0 && (
                        <div className="absolute left-4 right-4 top-full mt-1 bg-raised border border-line-soft rounded-sm shadow-lg z-10 px-3 py-2 text-sm text-ink-5">
                            Searching...
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto px-4 pb-4">
                    {accessList.length === 0 ? (
                        <p className="text-sm text-ink-5 text-center py-4">No users added yet</p>
                    ) : (
                        <ul className="space-y-1">
                            {accessList.map((entry) => (
                                <li key={entry.userId} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-raised-alt text-sm">
                                    <div className="flex items-center gap-2">
                                        <PersonIcon size={16} className="opacity-50" />
                                        <span className="text-ink-2">{entry.username}</span>
                                        {entry.name && <span className="text-ink-5">({entry.name})</span>}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveUser(entry.userId)}
                                        className="text-red-400 hover:text-red-600 text-xs px-1"
                                        title="Remove access"
                                    >
                                        ✕
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
