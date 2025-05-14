import { NextApiRequest, NextApiResponse } from 'next';
import { StreamDto } from '../../common/dtos/streamDto';
import { getStream } from '../../common/data/db';
import { prepareStreamItem } from '../../common/helpers/data';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<StreamDto | undefined>
) {
    const { stream } = req.query;

    const data = prepareStreamItem(await getStream(stream as string));

    res.status(200).json(data)
}