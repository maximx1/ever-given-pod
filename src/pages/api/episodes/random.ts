import { NextApiRequest, NextApiResponse } from 'next';
import { getRandomEpisodes, getStream, getUserById } from '@/common/data/db';
import { EpisodeDto } from '@/common/dtos/episodeDto';
import { prepareEpisodeItem } from '@/common/helpers/data';

export default async function handler(req: NextApiRequest, res: NextApiResponse<EpisodeDto[]>) {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    rawEpisodes = await getRandomEpisodes(limit),
    episodes = await Promise.all(rawEpisodes.map(async (e) => {
      const prepared = prepareEpisodeItem(e);
      const stream = e.streamId ? await getStream(e.streamId) : undefined;
      const owner = stream ? await getUserById(stream.userId) : undefined;
      return { ...prepared, ownerUsername: owner?.username };
    }));

  res.status(200).json(episodes);
}