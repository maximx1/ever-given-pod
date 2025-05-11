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
        </div>
    )
}