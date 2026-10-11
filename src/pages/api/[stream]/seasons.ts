import { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';
import { canViewStream, parseSessionCookie } from '../../../common/helpers/auth';
import { getStream, getSeasons, createSeason, updateSeason, deleteSeason, reorderSeason } from '../../../common/data/db';
import { FIELD_LIMITS } from '../../../common/limits';

const validateText = (title: unknown, description: unknown, titleRequired: boolean): string | null => {
    if (title !== undefined || titleRequired) {
        if (typeof title !== 'string' || !title.trim()) {
            return 'Title is required';
        }
        if (title.trim().length > FIELD_LIMITS.title) {
            return `Title must be ${FIELD_LIMITS.title} characters or fewer`;
        }
    }

    if (description !== undefined) {
        if (typeof description !== 'string') {
            return 'Description must be text';
        }
        if (description.length > FIELD_LIMITS.description) {
            return `Description must be ${FIELD_LIMITS.description} characters or fewer`;
        }
    }

    return null;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { stream } = req.query;
    const streamData = await getStream(stream as string);
    if (!streamData) {
        return res.status(404).json({ message: 'Stream not found' });
    }

    const session = parseSessionCookie(req.headers.cookie);

    if (req.method === 'GET') {
        if (!canViewStream(streamData, session)) {
            return res.status(403).json({ message: 'Access denied' });
        }
        return res.status(200).json(await getSeasons(streamData.id));
    }

    if (!session?.userId) {
        return res.status(401).json({ message: 'Not authenticated' });
    }
    if (streamData.userId !== session.userId) {
        return res.status(403).json({ message: 'Not authorized' });
    }

    if (req.method === 'POST') {
        const { title, description } = req.body;
        const invalid = validateText(title, description, true);
        if (invalid) {
            return res.status(400).json({ message: invalid });
        }

        const created = await createSeason(streamData.id, {
            id: uuidv4(),
            title: title.trim(),
            description: description?.trim() || undefined,
        });
        if (!created) {
            return res.status(500).json({ message: 'Failed to create season' });
        }

        return res.status(201).json(created);
    }

    if (req.method === 'PATCH') {
        const { seasonId, title, description, episodeIds } = req.body;
        if (!seasonId || typeof seasonId !== 'string') {
            return res.status(400).json({ message: 'seasonId is required' });
        }
        if (!streamData.seasons?.some((s) => s.id === seasonId)) {
            return res.status(404).json({ message: 'Season not found' });
        }

        const invalid = validateText(title, description, false);
        if (invalid) {
            return res.status(400).json({ message: invalid });
        }
        if (episodeIds !== undefined && (!Array.isArray(episodeIds) || episodeIds.some((id) => typeof id !== 'string'))) {
            return res.status(400).json({ message: 'episodeIds must be a list of episode ids' });
        }

        if (episodeIds !== undefined) {
            const reordered = await reorderSeason(streamData.id, seasonId, episodeIds);
            if (!reordered) {
                return res.status(400).json({ message: 'episodeIds must list every episode in the season exactly once' });
            }
        }

        const updated = await updateSeason(streamData.id, seasonId, {
            title: title?.trim(),
            description: description?.trim(),
        });
        if (!updated) {
            return res.status(500).json({ message: 'Failed to update season' });
        }

        return res.status(200).json(updated);
    }

    if (req.method === 'DELETE') {
        const { seasonId } = req.body;
        if (!seasonId || typeof seasonId !== 'string') {
            return res.status(400).json({ message: 'seasonId is required' });
        }

        const removed = await deleteSeason(streamData.id, seasonId);
        if (!removed) {
            return res.status(404).json({ message: 'Season not found' });
        }

        return res.status(200).json({ message: 'Season removed' });
    }

    res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
}
