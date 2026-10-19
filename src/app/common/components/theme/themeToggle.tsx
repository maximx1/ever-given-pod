"use client";

import { useEffect, useState } from 'react';
import { THEME_STORAGE_KEY } from '@/app/common/components/theme/themeScript';
import SunSvg from '@/icons/sun.svg';
import MoonSvg from '@/icons/moon.svg';
import MonitorSvg from '@/icons/monitor.svg';

type ThemeChoice = 'system' | 'light' | 'dark';

const NEXT: Record<ThemeChoice, ThemeChoice> = { system: 'light', light: 'dark', dark: 'system' };
const LABELS: Record<ThemeChoice, string> = { system: 'Theme: follows the system', light: 'Theme: light', dark: 'Theme: dark' };
const ICONS = { system: MonitorSvg, light: SunSvg, dark: MoonSvg };

const readChoice = (): ThemeChoice => {
    const theme = document.documentElement.dataset.theme;
    return theme === 'light' || theme === 'dark' ? theme : 'system';
};

// Cycles system, light and dark. The choice is kept in this browser only.
export default function ThemeToggle({ className }: { className?: string }) {
    const [choice, setChoice] = useState<ThemeChoice>('system');
    useEffect(() => setChoice(readChoice()), []);

    const handleClick = () => {
        const next = NEXT[choice];
        if (next === 'system') {
            delete document.documentElement.dataset.theme;
        } else {
            document.documentElement.dataset.theme = next;
        }
        try {
            if (next === 'system') localStorage.removeItem(THEME_STORAGE_KEY);
            else localStorage.setItem(THEME_STORAGE_KEY, next);
        } catch {
            // Storage blocked: the theme still applies until the page is reloaded
        }
        setChoice(next);
    };

    const Icon = ICONS[choice];
    return (
        <button
            type="button"
            onClick={handleClick}
            aria-label={LABELS[choice]}
            title={LABELS[choice]}
            className={`flex items-center justify-center w-9 h-9 rounded-md text-ink-2 hover:bg-card-deep hover:text-ink transition cursor-pointer ${className ?? ''}`}
        >
            <Icon className="w-5 h-5" />
        </button>
    );
}
