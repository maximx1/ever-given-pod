import { NextApiRequest, NextApiResponse } from 'next';
import { StreamDto } from '../../common/dtos/streamDto';
import { getStream } from '../../common/data/db';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<StreamDto | undefined>
) {
    const { stream } = req.query;

    const data = await getStream(stream as string);

    res.status(200).json(data)

    // if(stream == 'nothing') {
    //     res.status(200).json(null);
    // } else {
    //     res.status(200).json(
    //         {
    //             title: "Stream: stream1",
    //             description: "This is the description for stream: stream1",
    //             feedUrl: "http://localhost:3000/api/stream1/feed",
    //             siteUrl: "http://localhost:3000/stream1/podcasts",
    //             imageUrl: "https://placehold.co/400",
    //             author: "John Doe",
    //             managingEditor: "Jane Doe",
    //             webMaster: "John Smith",
    //             language: "en",
    //             categories: ["Technology", "Education", "Entertainment"],
    //             pubDate: "2023-10-01",
    //             ttl: 60,
    //         }
    //     );
    // }
}