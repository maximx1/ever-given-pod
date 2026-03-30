"use client";

import Image from 'next/image';
import Main from './layout/main';
import { useRef, useState, useEffect } from 'react';
import { EpisodeDto } from '@/common/dtos/episodeDto';
import { useRouter } from 'next/navigation';
import { resolveApiUrl, resolveAppUrl, resolveAssetUrl } from '@/common/helpers/api';

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null),
    [episodes, setEpisodes] = useState<(EpisodeDto & { ownerUsername?: string })[]>([]),
    router = useRouter(),
    handleSearchClick = () => {
      alert(inputRef.current?.value);
    },
    handleEpisodeClick = (episode: EpisodeDto & { ownerUsername?: string }) => {
      if (episode.ownerUsername && episode.streamId != null) {
        router.push(resolveAppUrl(`/${episode.ownerUsername}/${episode.streamId}`));
      }
    };

  useEffect(() => {
    fetch(resolveApiUrl('/episodes/random?limit=12'))
      .then(res => res.json())
      .then(setEpisodes)
      .catch(() => setEpisodes([]));
  }, []);

  return (
    <Main>
      <div className='min-h-[65vh]'>
        <div className="w-full flex justify-center mt-15">
          <div className="w-[100px] h-[100px] flex items-center justify-center">
            <Image
              src={resolveAssetUrl('/icons/site-icon.svg')}
              alt="Site Icon"
              width={100}
              height={100}
              className="object-contain"
              priority
            />
          </div>
        </div>
        <div className="w-full flex justify-center mt-15 mb-25">
          <div className="relative w-[320px]">
            <input
              ref={inputRef}
              type='text'
              placeholder='Search…'
              className='w-full pr-12 pl-4 py-4 rounded-lg bg-purple-200 text-base outline-none border border-purple-200'
            />
            <button
              type="button"
              onClick={handleSearchClick}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded hover:bg-purple-100 transition"
              tabIndex={0}
            >
              <Image
                src={resolveAssetUrl('/icons/search.svg')}
                alt="Search"
                width={24}
                height={24}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="w-full flex justify-center mt-8 mb-15">
        <div className="w-[500px] flex flex-col items-center">
          <h1 className="text-2xl font-bold text-purple-200 text-center">
            Not sure what you are looking for?
          </h1>
          <p className="text-sm text-purple-200 mt-2 text-center">
            Get started by selecting something of interest:
          </p>
        </div>
      </div>

      <div className="w-full max-w-[1200px] px-8 mt-8 mb-16 mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {episodes.map(episode => (
            <button
              key={episode.episodeId}
              type='button'
              onClick={() => handleEpisodeClick(episode)}
              className="aspect-square rounded-lg overflow-hidden shadow focus:outline-none focus:ring-2 focus:ring-purple-400 transition"
              title={episode.title}
            >
              <Image
                src={episode.imageUrl || resolveAssetUrl('/icons/podcast.svg')}
                alt={episode.title ?? ''}
                width={200}
                height={200}
                className="object-cover w-full h-full"
              />
            </button>
          ))}
        </div>
      </div>
    </Main>
  );
}
