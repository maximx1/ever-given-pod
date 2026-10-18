"use client";

import Image, { ImageProps } from 'next/image';
import { useEffect, useState } from 'react';
import { isUploadUrl, uploadImageLoader } from '@/common/helpers/uploadImageLoader';

type UploadImageProps = Omit<ImageProps, 'src' | 'loader' | 'onError'> & {
    src?: string;
    // Tried in order when an image fails to load, such as a season cover and then an icon
    fallbacks?: (string | undefined)[];
};

// next/image for uploads: a srcset of sizes made on demand by the uploads endpoint, lazy loading
// and WebP where the browser takes it. Anything else (icons, previews) is shown as it is.
export default function UploadImage({ src, alt, fallbacks = [], ...props }: UploadImageProps) {
    const candidates = [src, ...fallbacks].filter((c): c is string => !!c);
    const key = candidates.join('|');
    const [index, setIndex] = useState(0);
    useEffect(() => setIndex(0), [key]);

    const current = candidates[Math.min(index, candidates.length - 1)];
    if (!current) return null;

    const optimized = isUploadUrl(current);
    return (
        <Image
            {...props}
            alt={alt}
            src={current}
            loader={optimized ? uploadImageLoader : undefined}
            unoptimized={!optimized || props.unoptimized}
            onError={() => setIndex((i) => Math.min(i + 1, candidates.length - 1))}
        />
    );
}
