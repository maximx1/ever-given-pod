import type { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcrypt';
import { getUserByEmail, getUserByUsername } from '../../common/data/db';
import { signSession, buildSessionCookieHeader } from '../../common/helpers/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { identifier, password } = req.body;

    if (!identifier || !password) {
        return res.status(400).json({ message: 'Username/email and password are required' });
    }

    const user = identifier.includes('@')
        ? await getUserByEmail(identifier)
        : await getUserByUsername(identifier);

    if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = signSession({ userId: user.id, username: user.username, email: user.email, name: user.name });
    res.setHeader('Set-Cookie', buildSessionCookieHeader(token));

    return res.status(200).json({ id: user.id, username: user.username, email: user.email, name: user.name, imageUrl: user.imageUrl });
}
