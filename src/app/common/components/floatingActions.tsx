"use client";

import { createContext, useContext } from 'react';
import { createPortal } from 'react-dom';

// The element in the page layout that floating buttons are drawn into (see layout/main.tsx)
export const FloatingActionsSlot = createContext<HTMLElement | null>(null);

// Draws its children in the bottom corner of the screen. Position each child with
// `position: absolute` and `bottom` / `right` offsets; they are measured from the corner
// of the visible page, above the footer and the player.
export default function FloatingActions({ children }: { children: React.ReactNode }) {
    const slot = useContext(FloatingActionsSlot);
    return slot ? createPortal(children, slot) : null;
}
