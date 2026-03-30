import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs/promises';
import path from 'path';
import { StreamDto } from '../../common/dtos/streamDto';
import { getStream, getUserById, deleteStream } from '../../common/data/db';
import { prepareStreamItem } from '../../common/helpers/data';
import { parseSessionCookie } from '../../common/helpers/auth';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<StreamDto | { message: string } | undefined>
) {
    const { stream } = req.query;

    if (req.method === 'DELETE') {
        const session = parseSessionCookie(req.headers.cookie);
        if (!session?.userId) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const streamData = await getStream(stream as string);
        if (!streamData) {
            return res.status(404).json({ message: 'Stream not found' });
        }
        if (streamData.userId !== session.userId) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const removed = await deleteStream(stream as string);
        if (!removed) {
            return res.status(500).json({ message: 'Failed to delete stream' });
        }

        // Clean up associated files
        const uploadDir = path.join(process.cwd(), 'uploads');
        const filesToDelete: string[] = [];

        if (removed.imageUrl) {
            filesToDelete.push(removed.imageUrl);
        }
        for (const ep of removed.episodes ?? []) {
            if (ep.imageUrl) filesToDelete.push(ep.imageUrl);
            if (ep.url) filesToDelete.push(ep.url);
        }

        await Promise.all(
            filesToDelete.map((f) =>
                fs.unlink(path.join(uploadDir, f)).catch(() => {})
            )
        );

        return res.status(200).json({ message: 'Stream deleted' });
    }

    const streamData = await getStream(stream as string);
    const owner = streamData ? await getUserById(streamData.userId) : undefined;
    const data = prepareStreamItem(streamData, owner?.username);

    res.status(200).json(data)
}