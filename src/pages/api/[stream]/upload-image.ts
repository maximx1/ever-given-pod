import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import multiparty from 'multiparty';
import { parseSessionCookie } from '../../../common/helpers/auth';
import { getStream, updateStreamImage } from '../../../common/data/db';

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

    const streamId = req.query.stream as string;
    if (!streamId) {
        return res.status(400).json({ error: 'Stream ID is required' });
    }

    const stream = await getStream(streamId);
    if (!stream) {
        return res.status(404).json({ error: 'Stream not found' });
    }

    if (stream.userId !== session.userId) {
        return res.status(403).json({ error: 'Not authorized to update this stream' });
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

            const imageFileName = `${uuidv4()}${path.extname(imageFile.originalFilename)}`;
            const imageFilePath = path.join(uploadDir, imageFileName);

            await fs.rename(imageFile.path, imageFilePath);

            const oldImageUrl = stream.imageUrl;
            const updated = await updateStreamImage(streamId, imageFileName);
            if (!updated) {
                return res.status(500).json({ error: 'Failed to update stream image' });
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
