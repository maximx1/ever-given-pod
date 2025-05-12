"use client";

import { useRouter } from "next/navigation";

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
            <header className="bg-purple-300 py-4 sticky top-0 z-10">
                <h1 className="text-center text-2xl font-bold cursor-pointer" onClick={handleHeaderClick}>Ever Givin Pod</h1>
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