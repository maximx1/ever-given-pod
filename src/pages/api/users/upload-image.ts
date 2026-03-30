import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import multiparty from 'multiparty';
import mime from 'mime-types';
import { parseSessionCookie } from '../../../common/helpers/auth';
import { getUserById, updateUserImage } from '../../../common/data/db';

import { MAX_IMAGE_SIZE } from '../../../common/limits';

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const session = parseSessionCookie(req.headers.cookie);
    if (!session?.userId) {
        return res.status(401).json({ message: 'Not authenticated' });
    }

    const uploadDir = path.join(process.cwd(), 'uploads');
    await fs.mkdir(uploadDir, { recursive: true });

    const form = new multiparty.Form({ uploadDir });

    form.parse(req, async (err, _fields, files) => {
        if (err) {
            console.error('Error parsing form:', err);
            return res.status(500).json({ error: 'Error processing form data' });
        }

        try {
            const imageFile = files.image?.[0];
            if (!imageFile) {
                return res.status(400).json({ error: 'Missing image file' });
            }

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
            const imageFileName = `${uuidv4()}${ext}`;
            const imageFilePath = path.join(uploadDir, imageFileName);

            await fs.rename(imageFile.path, imageFilePath);

            const existingUser = await getUserById(session.userId);
            const oldImageUrl = existingUser?.imageUrl;
            const user = await updateUserImage(session.userId, imageFileName);
            if (!user) {
                return res.status(500).json({ error: 'Failed to update user image' });
            }

            if (oldImageUrl) {
                const oldPath = path.join(uploadDir, oldImageUrl);
                await fs.unlink(oldPath).catch(() => {});
            }

            return res.status(200).json({ imageUrl: imageFileName });
        } catch (error) {
            console.error('Error uploading image:', error);
            return res.status(500).json({ error: 'Error uploading image' });
        }
    });
}
