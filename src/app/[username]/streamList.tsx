"use client";

import StreamCard from './streamCard';
import { StreamDto } from '@/common/dtos/streamDto';

type StreamListProps = {
    username: string;
    streams: StreamDto[];
    canEdit?: boolean;
    onStreamDeleted?: () => void;
};

export default function StreamList({ username, streams, canEdit, onStreamDeleted }: StreamListProps) {
    if (streams.length === 0) {
        return (
            <div className="max-w-[800px] mx-auto w-full px-4 py-8 text-center text-gray-500">
                <p>No streams yet.</p>
            </div>
        );
    }

    return (
        <div className="relative max-w-[800px] mx-auto w-full px-4">
            {streams.map((stream) => (
                <div key={stream.id} className="flex justify-center">
                    <StreamCard username={username} {...stream} canEdit={canEdit} onDeleted={onStreamDeleted} />
                </div>
            ))}
        </div>
    );
}
