import jwt from 'jsonwebtoken';
import cookie from 'cookie';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-now';
const JWT_EXPIRES_IN = '1h';

export type SessionPayload = {
    userId: string;
    username: string;
    email?: string;
    name?: string;
};

export const signSession = (payload: SessionPayload): string => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

export const verifyRawSession = (token: string): SessionPayload | null => {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded as SessionPayload;
    } catch {
        return null;
    }
};

export const verifySession = (token: string): SessionPayload | null => {
    if (!token) return null;
    if (isSessionRevoked(token)) return null;
    return verifyRawSession(token);
};

export const parseSessionCookie = (cookieHeader?: string) => {
    if (!cookieHeader) return null;

    const parsed = cookie.parse(cookieHeader);
    const token = parsed.session;
    if (!token) return null;
    return verifySession(token);
};

export const buildSessionCookieHeader = (token: string) =>
    cookie.serialize('session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60,
    });

const revokedSessions = new Set<string>();

export const isSessionRevoked = (token: string) => revokedSessions.has(token);

export const revokeSession = (token: string) => {
    if (token) revokedSessions.add(token);
};

export const clearSessionCookieHeader = () =>
    cookie.serialize('session', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
    });
