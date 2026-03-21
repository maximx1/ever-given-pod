"use client";

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { resolveAppUrl, resolveApiUrl } from '@/common/helpers/api';
import { useAuth } from '@/app/common/context/AuthContext';
import { useFooterHeight } from '@/app/common/hooks/useFooterHeight';
import { StreamDto } from '@/common/dtos/streamDto';

export default function AddButton({ stream }: { stream?: string | string[] }) {
    const router = useRouter(),
        { user } = useAuth(),
        visibleFooterHeight = useFooterHeight(),
        [isOwner, setIsOwner] = useState(false),
        [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user || !stream) {
            setLoading(false);
            return;
        }

        const checkOwnership = async () => {
            try {
                const res = await fetch(resolveApiUrl(`/${stream}`));
                if (res.ok) {
                    const streamData: StreamDto = await res.json();
                    setIsOwner(streamData.userId === user.id);
                } else {
                    setIsOwner(false);
                }
            } catch (err) {
                setIsOwner(false);
            } finally {
                setLoading(false);
            }
        };

        checkOwnership();
    }, [user, stream]);

    const handleClick = () => {
        router.push(resolveAppUrl(`/${stream}/publish`));
    };

    if (loading || !isOwner) {
        return null;
    }

    return (
        <div
            onClick={handleClick}
            style={{ position: 'fixed', bottom: `${16 + visibleFooterHeight}px`, right: '16px' }}
            className="w-16 h-16 z-10 shadow-md rounded-full flex items-center justify-center bg-purple-500 cursor-pointer hover:bg-purple-600 transition-colors"
        >
            <span className="text-3xl font-bold text-white">+</span>
        </div>
    );
}