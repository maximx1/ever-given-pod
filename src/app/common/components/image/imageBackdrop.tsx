"use client";

import UploadImage from '@/app/common/components/image/uploadImage';

type ImageBackdropProps = {
    src?: string;
    fallbacks?: (string | undefined)[];
};

// A blurred, cropped copy of a picture filling its box, drawn behind the picture itself so a
// picture of another shape doesn't leave empty bands around it. Its parent must be positioned.
// A small size is enough once blurred.
export default function ImageBackdrop({ src, fallbacks }: ImageBackdropProps) {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
            <UploadImage
                src={src}
                fallbacks={fallbacks}
                alt=""
                fill
                sizes="64px"
                className="object-cover blur-xl scale-125 opacity-60"
            />
        </div>
    );
}
