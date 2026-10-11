import { NextApiRequest, NextApiResponse } from 'next';
import { getStreamSettings, updateStreamSettings, getStreamByUser } from '../../../common/data/db';
import { parseSessionCookie } from '../../../common/helpers/auth';

type StreamSettingsDto = {
    seasonMode: boolean;
    defaultAddType: 'episode' | 'season';
};

type ResponseData = StreamSettingsDto | { error: string };

export const config = {
    api: {
        bodyParser: true
    },
};

const get = async (req: NextApiRequest, res: NextApiResponse<ResponseData>) => {
    const stream = req.query.stream as string;
    if (!stream || typeof stream !== 'string') {
        return res.status(400).json({ error: 'Invalid stream parameter' });
    }

    const settings = await getStreamSettings(stream);
    if (!settings) {
        return res.status(404).json({ error: 'Stream not found' });
    }

    return res.status(200).json(settings);
};

const patch = async (req: NextApiRequest, res: NextApiResponse<ResponseData>) => {
    const stream = req.query.stream as string;
    if (!stream || typeof stream !== 'string') {
        return res.status(400).json({ error: 'Invalid stream parameter' });
    }

    const session = parseSessionCookie(req.headers.cookie);
    if (!session) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const streamData = await getStreamByUser(session.userId, stream);
    if (!streamData) {
        return res.status(403).json({ error: 'Access denied' });
    }

    const updates: { seasonMode?: boolean; defaultAddType?: 'episode' | 'season' } = {};
    const body = req.body as { seasonMode?: boolean; defaultAddType?: 'episode' | 'season' };

    if (body.seasonMode !== undefined) {
        updates.seasonMode = body.seasonMode;
    }
    if (body.defaultAddType !== undefined) {
        updates.defaultAddType = body.defaultAddType;
    }

    const result = await updateStreamSettings(stream, updates);
    if (!result) {
        return res.status(500).json({ error: 'Failed to update settings' });
    }

    return res.status(200).json(result);
};

export default function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method === 'GET') {
        return get(req, res);
    } else if (req.method === 'PATCH') {
        return patch(req, res);
    } else {
        res.setHeader('Allow', ['GET', 'PATCH']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}