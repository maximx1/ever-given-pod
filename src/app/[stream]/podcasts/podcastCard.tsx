import Image from 'next/image';
import { PodcastDto } from '../common/dtos/podcastDto';

export default function PodcastCard({
    imageUrl = "https://placehold.co/400",
    title,
    description,
    uploadDate,
    url,
    author,
}: PodcastDto) {
    return (
        <div className="w-full h-[150px] shadow-md rounded-sm overflow-hidden flex m-4 mb-1">
            <div className="w-[150px] h-full bg-purple-100 flex-shrink-0 relative">
                <Image unoptimized src={imageUrl} alt={title} layout="fill" objectFit="cover" />
            </div>

            <div className="p-4 flex-grow flex flex-col bg-purple-200">
                <h2 className="text-lg font-bold text-gray-800">{title}</h2>
                <p className="text-sm text-gray-600 flex-grow">{description}</p>
                <div className="mt-2 text-sm text-gray-500">
                    <p>By: {author}</p>
                    <p>Uploaded: {uploadDate}</p>
                </div>
                <a href={url} target="_blank" rel="noopener noreferrer" className="mt-4 text-blue-500 hover:underline text-sm">
                    Listen Now
                </a>
            </div>
        </div>
    );
}