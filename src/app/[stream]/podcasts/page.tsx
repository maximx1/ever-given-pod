"use client";

import { useParams } from 'next/navigation';
import Main from '../../layout/main';
import PodcastList from './podcastList';
import PodcastSummary from './podcastSummary';

export default function StreamPodcasts() {
  const params = useParams();

  return (
    <Main>
      <PodcastSummary stream={params?.stream} />
      <PodcastList stream={params?.stream} />
    </Main>
  );
}