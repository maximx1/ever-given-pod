import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import multiparty from 'multiparty';
import { getEpisodes, getStream, publishEpisode } from '../../../common/data/db';
import { EpisodeDto } from '../../../common/dtos/episodeDto';
import { prepareEpisodeItem } from '../../../common/helpers/data';
import { DEFAULT_SPLIT_MINUTES, FIELD_LIMITS } from '../../../common/limits';
import { parseSessionCookie } from '../../../common/helpers/auth';
import { discardUploads, getUploadExtension, isAudioUpload, validateImageUpload } from '../../../common/helpers/uploads';
import { FfmpegMissingError, planSplit, probeAudio, queueSplit, resumePendingSplits } from '../../../common/helpers/splitter';
import { UPLOADS_DIR } from '../../../common/helpers/paths';

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

  resumePendingSplits().catch((error) => console.error('Could not resume splits:', error));

  const episodes = (await getEpisodes(streamData.id))
      .map((ep) => prepareEpisodeItem(ep, undefined, streamData.seasons))
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

  const session = parseSessionCookie(req.headers.cookie);
  if (!session?.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const streamData = await getStream(stream);
  if (!streamData) {
    return res.status(404).json({ error: 'Stream not found' });
  }
  if (streamData.userId !== session.userId) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  const uploadDir = UPLOADS_DIR;
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
      const seasonId = fields.seasonId?.[0] || undefined;

      if (title && title.length > FIELD_LIMITS.title) {
        return res.status(400).json({ error: `Title must be ${FIELD_LIMITS.title} characters or fewer` });
      }
      if (description && description.length > FIELD_LIMITS.description) {
        return res.status(400).json({ error: `Description must be ${FIELD_LIMITS.description} characters or fewer` });
      }
      if (author && author.length > FIELD_LIMITS.author) {
        return res.status(400).json({ error: `Author must be ${FIELD_LIMITS.author} characters or fewer` });
      }

      if (seasonId && !streamData.seasons?.some((s) => s.id === seasonId)) {
        return res.status(400).json({ error: 'Season not found' });
      }

      const imageFile = files.image?.[0];
      const episodeFile = files.file?.[0];

      // An episode in a season may go without its own image and show the season's cover
      if (!episodeFile || (!imageFile && !seasonId)) {
        return res.status(400).json({ error: 'Missing image or file' });
      }

      const imageError = imageFile ? await validateImageUpload(imageFile) : null;
      if (imageError) {
        return res.status(400).json({ error: imageError });
      }
      if (!isAudioUpload(episodeFile)) {
        return res.status(400).json({ error: 'Only audio files are allowed' });
      }

      const imageFileName = imageFile ? `${uuidv4()}${getUploadExtension(imageFile)}` : undefined;
      const episodeFileName = `${uuidv4()}${getUploadExtension(episodeFile)}`;

      const episodeFilePath = path.join(uploadDir, episodeFileName);

      if (imageFile && imageFileName) {
        await fs.rename(imageFile.path, path.join(uploadDir, imageFileName));
      }
      await fs.rename(episodeFile.path, episodeFilePath);

      // Long audio is published as one episode marked pending, then split into parts in the background
      let splitting = false;
      if (streamData.autoSplit ?? true) {
        try {
          const probe = await probeAudio(episodeFilePath);
          splitting = planSplit(probe, streamData.splitMinutes ?? DEFAULT_SPLIT_MINUTES) !== null;
        } catch (error) {
          // Without ffmpeg, or with audio it cannot read, the upload stays a single episode
          if (!(error instanceof FfmpegMissingError)) {
            console.warn('Could not inspect uploaded audio:', error);
          }
        }
      }

      const episodeData: EpisodeDto = {
        episodeId: uuidv4(),
        streamId: streamData.id,
        title,
        description,
        uploadDate: Date.now().toString(),
        author,
        imageUrl: imageFileName,
        url: episodeFileName,
        splitStatus: splitting ? 'pending' : undefined,
      };

      await publishEpisode(episodeData, seasonId);
      if (splitting) {
        queueSplit(streamData.id, episodeData.episodeId!);
      }

      res.setHeader('Location', `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/${stream}/podcasts/${episodeData.episodeId}`);
      res.status(201).json({ message: 'Episode created successfully', splitting });
    } catch (error) {
      console.error('Error handling request:', error);
      res.status(500).json({ error: 'Internal server error' });
    } finally {
      await discardUploads(files);
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