import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import multiparty from 'multiparty';
import { getEpisodes, getStream, publishEpisode } from '../../../common/data/db';
import { EpisodeDto } from '../../../common/dtos/episodeDto';
import { prepareEpisodeItem } from '../../../common/helpers/data';
import { FIELD_LIMITS } from '../../../common/limits';
import { parseSessionCookie } from '../../../common/helpers/auth';

const get = async (req: NextApiRequest, res: NextApiResponse<EpisodeDto[] | { error: string }>) => {
  const stream = req.query.stream as string;
  const streamData = await getStream(stream);
  if (!streamData) {
    return res.status(404).json({ error: 'Stream not found' });
  }

  if (streamData.isPrivate) {
    const session = parseSessionCookie(req.headers.cookie);
    if (!session) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const isOwner = session.userId === streamData.userId;
    const hasAccess = streamData.accessList?.some((a) => a.userId === session.userId);
    if (!isOwner && !hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }
  }

  const episodes = (await getEpisodes(streamData.id))
      .map(prepareEpisodeItem)
      .sort((a, b) => Number(b.uploadDate) - Number(a.uploadDate));

  res.status(200).json(episodes);
};

export const config = {
  api: {
    bodyParser: false
  },
};

const post = async (req: NextApiRequest, res: NextApiResponse) => {
  const stream = req.query.stream as string;

  if (!stream || typeof stream !== 'string') {
    return res.status(400).json({ error: 'Invalid stream parameter' });
  }

  const streamData = await getStream(stream);
  if (!streamData) {
    return res.status(404).json({ error: 'Stream not found' });
  }

  const uploadDir = path.join(process.cwd(), 'uploads');
  await fs.mkdir(uploadDir, { recursive: true });
  const form = new multiparty.Form({
    uploadDir
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('Error parsing form:', err);
      return res.status(500).json({ error: 'Error processing form data' });
    }

    try {
      const title = fields.title?.[0];
      const description = fields.description?.[0];
      const author = fields.author?.[0];

      if (title && title.length > FIELD_LIMITS.title) {
        return res.status(400).json({ error: `Title must be ${FIELD_LIMITS.title} characters or fewer` });
      }
      if (description && description.length > FIELD_LIMITS.description) {
        return res.status(400).json({ error: `Description must be ${FIELD_LIMITS.description} characters or fewer` });
      }
      if (author && author.length > FIELD_LIMITS.author) {
        return res.status(400).json({ error: `Author must be ${FIELD_LIMITS.author} characters or fewer` });
      }

      console.log(fields);
      const imageFile = files.image?.[0];
      const episodeFile = files.file?.[0];

      if (!imageFile || !episodeFile) {
        return res.status(400).json({ error: 'Missing image or file' });
      }

      const imageFileName = `${uuidv4()}${path.extname(imageFile.originalFilename)}`;
      const episodeFileName = `${uuidv4()}${path.extname(episodeFile.originalFilename)}`;

      const imageFilePath = path.join(uploadDir, imageFileName);
      const episodeFilePath = path.join(uploadDir, episodeFileName);

      await fs.rename(imageFile.path, imageFilePath);
      await fs.rename(episodeFile.path, episodeFilePath);

      const episodeData: EpisodeDto = {
        episodeId: uuidv4(),
        streamId: streamData.id,
        title,
        description,
        uploadDate: Date.now().toString(),
        author,
        imageUrl: imageFileName,
        url: episodeFileName,
      };

      await publishEpisode(episodeData);

      res.setHeader('Location', `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/${stream}/podcasts/${episodeData.episodeId}`);
      res.status(201).json({ message: 'Episode created successfully' });
    } catch (error) {
      console.error('Error handling request:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    get(req, res);
  } else if (req.method === 'POST') {
    post(req, res);
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}