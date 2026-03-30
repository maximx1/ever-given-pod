import { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';
import multiparty from 'multiparty';
import { parseSessionCookie } from '../../common/helpers/auth';
import { createStream } from '../../common/data/db';
import { StreamDto } from '../../common/dtos/streamDto';
import { FIELD_LIMITS } from '../../common/fieldLimits';

export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const session = parseSessionCookie(req.headers.cookie);
    if (!session?.userId) {
        return res.status(401).json({ message: 'Not authenticated' });
    }

    const uploadDir = path.join(process.cwd(), 'uploads');
    await fs.mkdir(uploadDir, { recursive: true });

    const form = new multiparty.Form({ uploadDir });

    form.parse(req, async (err, fields, files) => {
        if (err) {
            console.error('Error parsing form:', err);
            return res.status(500).json({ error: 'Error processing form data' });
        }

        try {
            const title = fields.title?.[0];
            const description = fields.description?.[0] || '';

            if (!title || typeof title !== 'string' || !title.trim()) {
                return res.status(400).json({ error: 'Title is required' });
            }
            if (title.trim().length > FIELD_LIMITS.streamTitle) {
                return res.status(400).json({ error: `Title must be ${FIELD_LIMITS.streamTitle} characters or fewer` });
            }
            if (description.length > FIELD_LIMITS.description) {
                return res.status(400).json({ error: `Description must be ${FIELD_LIMITS.description} characters or fewer` });
            }

            let imageFileName: string | undefined;
            const imageFile = files.image?.[0];
            if (imageFile) {
                imageFileName = `${uuidv4()}${path.extname(imageFile.originalFilename)}`;
                await fs.rename(imageFile.path, path.join(uploadDir, imageFileName));
            }

            const stream: StreamDto = {
                id: uuidv4(),
                userId: session.userId,
                title: title.trim(),
                description: description.trim() || undefined,
                imageUrl: imageFileName,
            };

            await createStream(stream);

            res.status(201).json(stream);
        } catch (error) {
            console.error('Error creating stream:', error);
            return res.status(500).json({ error: 'Error creating stream' });
        }
    });
}
