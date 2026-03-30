import type { NextApiRequest, NextApiResponse } from 'next';
import { getUserByEmail, getUserByUsername } from '../../../common/data/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { field, value } = req.body;

    if (!field || !value) {
        return res.status(400).json({ message: 'Field and value are required' });
    }

    if (field === 'username') {
        const existing = await getUserByUsername(value);
        return res.status(200).json({ available: !existing });
    }

    if (field === 'email') {
        const existing = await getUserByEmail(value);
        return res.status(200).json({ available: !existing });
    }

    return res.status(400).json({ message: 'Invalid field' });
}
