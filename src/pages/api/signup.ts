import type { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcrypt';
import { createUser, getUserByEmail } from '../../common/data/db';
import { signSession, buildSessionCookieHeader } from '../../common/helpers/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { email, password, name } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const existing = await getUserByEmail(email);
  if (existing) {
    return res.status(409).json({ message: 'User already exists' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await createUser({
    id: Date.now().toString(),
    email,
    name,
    password: hashedPassword,
    creationDate: new Date().toISOString(),
  });

  if (!user) {
    return res.status(500).json({ message: 'Could not create user' });
  }

  const token = signSession({ userId: user.id, email: user.email, name: user.name });
  res.setHeader('Set-Cookie', buildSessionCookieHeader(token));

  return res.status(201).json({ id: user.id, email: user.email, name: user.name });
}
