import type { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcrypt';
import { createUser, getUserByEmail } from '../../common/data/db';
import { signSession, buildSessionCookieHeader } from '../../common/helpers/auth';
import { FIELD_LIMITS } from '../../common/limits';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { username, email, password, name } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Username, email, and password are required' });
  }

  if (/\s/.test(username)) {
    return res.status(400).json({ message: 'Username cannot contain spaces' });
  }
  if (username.length > FIELD_LIMITS.username) {
    return res.status(400).json({ message: `Username must be ${FIELD_LIMITS.username} characters or fewer` });
  }
  if (name && name.length > FIELD_LIMITS.name) {
    return res.status(400).json({ message: `Name must be ${FIELD_LIMITS.name} characters or fewer` });
  }
  if (email.length > FIELD_LIMITS.email) {
    return res.status(400).json({ message: `Email must be ${FIELD_LIMITS.email} characters or fewer` });
  }
  if (password.length > FIELD_LIMITS.password) {
    return res.status(400).json({ message: `Password must be ${FIELD_LIMITS.password} characters or fewer` });
  }

  const existing = await getUserByEmail(email);
  if (existing) {
    return res.status(409).json({ message: 'User already exists' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await createUser({
    id: Date.now().toString(),
    username,
    email,
    name,
    password: hashedPassword,
    creationDate: new Date().toISOString(),
  });

  if (!user) {
    return res.status(500).json({ message: 'Could not create user' });
  }

  const token = signSession({ userId: user.id, username: user.username, email: user.email, name: user.name });
  res.setHeader('Set-Cookie', buildSessionCookieHeader(token));

  return res.status(201).json({ id: user.id, username: user.username, email: user.email, name: user.name, imageUrl: user.imageUrl });
}
