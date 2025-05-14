"use client";

import IconExpandTextButton from "./IconExpandTextButton";

type DownloadButtonProps = {
    href: string;
    iconSrc: string;
    iconAlt?: string;
    text: string;
    download?: boolean | string;
    className?: string;
    debounceMs?: number;
    disabled?: boolean;
};

export default function DownloadButton({
    href,
    iconSrc,
    iconAlt = "icon",
    text,
    download = false,
    className = "",
    debounceMs,
    disabled = false
}: DownloadButtonProps) {
    const onClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        if (disabled) return;

        const link = document.createElement("a");
        link.href = href;
        if (download) {
            link.setAttribute('download', typeof download === 'string' ? download : '');
        }
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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