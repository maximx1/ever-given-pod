"use client";

import Image from 'next/image';
import Main from './layout/main';
import { useRef, useState, useEffect } from 'react';
import { PodcastDto } from '@/common/dtos/podcastDto';
import { useRouter } from 'next/navigation';

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null),
    [podcasts, setPodcasts] = useState<PodcastDto[]>([]),
    router = useRouter(),
    handleSearchClick = () => {
      alert(inputRef.current?.value);
    },
    handlePodcastClick = (podcast: PodcastDto) => {
      if (podcast.streamId != null) {
        router.push(`${process.env.NEXT_PUBLIC_API_BASE_URL}/${podcast.streamId}/podcasts`); // TODO: This should eventually go to the individual player page.
      }
    };

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/podcasts/random?limit=12`)
      .then(res => res.json())
      .then(setPodcasts)
      .catch(() => setPodcasts([]));
  }, []);

  return (
    <Main>
      <div className="w-full flex justify-center mt-8">
        <div className="w-[100px] h-[100px] flex items-center justify-center">
          <Image
            src={`${process.env.NEXT_PUBLIC_API_BASE_URL}/site-icon.svg`}
            alt="Site Icon"
            width={100}
            height={100}
            className="object-contain"
            priority
          />
        </div>
      </div>
      <div className="w-full flex justify-center mt-8">
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
              src={`${process.env.NEXT_PUBLIC_API_BASE_URL}/icons/search.svg`}
              alt="Search"
              width={24}
              height={24}
            />
          </button>
        </div>
      </div>

      <div className="w-full flex justify-center mt-8">
        <div className="w-[500px] flex flex-col items-center">
          <h1 className="text-2xl font-bold text-purple-200 text-center">
            Not sure what you are looking for?
          </h1>
          <p className="text-sm text-purple-200 mt-2 text-center">
            Get started by selecting something of interest:
          </p>
        </div>
      </div>

      <div className="w-full px-8 mt-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {podcasts.map(podcast => (
            <button
              key={podcast.streamId}
              type='button'
              onClick={() => handlePodcastClick(podcast)}
              className="aspect-square bg-purple-100 rounded-lg flex items-center justify-center overflow-hidden shadow focus:outline-none focus:ring-2 focus:ring-purple-400 transition"
              title={podcast.title}
            >
              <Image
                src={podcast.imageUrl || `${process.env.NEXT_PUBLIC_API_BASE_URL}/icons/podcast.svg`}
                alt={podcast.title ?? ''}
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
