import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import multiparty from 'multiparty';
import { parseSessionCookie } from '../../../common/helpers/auth';
import { getStream, updateSeasonImage } from '../../../common/data/db';
import { prepareSeasonItem } from '../../../common/helpers/data';
import { discardUploads, getUploadExtension, validateImageUpload } from '../../../common/helpers/uploads';

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

    form.parse(req, async (err, fields, files) => {
        if (err) {
            console.error('Error parsing form:', err);
            return res.status(500).json({ error: 'Error processing form data' });
        }

        try {
            const seasonId = fields.seasonId?.[0];
            const season = stream.seasons?.find((s) => s.id === seasonId);
            if (!seasonId || !season) {
                return res.status(404).json({ error: 'Season not found' });
            }

            const imageFile = files.image?.[0];
            if (!imageFile) {
                return res.status(400).json({ error: 'Missing image file' });
            }

            const imageError = await validateImageUpload(imageFile);
            if (imageError) {
                return res.status(400).json({ error: imageError });
            }

            const imageFileName = `${uuidv4()}${getUploadExtension(imageFile)}`;
            await fs.rename(imageFile.path, path.join(uploadDir, imageFileName));

            const oldImageUrl = season.imageUrl;
            const updated = await updateSeasonImage(stream.id, seasonId, imageFileName);
            if (!updated) {
                return res.status(500).json({ error: 'Failed to update season image' });
            }

            if (oldImageUrl) {
                await fs.unlink(path.join(uploadDir, oldImageUrl)).catch(() => {});
            }

            return res.status(200).json(prepareSeasonItem(updated));
        } catch (error) {
            console.error('Error uploading image:', error);
            return res.status(500).json({ error: 'Error uploading image' });
        } finally {
            await discardUploads(files);
        }
    });
}
