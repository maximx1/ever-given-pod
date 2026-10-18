"use client";

import { ReactNode, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { resolveApiUrl } from '@/common/helpers/api';

type FeedLinkProps = {
    streamId: string;
    feedUrl?: string;
    isPrivate?: boolean;
    feedToken?: string;
    // Called when a private stream's token had to be fetched, so the parent can reuse it
    onTokenResolved?: (token: string) => void;
    className?: string;
    title?: string;
    children: ReactNode;
};

export const withToken = (url: string, token?: string) =>
    token ? `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}` : url;

// The feed as a real link, so middle click, "Open in new tab" and "Copy link" work.
// A plain click copies the full URL instead of navigating, since the feed is meant for a podcast app.
export default function FeedLink({ streamId, feedUrl, isPrivate, feedToken, onTokenResolved, className, title, children }: FeedLinkProps) {
    const [fetchedToken, setFetchedToken] = useState<string>(),
        token = isPrivate ? (feedToken ?? fetchedToken) : undefined,
        href = feedUrl ? withToken(feedUrl, token) : undefined;

    // A private feed only opens with a token; anyone who can see the stream may get one
    useEffect(() => {
        if (!isPrivate || feedToken || fetchedToken) return;
        let cancelled = false;
        fetch(resolveApiUrl(`/${streamId}/token`), { method: 'POST' })
            .then((r) => r.ok ? r.json() : null)
            .then((data) => {
                if (cancelled || !data?.feedToken) return;
                setFetchedToken(data.feedToken);
                onTokenResolved?.(data.feedToken);
            })
            .catch(() => { /* the link stays tokenless */ });
        return () => { cancelled = true; };
    }, [streamId, isPrivate, feedToken, fetchedToken, onTokenResolved]);

    if (!href) return null;

    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            title={title}
            className={className}
            onClick={(e) => {
                if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                e.preventDefault();
                const absolute = new URL(href, window.location.href).href;
                // The clipboard is missing outside secure contexts, such as a LAN address over http
                const copied = navigator.clipboard?.writeText(absolute) ?? Promise.reject();
                copied
                    .then(() => toast('Feed URL copied to clipboard'))
                    .catch(() => window.open(absolute, '_blank', 'noopener'));
            }}
        >
            {children}
        </a>
    );
}
