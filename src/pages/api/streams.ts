import { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';
import multiparty from 'multiparty';
import mime from 'mime-types';
import { parseSessionCookie } from '../../common/helpers/auth';
import { createStream, getStreams } from '../../common/data/db';
import { StreamDto } from '../../common/dtos/streamDto';
import { FIELD_LIMITS, MAX_IMAGE_SIZE } from '../../common/limits';

const VALID_NAME_PATTERN = /^[a-z0-9_-]+$/;

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

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
            const name = fields.name?.[0];
            const description = fields.description?.[0] || '';

            if (!title || typeof title !== 'string' || !title.trim()) {
                return res.status(400).json({ error: 'Title is required' });
            }
            if (!name || typeof name !== 'string' || !name.trim()) {
                return res.status(400).json({ error: 'Name is required' });
            }
            if (title.trim().length > FIELD_LIMITS.streamTitle) {
                return res.status(400).json({ error: `Title must be ${FIELD_LIMITS.streamTitle} characters or fewer` });
            }
            if (name.trim().length > FIELD_LIMITS.streamName) {
                return res.status(400).json({ error: `Name must be ${FIELD_LIMITS.streamName} characters or fewer` });
            }
            if (!VALID_NAME_PATTERN.test(name.trim())) {
                return res.status(400).json({ error: 'Name may only contain lowercase letters, numbers, hyphens, and underscores' });
            }
            if (description.length > FIELD_LIMITS.description) {
                return res.status(400).json({ error: `Description must be ${FIELD_LIMITS.description} characters or fewer` });
            }

            const allStreams = await getStreams();
            const nameExists = allStreams.some((s) => s.name?.toLowerCase() === name.trim().toLowerCase());
            if (nameExists) {
                return res.status(400).json({ error: 'A stream with this name already exists' });
            }

            let imageFileName: string | undefined;
            const imageFile = files.image?.[0];
            if (imageFile) {
                const detectedType = mime.lookup(imageFile.originalFilename || '') || imageFile.headers?.['content-type'] || '';
                if (!ALLOWED_IMAGE_TYPES.has(detectedType)) {
                    await fs.unlink(imageFile.path).catch(() => {});
                    return res.status(400).json({ error: 'Only JPEG, PNG, WebP, and GIF images are allowed' });
                }

                const stat = await fs.stat(imageFile.path);
                if (stat.size > MAX_IMAGE_SIZE) {
                    await fs.unlink(imageFile.path).catch(() => {});
                    return res.status(400).json({ error: 'Image must be 10 MB or smaller' });
                }

                const ext = path.extname(imageFile.originalFilename || '') || (mime.extension(detectedType) ? `.${mime.extension(detectedType)}` : '.bin');
                imageFileName = `${uuidv4()}${ext}`;
                await fs.rename(imageFile.path, path.join(uploadDir, imageFileName));
            }

            const stream: StreamDto = {
                id: uuidv4(),
                userId: session.userId,
                name: name.trim(),
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
