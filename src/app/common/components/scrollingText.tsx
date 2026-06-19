"use client";

import { useEffect, useRef, useState } from 'react';

type ScrollingTextProps = {
    text: string;
    className?: string;
};

export default function ScrollingText({ text, className = '' }: ScrollingTextProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLSpanElement>(null);
    const [shouldScroll, setShouldScroll] = useState(false);

    useEffect(() => {
        const container = containerRef.current;
        const textEl = textRef.current;
        if (!container || !textEl) return;

        const check = () => {
            setShouldScroll(textEl.scrollWidth > container.clientWidth + 1);
        };

        check();
        const observer = new ResizeObserver(check);
        observer.observe(container);
        return () => observer.disconnect();
    }, [text]);

    return (
        <div ref={containerRef} className={`overflow-hidden whitespace-nowrap ${className}`}>
            <span
                ref={textRef}
                className={shouldScroll ? 'inline-block animate-marquee' : 'inline-block'}
            >
                {text}
            </span>
        </div>
    );
}
