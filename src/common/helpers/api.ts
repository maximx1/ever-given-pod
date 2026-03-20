export const getApiBaseUrl = (): string | undefined => {
    const raw = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
    if (!raw) return undefined;
    return raw.replace(/\/+$/, '');
};

const ensureLeadingSlash = (path: string): string => path.startsWith('/') ? path : `/${path}`;

export const resolveApiUrl = (relativePath: string): string => {
    const path = ensureLeadingSlash(relativePath);
    const base = getApiBaseUrl();
    const apiPath = `/api${path}`;
    return base ? `${base}${apiPath}` : apiPath;
};

export const resolveAppUrl = (relativePath: string): string => {
    const path = ensureLeadingSlash(relativePath);
    const base = getApiBaseUrl();
    return base ? `${base}${path}` : path;
};

export const resolveAssetUrl = (relativePath: string): string => {
    const path = ensureLeadingSlash(relativePath);
    const base = getApiBaseUrl();
    return base ? `${base}${path}` : path;
};
