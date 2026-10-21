"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { resolveAppUrl, resolveAssetUrl } from '@/common/helpers/api';
import UserContext from '@/app/common/components/user/userContext';
import FloatingPlayer from '@/app/common/components/player/floatingPlayer';
import ResumeDialog from '@/app/common/components/player/resumeDialog';
import { usePlayer } from '@/app/common/context/PlayerContext';
import { FloatingActionsSlot } from '@/app/common/components/floatingActions';
import ThemeToggle from '@/app/common/components/theme/themeToggle';

const PLAYER_BAR_HEIGHT = 72;

type MainProps = {
    children: React.ReactNode;
    showUserContext?: boolean;
};

export default function Main({ children, showUserContext = true }: MainProps) {
    const router = useRouter();
    const { resumePrompt, resolveResumePrompt, dismissResumePrompt, queue } = usePlayer();
    const [floatingSlot, setFloatingSlot] = useState<HTMLElement | null>(null);
    // The player is fixed over the bottom of the page (and replaces the footer), so leave room for it
    const playerPad = queue.length > 0 ? PLAYER_BAR_HEIGHT : 0;

    const handleHeaderClick = () => {
        router.push(resolveAppUrl('/'));
    };
  
    return (
        <div className="min-h-screen flex flex-col">
            <header className="bg-card-strong py-4 sticky top-0 z-10">
                <ThemeToggle className="absolute left-2 top-1/2 -translate-y-1/2" />
                <div className="mx-auto w-full max-w-full px-4">
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center cursor-pointer" onClick={handleHeaderClick}>
                        <Image src={resolveAssetUrl("/icons/site-icon.svg")} alt="Site Icon" width={32} height={32} className="mr-2" />
                        <h1 className="text-xl sm:text-2xl font-bold whitespace-nowrap">Ever Givin Pod</h1>
                    </div>
                    <div className="flex justify-end h-[22px]">
                        {showUserContext && <UserContext />}
                    </div>
                </div>
            </header>
            <main className="flex flex-grow flex-col" style={{ paddingBottom: playerPad }}>
                <FloatingActionsSlot.Provider value={floatingSlot}>
                    {children}
                </FloatingActionsSlot.Provider>
                {/* Floating buttons are drawn here. It sticks to the bottom of the screen until the
                    end of the page arrives, then stays above the footer, with no scroll handler. */}
                <div
                    ref={setFloatingSlot}
                    className="sticky z-10 mt-auto h-0 pointer-events-none [&>*]:pointer-events-auto"
                    style={{ bottom: playerPad }}
                />
            </main>
            <footer className={`${queue.length > 0 ? 'hidden' : ''} bg-card-strong py-4`}>
                <p className="text-right text-sm pr-4">© 2025-{new Date().getFullYear()} Ever Givin Pod</p>
            </footer>
            <FloatingPlayer />
            {resumePrompt && (
                <ResumeDialog
                    episodeName={resumePrompt.item.title}
                    elapsed={resumePrompt.savedPosition}
                    total={resumePrompt.savedDuration}
                    onResume={() => resolveResumePrompt(true)}
                    onRestart={() => resolveResumePrompt(false)}
                    onClose={dismissResumePrompt}
                />
            )}
        </div>
    )
}