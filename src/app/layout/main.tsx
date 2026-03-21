"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { resolveAppUrl, resolveAssetUrl } from '@/common/helpers/api';
import UserContext from '@/app/common/components/user/userContext';

type MainProps = {
    children: React.ReactNode;
    showUserContext?: boolean;
};

export default function Main({ children, showUserContext = true }: MainProps) {
    const router = useRouter();

    const handleHeaderClick = () => {
        router.push(resolveAppUrl('/'));
    };
  
    return (
        <div className="min-h-screen flex flex-col">
            <header className="bg-purple-300 py-4 sticky top-0 z-10">
                <div className="mx-auto w-full max-w-full px-4 relative">
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center cursor-pointer" onClick={handleHeaderClick}>
                        <Image src={resolveAssetUrl("/site-icon.svg")} alt="Site Icon" width={32} height={32} className="mr-2" />
                        <h1 className="text-2xl font-bold">Ever Givin Pod</h1>
                    </div>
                    <div className="flex justify-end h-[22px]">
                        {showUserContext && <UserContext />}
                    </div>
                </div>
            </header>
            <main className="flex flex-grow flex-col">
                {children}
            </main>
            <footer className="bg-purple-300 py-4">
                <p className="text-right text-sm pr-4">© {new Date().getFullYear()} Ever Givin Pod</p>
            </footer>
        </div>
    )
}