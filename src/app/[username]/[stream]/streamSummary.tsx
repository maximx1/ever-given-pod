"use client";

import { StreamDto } from '@/common/dtos/streamDto';
import { StreamAccessEntry } from '@/common/dtos/streamDto';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { resolveApiUrl, resolveAssetUrl } from '@/common/helpers/api';
import { useAuth } from '@/app/common/context/AuthContext';
import ImageWithActions from '@/app/common/components/image/imageWithActions';
import PrivacyToggle from '@/app/common/components/privacyToggle';
import ShareDialog from '@/app/common/components/shareDialog';
import FeedLink from '@/app/common/components/feedLink';
import IconExpandTextButton from '@/app/common/components/buttons/iconExpandTextButton';
import EditableText from '@/app/common/components/editableText';
import PersonIcon from '@/app/common/components/icons/personIcon';
import GearIcon from '@/app/common/components/icons/gearIcon';
import StreamSettingsDialog from './streamSettingsDialog';
import KeySvg from '@/icons/key.svg';
import CopySvg from '@/icons/copy.svg';
import { FIELD_LIMITS } from '@/common/limits';
import { DownloadStats } from '@/common/dtos/episodeDto';
import { RECENT_DOWNLOAD_DAYS, recentDownloads } from '@/common/helpers/downloadStats';
// Image optimization handled by ImageWithActions — don't import `next/image` here
import { toast } from 'react-toastify';

type StreamSummaryType = {
    stream?: string | string[];
    onAccessDenied?: () => void;
    onImageResolved?: (imageUrl: string) => void;
    onNameResolved?: (name: string) => void;
};

type AccessUser = {
    userId: string;
    username?: string;
    name?: string;
    feedToken?: string;
};

type ExtendedStreamDto = StreamDto & {
    isPrivate?: boolean;
    accessList?: StreamAccessEntry[];
    feedToken?: string;
    // The owner's alone
    downloads?: DownloadStats;
};

