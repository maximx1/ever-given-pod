"use client";

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Main from '../../layout/main';
import EpisodeList from './episodeList';
import StreamSummary from './streamSummary';
import AccessDenied from '@/app/common/components/accessDenied';

export default function StreamPage() {
  const params = useParams();
  const [accessDenied, setAccessDenied] = useState(false);
  const [streamImageUrl, setStreamImageUrl] = useState<string | undefined>();
  const [streamName, setStreamName] = useState<string | undefined>();

  if (accessDenied) {
    return (
      <Main>
        <AccessDenied />
      </Main>
    );
  }

  return (
    <Main>
      <StreamSummary stream={params?.stream} onAccessDenied={() => setAccessDenied(true)} onImageResolved={setStreamImageUrl} onNameResolved={setStreamName} />
      <EpisodeList stream={params?.stream} streamImageUrl={streamImageUrl} streamName={streamName} />
    </Main>
  );
}
