import { useRouter } from 'next/navigation';

export default function AddPodcastCard({ stream }: { stream?: string | string[] }) {
    const router = useRouter();

    const handleClick = () => {
        router.push(`${process.env.NEXT_PUBLIC_API_BASE_URL}/${stream}/publish`);
    };

    return (
        <div
            onClick={handleClick}
            className="w-[150px] h-[150px] shadow-md rounded-lg overflow-hidden flex items-center justify-center m-4 mb-1 bg-purple-200 cursor-pointer hover:bg-purple-300 transition-colors"
        >
            <span className="text-4xl font-bold text-gray-800">+</span>
        </div>
    );
}