export default function StreamSummary({ stream, onAccessDenied, onImageResolved, onNameResolved }: StreamSummaryType) {

    const [summaryData, setSummaryData] = useState<ExtendedStreamDto>(),
        [isPrivate, setIsPrivate] = useState(false),
        [accessList, setAccessList] = useState<AccessUser[]>([]),
        [showShareDialog, setShowShareDialog] = useState(false),
        [showSettingsDialog, setShowSettingsDialog] = useState(false),
        [feedToken, setFeedToken] = useState<string | undefined>(),
        [tokenRevealed, setTokenRevealed] = useState(false),
        tokenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null),
        { user } = useAuth(),
        router = useRouter(),
        handleNavigation = (url?: string) => {
            if (url) {
                router.push(url);
            }
        };

    useEffect(() => {
        fetch(resolveApiUrl(`/${stream}`))
            .then((res) => {
                if (res.status === 403) {
                    onAccessDenied?.();
                    return null;
                }
                return res.json();
            })
            .then((data) => {
                if (data) {
                    setSummaryData(data);
                    setIsPrivate(data.isPrivate ?? false);
                    setFeedToken(data.feedToken);
                    if (data.imageUrl) {
                        onImageResolved?.(data.imageUrl);
                    }
                    if (data.title) {
                        onNameResolved?.(data.title);
                    }
                    if (data.accessList) {
                        setAccessList(data.accessList.map((a: StreamAccessEntry & { username?: string; name?: string }) => ({
                            userId: a.userId,
                            username: (a as AccessUser).username,
                            name: (a as AccessUser).name,
                            feedToken: a.feedToken,
                        })));
                    }
                }
            });
    }, [stream, onAccessDenied, onImageResolved, onNameResolved]);

    useEffect(() => {
        return () => {
            if (tokenTimerRef.current) clearTimeout(tokenTimerRef.current);
        };
    }, []);

    const handleTokenReveal = () => {
        if (tokenRevealed) {
            setTokenRevealed(false);
            if (tokenTimerRef.current) {
                clearTimeout(tokenTimerRef.current);
                tokenTimerRef.current = null;
            }
            return;
        }

        const revealToken = (token: string) => {
            setFeedToken(token);
            setTokenRevealed(true);
            tokenTimerRef.current = setTimeout(() => {
                setTokenRevealed(false);
                tokenTimerRef.current = null;
            }, 60000);
        };

        if (feedToken) {
            revealToken(feedToken);
        } else {
            fetch(resolveApiUrl(`/${stream}/token`), { method: 'POST' })
                .then((r) => r.json())
                .then((data) => {
                    if (data.feedToken) {
                        revealToken(data.feedToken);
                    }
                });
        }
    };

    if (!summaryData) {
        return <p>Loading...</p>;
    }

    const canEdit = user?.id === summaryData.userId;
    const hasUploadedImage = !!summaryData.imageUrl;
    const displayImage = summaryData.imageUrl ?? resolveAssetUrl('/icons/podcast.svg');

    const handleUpload = async (file: File, onProgress: (percent: number) => void) => {
        const formData = new FormData();
        formData.append('image', file);

        return new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', resolveApiUrl(`/${stream}/upload-image`));

            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    onProgress(Math.round((e.loaded / e.total) * 100));
                }
            };

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    const data = JSON.parse(xhr.responseText);
                    setSummaryData((prev) => prev ? { ...prev, imageUrl: resolveAssetUrl(`/uploads/${data.imageUrl}?max=600`) } : prev);
                    resolve();
                } else {
                    reject(new Error('Upload failed'));
                }
            };

            xhr.onerror = () => reject(new Error('Upload failed'));
            xhr.send(formData);
        });
    };

    const handlePrivacyToggle = async (newValue: boolean) => {
        try {
            const res = await fetch(resolveApiUrl(`/${stream}/privacy`), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isPrivate: newValue }),
            });
            if (res.ok) {
                const data = await res.json();
                setIsPrivate(data.isPrivate);
                if (data.accessList) {
                    setAccessList(data.accessList);
                }
            }
        } catch {
            // ignore
        }
    };

    const handleAccessAdded = (entry: AccessUser) => {
        setAccessList((prev) => [...prev, entry]);
    };

    const handleAccessRemoved = (userId: string) => {
        setAccessList((prev) => prev.filter((a) => a.userId !== userId));
    };

    return (
        <div className="stream-summary w-full h-auto shadow-card overflow-hidden flex flex-col bg-card">
            <div className="flex flex-col md:flex-row md:items-start">
                <div className="relative w-full h-[150px] md:w-1/3 md:h-[376] bg-card flex-shrink-0">
                    <ImageWithActions
                        src={displayImage}
                        alt={summaryData.title ?? ''}
                        canEdit={canEdit}
                        hasImage={hasUploadedImage}
                        onUpload={handleUpload}
                    />
                </div>
                <div className="p-4 flex-grow flex flex-col md:ml-4">
                    <EditableText
                        value={summaryData.title ?? ''}
                        canEdit={canEdit}
                        maxLength={FIELD_LIMITS.streamTitle}
                        tag="h2"
                        className="text-lg font-bold text-ink"
                        onSave={async (newTitle) => {
                            try {
                                const res = await fetch(resolveApiUrl(`/${stream}`), {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ title: newTitle }),
                                });
                                if (res.ok) {
                                    setSummaryData((prev) => prev ? { ...prev, title: newTitle } : prev);
                                    return true;
                                }
                            } catch { /* ignore */ }
                            return false;
                        }}
                    />
                    {summaryData.name && <p className="text-xs text-ink-5">{summaryData.name}</p>}
                    <p className="text-sm text-ink-3">{summaryData.description}</p>

                    <div className="mt-4 text-sm text-ink-4">
                        <p><strong>Author:</strong> {summaryData.author}</p>
                        <p><strong>Managing Editor:</strong> {summaryData.managingEditor}</p>
                        <p><strong>Web Master:</strong> {summaryData.webMaster}</p>
                        <p><strong>Language:</strong> {summaryData.language}</p>
                        <p><strong>Published Date:</strong> {summaryData.pubDate}</p>
                        <p><strong>TTL:</strong> {summaryData.ttl} minutes</p>
                        {canEdit && summaryData.downloads && (
                            <p title="Each listener counts once a day per episode; your own listens are not counted">
                                <strong>Downloads:</strong> {summaryData.downloads.total} ({recentDownloads(summaryData.downloads)} in the last {RECENT_DOWNLOAD_DAYS} days)
                            </p>
                        )}
                    </div>

                    <div className="mt-4">
                        <p className="text-sm font-bold text-ink-2">Categories:</p>
                        <ul className="list-disc list-inside text-sm text-ink-3">
                            {summaryData.categories?.map((category, index) => (
                                <li key={index}>{category}</li>
                            ))}
                        </ul>
                    </div>

                    <div className="mt-4 flex flex-col md:flex-row md:items-center gap-2">
                        <div className="flex items-center gap-2">
                            <FeedLink
                                streamId={summaryData.id}
                                feedUrl={summaryData.feedUrl}
                                isPrivate={isPrivate}
                                feedToken={feedToken}
                                onTokenResolved={setFeedToken}
                                title="Click to copy the feed URL, or open it in a new tab"
                                className='bg-card-deep hover:bg-accent text-sm px-4 py-2 rounded-sm text-ink no-underline'
                            >
                                RSS Feed
                            </FeedLink>
                            <button
                                onClick={() => handleNavigation(summaryData.siteUrl)}
                                className='bg-card-deep hover:bg-accent text-sm px-4 py-2 rounded-sm'
                            >
                                Visit Site
                            </button>
                        </div>
                        {(canEdit || (isPrivate && user)) && (
                            <div className="flex items-center gap-2">
                                {canEdit && (
                                    <PrivacyToggle isPrivate={isPrivate} onChange={handlePrivacyToggle} />
                                )}
                                {canEdit && (
                                    <IconExpandTextButton
                                        icon={<GearIcon size={20} />}
                                        iconAlt="Settings"
                                        text="Settings"
                                        onClick={() => setShowSettingsDialog(true)}
                                    />
                                )}
                                {isPrivate && canEdit && (
                                    <IconExpandTextButton
                                        icon={<PersonIcon size={20} />}
                                        iconAlt="Allowed Users"
                                        text="Allowed Users"
                                        onClick={() => setShowShareDialog(true)}
                                    />
                                )}
                                {isPrivate && user && !tokenRevealed && (
                                    <IconExpandTextButton
                                        icon={<KeySvg />}
                                        iconAlt="Auth Token"
                                        text="Auth Token"
                                        onClick={handleTokenReveal}
                                    />
                                )}
                                {tokenRevealed && feedToken && (
                                    <div className="flex items-center bg-card-deep rounded-sm px-2 py-2.5 text-sm gap-2">
                                        <code className="text-xs text-ink select-all">
                                            {feedToken}
                                        </code>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                navigator.clipboard.writeText(feedToken);
                                                toast('Token copied to clipboard');
                                            }}
                                            className="flex-shrink-0 cursor-pointer hover:opacity-70"
                                            title="Copy token"
                                        >
                                            <span className="w-4 h-4 inline-block"><CopySvg className="w-full h-full" /></span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {showSettingsDialog && summaryData.id && (
                <StreamSettingsDialog
                    streamId={summaryData.id}
                    autoSplit={summaryData.autoSplit}
                    splitMinutes={summaryData.splitMinutes}
                    onSaved={(settings) => setSummaryData((prev) => prev ? { ...prev, ...settings } : prev)}
                    onClose={() => setShowSettingsDialog(false)}
                />
            )}

            {showShareDialog && summaryData.id && (
                <ShareDialog
                    streamId={summaryData.id}
                    accessList={accessList}
                    onAccessAdded={handleAccessAdded}
                    onAccessRemoved={handleAccessRemoved}
                    onClose={() => setShowShareDialog(false)}
                />
            )}
        </div>
    );
}
