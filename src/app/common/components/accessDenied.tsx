"use client";

import LockSvg from '@/icons/lock.svg';
import DiscoveryGrid from '@/app/common/components/discoveryGrid';
import styles from './accessDenied.module.css';

export default function AccessDenied() {
    return (
        <>
            <div className="flex flex-col items-center justify-center py-20 px-4">
                <div className={`w-[80px] h-[80px] mb-6 opacity-60 ${styles.lockIcon}`}>
                    <LockSvg width={80} height={80} />
                </div>
                <h2 className="text-2xl font-bold text-purple-300 mb-2">This stream is private</h2>
                <p className="text-purple-200 text-center max-w-md">
                    You don&apos;t have access to this stream. The owner has restricted it to specific users.
                </p>
            </div>

            <DiscoveryGrid
                title="Perhaps you can try a different stream"
                subtitle="Explore some of these instead:"
            />
        </>
    );
}
