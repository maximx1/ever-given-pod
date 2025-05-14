"use client";

import { useState } from "react";
import Image from "next/image";

type IconExpandTextButtonProps = {
    iconSrc: string;
    iconAlt?: string;
    text: string;
    download?: boolean | string;
    className?: string;
    debounceMs?: number;
    onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
    disabled?: boolean;
};

export default function IconExpandTextButton({
    iconSrc,
    iconAlt = "icon",
    text,
    download = false,
    className = "",
    debounceMs,
    onClick,
    disabled = false
}: IconExpandTextButtonProps) {
    const [debounced, setDebounced] = useState(false),
        isDisabled = disabled || debounced,
        handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
            e.preventDefault();
            if (disabled || debounced) return;
            if (debounceMs != null) {
                setDebounced(true);
                setTimeout(() => setDebounced(false), debounceMs);
            }
            onClick?.(e);
        };

    return (
        <a
            download={download}
            className={`flex items-center group transition-all duration-200 bg-transparent rounded-sm hover:bg-purple-400 hover:shadow pl-1 pr-2 py-1 text-sm select-none ${className}`}
            onClick={handleClick}
            tabIndex={isDisabled ? -1 : 0}
            aria-disabled={isDisabled}
        >
            <Image src={iconSrc} alt={iconAlt} width={20} height={20} />
            <span className="overflow-hidden max-w-0 group-hover:max-w-[80px] transition-all duration-200 whitespace-nowrap ml-1">
                {text}
            </span>
        </a>
    );
}