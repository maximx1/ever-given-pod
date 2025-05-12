import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import fs from 'fs';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    const { file } = req.query;

    const filePath = path.join(process.cwd(), 'uploads', file as string);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
    }

    res.setHeader('Content-Type', 'application/octet-stream');
    fs.createReadStream(filePath).pipe(res);
}