"use client";

import Image from 'next/image';
import Main from './layout/main';
import { useRef } from 'react';
import { resolveAssetUrl } from '@/common/helpers/api';
import SearchSvg from '@/icons/search.svg';
import DiscoveryGrid from '@/app/common/components/discoveryGrid';

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null),
    handleSearchClick = () => {
      alert(inputRef.current?.value);
    };

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
              <SearchSvg />
            </button>
          </div>
        </div>
      </div>

      <DiscoveryGrid />
    </Main>
  );
}
