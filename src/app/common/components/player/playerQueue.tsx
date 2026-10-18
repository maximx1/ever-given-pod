"use client";

import { usePlayer } from '@/app/common/context/PlayerContext';
import TrashSvg from '@/icons/trash.svg';
import UploadImage from '@/app/common/components/image/uploadImage';

export default function PlayerQueue() {
    const { queue, currentIndex, queueOpen, jumpToQueueItem, removeFromQueue, podcastFallbackUrl } = usePlayer();

    return (
        <div
            className={`bg-purple-200 border-t border-purple-400 overflow-hidden transition-all duration-300 ease-in-out ${
                queueOpen ? 'max-h-72' : 'max-h-0'
            }`}
        >
            <div className="overflow-y-auto max-h-72">
                {queue.length === 0 ? (
                    <p className="text-center text-sm text-gray-500 py-4">Queue is empty</p>
                ) : (
                    <ul>
                        {queue.map((item, index) => {
                            const isActive = index === currentIndex;
                            return (
                                <li
                                    key={`${item.episodeId}-${index}`}
                                    className={`flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-purple-300 transition-colors ${
                                        isActive ? 'bg-purple-400 font-semibold' : ''
                                    }`}
                                    onClick={() => jumpToQueueItem(index)}
                                >
                                    <UploadImage
                                        src={item.imageUrl}
                                        fallbacks={[item.fallbackImageUrl, podcastFallbackUrl]}
                                        alt={item.title ?? ''}
                                        width={40}
                                        height={40}
                                        className="w-10 h-10 object-contain flex-shrink-0 rounded-sm"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-gray-600 truncate">{item.streamName}</p>
                                        <p className="text-sm text-gray-800 truncate">{item.title}</p>
                                    </div>
                                    {isActive && (
                                        <span className="text-xs text-purple-700 flex-shrink-0">▶ Now playing</span>
                                    )}
                                    <button
                                        aria-label="Remove from queue"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeFromQueue(index);
                                        }}
                                        className="flex-shrink-0 p-1 rounded hover:bg-purple-500 transition-colors text-gray-600"
                                    >
                                        <TrashSvg />
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
}
