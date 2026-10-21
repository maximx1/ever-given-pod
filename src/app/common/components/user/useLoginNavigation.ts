"use client";

import { useRouter, usePathname } from "next/navigation";
import { resolveAppUrl } from "@/common/helpers/api";

// Opens the log in or sign up page, remembering the current page so the visitor is sent back
// to it afterwards (the login and signup pages read 'loginRedirect')
export function useLoginNavigation() {
    const router = useRouter();
    const pathname = usePathname();

    return (target: '/login' | '/signup') => {
        if (pathname && pathname !== '/login' && pathname !== '/signup') {
            sessionStorage.setItem('loginRedirect', pathname);
        }
        router.push(resolveAppUrl(target));
    };
}
