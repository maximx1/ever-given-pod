import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import multiparty from 'multiparty';
import { getEpisodes, getEpisodesGrouped, getStream, publishEpisode, getStreamSettings, getNextSeasonNumber, getNextEpisodeNumber } from '../../../common/data/db';
import { EpisodeDto } from '../../../common/dtos/episodeDto';
import { SeasonsResponse, SeasonGroup } from '../../../common/data/db';
import { prepareEpisodeItem } from '../../../common/helpers/data';
import { FIELD_LIMITS } from '../../../common/limits';
import { parseSessionCookie } from '../../../common/helpers/auth';

const get = async (req: NextApiRequest, res: NextApiResponse<SeasonsResponse | { error: string }>) => {
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

  const result = await getEpisodesGrouped(streamData.id);
  
  const response: SeasonsResponse = {
    seasonMode: result.seasonMode,
    defaultAddType: result.defaultAddType,
    episodes: result.episodes.map((ep: EpisodeDto) => prepareEpisodeItem(ep)),
  };

  if (result.seasons) {
    response.seasons = result.seasons.map((s: SeasonGroup) => ({
      ...s,
      episodes: s.episodes.map((ep: EpisodeDto) => prepareEpisodeItem(ep)),
    }));
  }

  res.status(200).json(response);
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

      // Determine the type (episode or season)
      const type = (fields.type?.[0] as 'episode' | 'season' | undefined) || 'episode';
      
      // For season headers, url (audio file) is not required
      // For regular episodes, image and file are required
      if (!imageFile || !episodeFile) {
        if (type === 'episode') {
          return res.status(400).json({ error: 'Missing image or file for episode' });
        }
        // For season type, image is optional (falls back to stream default)
      }

      // Get season metadata
      let season = 1;
      let episodeNumber = 1;
      let seasonTitle = title || null;

      // Determine season mode
      const seasonMode = streamData.seasonMode ?? false;
      
      if (seasonMode || type === 'season') {
        if (type === 'season') {
          // New season header - no file upload required
          season = await getNextSeasonNumber(streamData.id);
          episodeNumber = 1;
        } else {
          // Regular episode in a season - assign season/episode numbers
          // If season field is provided, use it; otherwise, use the stream's default add type
          const seasonField = fields.season?.[0];
          if (seasonField) {
            season = parseInt(seasonField, 10);
            if (isNaN(season)) {
              return res.status(400).json({ error: 'Invalid season number' });
            }
          } else if (streamData.defaultAddType === 'season') {
            // Default to adding a new season
            season = await getNextSeasonNumber(streamData.id);
          }
          
          episodeNumber = await getNextEpisodeNumber(streamData.id, season);
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
        season: seasonMode ? season : null,
        episodeNumber: seasonMode ? episodeNumber : null,
        seasonTitle: seasonMode ? seasonTitle : null,
        type,
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