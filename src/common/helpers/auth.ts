import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { parse, serialize } from 'cookie';
import { StreamDto } from '../dtos/streamDto';

const JWT_EXPIRES_IN = '1h';
const PLACEHOLDER_SECRETS = new Set(['change-me-now', 'super-secret-please-change-me']);
const globalForAuth = globalThis as typeof globalThis & { ephemeralJwtSecret?: string };

// Without a real secret configured, sign with a random per-process one rather than a publicly known default
const getJwtSecret = (): string => {
    const configured = process.env.JWT_SECRET;
    if (configured && !PLACEHOLDER_SECRETS.has(configured)) return configured;

    if (!globalForAuth.ephemeralJwtSecret) {
        globalForAuth.ephemeralJwtSecret = crypto.randomBytes(48).toString('hex');
        console.warn('JWT_SECRET is not set (or is a placeholder). Using a temporary secret; everyone is signed out when the server restarts.');
    }
    return globalForAuth.ephemeralJwtSecret;
};

export type SessionPayload = {
    userId: string;
    username: string;
    email?: string;
    name?: string;
};

export const signSession = (payload: SessionPayload): string => {
    return jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN });
};

export const verifyRawSession = (token: string): SessionPayload | null => {
    try {
        const decoded = jwt.verify(token, getJwtSecret());
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

    const parsed = parse(cookieHeader);
    const token = parsed.session;
    if (!token) return null;
    return verifySession(token);
};

export const canViewStream = (stream: StreamDto, session: SessionPayload | null) => {
    if (!stream.isPrivate) return true;
    if (!session) return false;
    return session.userId === stream.userId || !!stream.accessList?.some((a) => a.userId === session.userId);
};

export const buildSessionCookieHeader = (token: string) =>
    serialize('session', token, {
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
    serialize('session', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
    });
