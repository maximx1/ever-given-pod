import { NextApiRequest, NextApiResponse } from 'next';
import { getRandomPodcasts } from '@/common/data/db';
import { PodcastDto } from '@/common/dtos/podcastDto';
import { preparePodcastItem } from '@/common/helpers/data';

export default async function handler(req: NextApiRequest, res: NextApiResponse<PodcastDto[]>) {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    podcasts = (await getRandomPodcasts(limit)).map(preparePodcastItem);

  res.status(200).json(podcasts);
}