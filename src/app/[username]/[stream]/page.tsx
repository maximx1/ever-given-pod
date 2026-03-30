"use client";

import { useParams } from 'next/navigation';
import Main from '../../layout/main';
import EpisodeList from './episodeList';
import StreamSummary from './streamSummary';

export default function StreamPage() {
  const params = useParams();

  return (
    <Main>
      <StreamSummary stream={params?.stream} />
      <EpisodeList stream={params?.stream} />
    </Main>
  );
}
