import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs/promises';
import path from 'path';
import { StreamDto } from '../../common/dtos/streamDto';
import { getStream, getUserById, deleteStream, updateStreamTitle } from '../../common/data/db';
import { FIELD_LIMITS } from '../../common/limits';
import { prepareStreamItem } from '../../common/helpers/data';
import { parseSessionCookie } from '../../common/helpers/auth';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const { stream } = req.query;

    if (req.method === 'PATCH') {
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

        const { title } = req.body;
        if (!title || typeof title !== 'string' || !title.trim()) {
            return res.status(400).json({ message: 'Title is required' });
        }
        if (title.trim().length > FIELD_LIMITS.streamTitle) {
            return res.status(400).json({ message: `Title must be ${FIELD_LIMITS.streamTitle} characters or fewer` });
        }

        const updated = await updateStreamTitle(stream as string, title.trim());
        if (!updated) {
            return res.status(500).json({ message: 'Failed to update title' });
        }

        return res.status(200).json({ title: updated.title });
    }

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

    if (!streamData) {
        return res.status(404).json({ message: 'Stream not found' });
    }

    if (streamData.isPrivate) {
        const session = parseSessionCookie(req.headers.cookie);
        if (!session) {
            return res.status(403).json({ message: 'private' });
        }
        const isOwner = session.userId === streamData.userId;
        const hasAccess = streamData.accessList?.some((a) => a.userId === session.userId);
        if (!isOwner && !hasAccess) {
            return res.status(403).json({ message: 'private' });
        }
    }

    const owner = streamData ? await getUserById(streamData.userId) : undefined;
    const data = prepareStreamItem(streamData, owner?.username);

    const session = parseSessionCookie(req.headers.cookie);
    const isOwner = session?.userId === streamData.userId;

    let enrichedAccessList;
    if (isOwner && streamData.accessList) {
        enrichedAccessList = await Promise.all(
            streamData.accessList
                .filter((entry) => entry.userId !== streamData.userId)
                .map(async (entry) => {
                    const u = await getUserById(entry.userId);
                    return {
                        userId: entry.userId,
                        username: u?.username,
                        name: u?.name,
                        feedToken: entry.feedToken,
                    };
                })
        );
    }

    const myAccess = session ? streamData.accessList?.find((a) => a.userId === session.userId) : undefined;

    res.status(200).json({
        ...data,
        ...(isOwner ? {
            isPrivate: streamData.isPrivate ?? false,
            accessList: enrichedAccessList,
        } : {}),
        ...(myAccess ? { feedToken: myAccess.feedToken } : {}),
    });
}