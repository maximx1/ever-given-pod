"use client";

import { useParams } from 'next/navigation';
import Main from '../../layout/main';
import StreamPublishForm from './publishForm';

export default function StreamPublish() {
  const params = useParams();

  return (
    <Main>
      <StreamPublishForm stream={params?.stream} />
    </Main>
  );
}