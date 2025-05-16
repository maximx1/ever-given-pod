"use client";

import IconExpandTextButton from "./iconExpandTextButton";
import { useRouter } from "next/navigation";

type LinkIconButtonProps = {
    href: string;
    iconSrc: string;
    iconAlt?: string;
    text: string;
    className?: string;
    debounceMs?: number;
    disabled?: boolean;
};

export default function LinkIconButton({
    href,
    iconSrc,
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
            iconAlt={iconAlt}
            text={text}
            className={className}
            debounceMs={debounceMs}
            disabled={disabled}
            onClick={onClick}
        />
    );
}