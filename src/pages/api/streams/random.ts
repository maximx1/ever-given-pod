import { NextApiRequest, NextApiResponse } from 'next';
import { getRandomStreams, getUserById } from '@/common/data/db';
import { prepareStreamItem } from '@/common/helpers/data';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    rawStreams = await getRandomStreams(limit),
    streams = await Promise.all(rawStreams.map(async (s) => {
      const owner = await getUserById(s.userId);
      return prepareStreamItem(s, owner?.username);
    }));

  res.status(200).json(streams.filter(Boolean));
}
