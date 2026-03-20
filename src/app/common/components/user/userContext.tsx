"use client";

import { resolveAppUrl, resolveApiUrl } from "@/common/helpers/api";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/common/context/AuthContext";

export default function UserContext() {
    const router = useRouter();
    const { user, setUser } = useAuth();

    const handleSignUp = () => {
        router.push(resolveAppUrl('/signup'));
    };

    const handleLogIn = () => {
        router.push(resolveAppUrl('/login'));
    };

    const handleLogout = async () => {
        await fetch(resolveApiUrl('/logout'), { method: 'POST' });
        setUser(null);
        router.push(resolveAppUrl('/'));
    };

    if (user) {
        return (
            <div className="flex items-center space-x-2">
                <span className="text-sm font-semibold">{`Hi, ${user.name || user.email}`}</span>
                <button
                    onClick={handleLogout}
                    className="px-3 py-1.5 rounded-md bg-purple-400 text-white text-xs font-semibold hover:bg-purple-600 transition"
                >
                    Log Out
                </button>
            </div>
        );
    }

    return (
        <div className="flex items-center space-x-2">
            <button
                type="button"
                onClick={handleSignUp}
                className="px-3 py-1.5 rounded-md bg-purple-400 text-white text-xs font-semibold hover:bg-purple-600 transition"
            >
                Sign Up
            </button>
            <button
                type="button"
                onClick={handleLogIn}
                className="px-3 py-1.5 rounded-md bg-purple-400 text-white text-xs font-semibold hover:bg-purple-600 transition"
            >
                Log In
            </button>
        </div>
    );
}
