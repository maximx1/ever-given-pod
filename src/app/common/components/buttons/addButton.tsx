"use client";

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { resolveAppUrl } from '@/common/helpers/api';

export default function AddButton({ stream }: { stream?: string | string[] }) {
    const router = useRouter(),
        defaultBottomOffset = 16,
        [bottomOffset, setBottomOffset] = useState(defaultBottomOffset);

    const handleClick = () => {
        router.push(resolveAppUrl(`/${stream}/publish`));
    };

    useEffect(() => {
        const handleScroll = () => {
            const footer = document.querySelector('footer');
            if (!footer) return;

            const footerRect = footer.getBoundingClientRect(),
                viewportHeight = window.innerHeight,
                footerVisibleHeight = Math.max(0, viewportHeight - footerRect.top);

            setBottomOffset(footerVisibleHeight + 16);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div
            onClick={handleClick}
            style={{ bottom: `${bottomOffset}px` }}
            className="fixed bottom-[70px] right-4 w-16 h-16 z-10 shadow-md rounded-full flex items-center justify-center bg-purple-500 cursor-pointer hover:bg-purple-600 transition-colors"
        >
            <span className="text-3xl font-bold text-white">+</span>
        </div>
    );
}