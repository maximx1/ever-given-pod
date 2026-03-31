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
import IconExpandTextButton from '@/app/common/components/buttons/iconExpandTextButton';
import EditableText from '@/app/common/components/editableText';
import PersonIcon from '@/app/common/components/icons/personIcon';
import KeySvg from '@/icons/key.svg';
import CopySvg from '@/icons/copy.svg';
import { FIELD_LIMITS } from '@/common/limits';
import Image from 'next/image';

type StreamSummaryType = {
    stream?: string | string[];
    onAccessDenied?: () => void;
    onImageResolved?: (imageUrl: string) => void;
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
};

export default function StreamSummary({ stream, onAccessDenied, onImageResolved }: StreamSummaryType) {

    const [summaryData, setSummaryData] = useState<ExtendedStreamDto>(),
        [isPrivate, setIsPrivate] = useState(false),
        [accessList, setAccessList] = useState<AccessUser[]>([]),
        [showShareDialog, setShowShareDialog] = useState(false),
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
    }, [stream]);

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
        <div className="stream-summary w-full h-auto shadow-md overflow-hidden flex flex-col bg-purple-200">
            <div className="flex flex-col md:flex-row md:items-start">
                <div className="relative w-full h-[150px] md:w-1/3 md:h-[376] bg-purple-200 flex-shrink-0">
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
                        className="text-lg font-bold text-gray-800"
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
                    {summaryData.name && <p className="text-xs text-gray-400">{summaryData.name}</p>}
                    <p className="text-sm text-gray-600">{summaryData.description}</p>

                    <div className="mt-4 text-sm text-gray-500">
                        <p><strong>Author:</strong> {summaryData.author}</p>
                        <p><strong>Managing Editor:</strong> {summaryData.managingEditor}</p>
                        <p><strong>Web Master:</strong> {summaryData.webMaster}</p>
                        <p><strong>Language:</strong> {summaryData.language}</p>
                        <p><strong>Published Date:</strong> {summaryData.pubDate}</p>
                        <p><strong>TTL:</strong> {summaryData.ttl} minutes</p>
                    </div>

                    <div className="mt-4">
                        <p className="text-sm font-bold text-gray-700">Categories:</p>
                        <ul className="list-disc list-inside text-sm text-gray-600">
                            {summaryData.categories?.map((category, index) => (
                                <li key={index}>{category}</li>
                            ))}
                        </ul>
                    </div>

                    <div className="mt-4 flex flex-col md:flex-row md:items-center gap-2">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handleNavigation(summaryData.feedUrl)}
                                className='bg-purple-400 hover:bg-purple-500 text-sm px-4 py-2 rounded-sm'
                            >
                                RSS Feed
                            </button>
                            <button
                                onClick={() => handleNavigation(summaryData.siteUrl)}
                                className='bg-purple-400 hover:bg-purple-500 text-sm px-4 py-2 rounded-sm'
                            >
                                Visit Site
                            </button>
                        </div>
                        {(canEdit || (isPrivate && user)) && (
                            <div className="flex items-center gap-2">
                                {canEdit && (
                                    <PrivacyToggle isPrivate={isPrivate} onChange={handlePrivacyToggle} />
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
                                        icon={<KeySvg width={20} height={20} />}
                                        iconAlt="Auth Token"
                                        text="Auth Token"
                                        onClick={handleTokenReveal}
                                    />
                                )}
                                {tokenRevealed && feedToken && (
                                    <div className="flex items-center bg-purple-400 rounded-sm px-2 py-2.5 text-sm gap-2">
                                        <code className="text-xs text-gray-800 select-all">
                                            {feedToken}
                                        </code>
                                        <button
                                            type="button"
                                            onClick={() => navigator.clipboard.writeText(feedToken)}
                                            className="flex-shrink-0 cursor-pointer hover:opacity-70"
                                            title="Copy token"
                                        >
                                            <CopySvg width={16} height={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

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
