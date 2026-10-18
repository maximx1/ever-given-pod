"use client";

import { useState, useRef, useEffect } from "react";
import { resolveAppUrl, resolveApiUrl, resolveAssetUrl } from "@/common/helpers/api";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/app/common/context/AuthContext";
import PersonIcon from "@/app/common/components/icons/personIcon";

export default function UserContext() {
    const router = useRouter();
    const pathname = usePathname();
    const { user, loading, setUser } = useAuth();
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!menuOpen) return;
        const handleClick = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        };
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setMenuOpen(false);
        };
        document.addEventListener('mousedown', handleClick);
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('mousedown', handleClick);
            document.removeEventListener('keydown', handleKey);
        };
    }, [menuOpen]);

    const handleLogout = async () => {
        setMenuOpen(false);
        await fetch(resolveApiUrl('/logout'), { method: 'POST' });
        setUser(null);
        router.push(resolveAppUrl('/'));
    };

    if (loading) {
        return <div className="w-[22px] h-[22px]" />;
    }

    if (user) {
        const hasProfileImage = !!user.imageUrl;
        const imgSrc = user.imageUrl
            ? resolveAssetUrl(`/uploads/${user.imageUrl}?max=160`)
            : undefined;

        return (
            // A square as tall as the header, flush with its right edge
            <div className="absolute top-0 right-0 h-full aspect-square" ref={menuRef}>
                <button
                    type="button"
                    aria-label="Account menu"
                    aria-expanded={menuOpen}
                    onClick={() => setMenuOpen(v => !v)}
                    className="flex h-full w-full items-center justify-center cursor-pointer hover:ring-2 hover:ring-inset hover:ring-purple-500 transition"
                >
                    {hasProfileImage ? (
                        <img
                            src={imgSrc}
                            alt={user.name || user.username}
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <PersonIcon size={40} className="text-purple-500" />
                    )}
                </button>
                {menuOpen && (
                    <div className="absolute right-0 top-full mt-1 bg-white rounded-md shadow-lg py-1 min-w-[140px] z-50">
                        <a
                            href={resolveAppUrl(`/${user.username}`)}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-purple-100"
                            onClick={() => setMenuOpen(false)}
                        >
                            Profile
                        </a>
                        <button
                            onClick={handleLogout}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-purple-100"
                        >
                            Log Out
                        </button>
                    </div>
                )}
            </div>
        );
    }

    const navigateWithRedirect = (target: string) => {
        if (pathname && pathname !== '/login' && pathname !== '/signup') {
            sessionStorage.setItem('loginRedirect', pathname);
        }
        router.push(resolveAppUrl(target));
    };

    return (
        <div className="flex items-center space-x-2">
            <button
                type="button"
                onClick={() => navigateWithRedirect('/signup')}
                className="px-3 py-1.5 rounded-md bg-purple-400 text-white text-xs font-semibold hover:bg-purple-600 transition"
            >
                Sign Up
            </button>
            <button
                type="button"
                onClick={() => navigateWithRedirect('/login')}
                className="px-3 py-1.5 rounded-md bg-purple-400 text-white text-xs font-semibold hover:bg-purple-600 transition"
            >
                Log In
            </button>
        </div>
    );
}