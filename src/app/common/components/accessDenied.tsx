"use client";

import LockSvg from '@/icons/lock.svg';
import DiscoveryGrid from '@/app/common/components/discoveryGrid';
import { useAuth } from '@/app/common/context/AuthContext';
import { useLoginNavigation } from '@/app/common/components/user/useLoginNavigation';
import styles from './accessDenied.module.css';

export default function AccessDenied() {
    const { user, loading } = useAuth();
    const goToLogin = useLoginNavigation();
    // Someone not logged in may well be one of the people the owner let in
    const loggedOut = !loading && !user;

    return (
        <>
            <div className="flex flex-col items-center justify-center py-20 px-4">
                <div className={`w-[80px] h-[80px] mb-6 opacity-60 ${styles.lockIcon}`}>
                    <LockSvg />
                </div>
                <h2 className="text-2xl font-bold text-on-page-strong mb-2">This stream is private</h2>
                <p className="text-on-page text-center max-w-md">
                    {loggedOut
                        ? 'The owner has restricted it to specific users. If you are one of them, log in to see it.'
                        : 'You don’t have access to this stream. The owner has restricted it to specific users.'}
                </p>
                {loggedOut && (
                    <button
                        type="button"
                        onClick={() => goToLogin('/login')}
                        className="mt-6 px-6 py-3 rounded-md bg-accent text-on-accent font-semibold hover:bg-accent-strong transition cursor-pointer"
                    >
                        Log In
                    </button>
                )}
            </div>

            <DiscoveryGrid
                title="Perhaps you can try a different stream"
                subtitle="Explore some of these instead:"
            />
        </>
    );
}
