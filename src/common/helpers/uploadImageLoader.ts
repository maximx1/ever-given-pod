import type { ImageLoader } from 'next/image';

// An uploaded image (served from /uploads/) rather than a bundled icon or a picked file's preview
export const isUploadUrl = (src?: string): src is string =>
    !!src && /\/uploads\/[^/?#]+/.test(src) && !/\.svg$/i.test(src.split('?')[0]);

// next/image asks for each width it lists in srcset; the uploads endpoint resizes to it. Any
// other query (a private stream's feed token) is kept, and ?max= gives way to the width.
export const uploadImageLoader: ImageLoader = ({ src, width, quality }) => {
    const [base, query = ''] = src.split('?');
    const params = new URLSearchParams(query);
    params.delete('max');
    params.set('w', String(width));
    if (quality) params.set('q', String(quality));
    return `${base}?${params}`;
};
