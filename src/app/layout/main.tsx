"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";

type MainProps = {
    children: React.ReactNode;
};

export default function Main({ children }: MainProps) {
    const router = useRouter();

    const handleHeaderClick = () => {
        router.push(`${process.env.NEXT_PUBLIC_API_BASE_URL}`);
    };
  
    return (
        <div className="min-h-screen flex flex-col">
            <header className="bg-purple-300 py-4 sticky top-0 z-10 flex items-center justify-center">
                <div className="flex items-center cursor-pointer" onClick={handleHeaderClick}>
                    <Image src="/site-icon.svg" alt="Site Icon" width={32} height={32} className="mr-2" />
                    <h1 className="text-2xl font-bold">Ever Givin Pod</h1>
                </div>
            </header>
            <main className="flex-grow">
                {children}
            </main>
            <footer className="bg-purple-300 py-4 mt-4">
                <p className="text-right text-sm pr-4">© 2025 Ever Givin Pod</p>
            </footer>
        </div>
    )
}