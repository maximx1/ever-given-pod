"use client";

import { useRouter } from "next/navigation";
import { ReactNode } from "react";
import IconExpandTextButton from "./iconExpandTextButton";

type LinkIconButtonProps = {
    href: string;
    iconSrc?: string;
    icon?: ReactNode;
    iconAlt?: string;
    text: string;
    className?: string;
    debounceMs?: number;
    disabled?: boolean;
};

export default function LinkIconButton({
    href,
    iconSrc,
    icon,
    iconAlt = "icon",
    text,
    className = "",
    debounceMs,
    disabled = false
}: LinkIconButtonProps) {
    const router = useRouter(),
        onClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
            e.preventDefault();
            if (disabled || href == null) return;
            router.push(href);
        };
    return (
        <IconExpandTextButton
            iconSrc={iconSrc}
            icon={icon}
            iconAlt={iconAlt}
            text={text}
            className={className}
            debounceMs={debounceMs}
            disabled={disabled}
            onClick={onClick}
        />
    );
}