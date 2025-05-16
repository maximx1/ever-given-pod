import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import multiparty from 'multiparty';
import { getPodcasts, publishPodcast } from '../../../common/data/db';
import { PodcastDto } from '../../../common/dtos/podcastDto';
import { preparePodcastItem } from '../../../common/helpers/data';

const get = async (req: NextApiRequest, res: NextApiResponse<PodcastDto[]>) => {
  const stream = req.query.stream as string,
    podcasts = (await getPodcasts(stream as string))
      .map(preparePodcastItem)
      .sort((a, b) => Number(b.uploadDate) - Number(a.uploadDate));

  res.status(200).json(podcasts);
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

      console.log(fields);
      const imageFile = files.image?.[0];
      const podcastFile = files.file?.[0];

      if (!imageFile || !podcastFile) {
        return res.status(400).json({ error: 'Missing image or file' });
      }

      const imageFileName = `${uuidv4()}${path.extname(imageFile.originalFilename)}`;
      const podcastFileName = `${uuidv4()}${path.extname(podcastFile.originalFilename)}`;

      const imageFilePath = path.join(uploadDir, imageFileName);
      const podcastFilePath = path.join(uploadDir, podcastFileName);

      await fs.rename(imageFile.path, imageFilePath);
      await fs.rename(podcastFile.path, podcastFilePath);

      const podcastData: PodcastDto = {
        podcastId: uuidv4(),
        streamId: stream,
        title,
        description,
        uploadDate: Date.now().toString(),
        author,
        imageUrl: imageFileName,
        url: podcastFileName,
      };

      await publishPodcast(podcastData);

      res.setHeader('Location', `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/${stream}/podcasts/${podcastData.podcastId}`);
      res.status(201).json({ message: 'Podcast created successfully' });
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