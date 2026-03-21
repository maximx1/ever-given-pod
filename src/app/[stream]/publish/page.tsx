"use client";

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Main from '../../layout/main';
import StreamPublishForm from './publishForm';
import { useAuth } from '@/app/common/context/AuthContext';
import { StreamDto } from '@/common/dtos/streamDto';
import { resolveApiUrl, resolveAppUrl } from '@/common/helpers/api';

export default function StreamPublish() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push(resolveAppUrl('/login'));
      return;
    }

    const checkStreamOwnership = async () => {
      try {
        const res = await fetch(resolveApiUrl(`/${params?.stream}`));
        if (res.ok) {
          const streamData: StreamDto = await res.json();
          if (streamData.userId === user.id) {
            setIsAuthorized(true);
          } else {
            router.push(resolveAppUrl('/'));
          }
        } else {
          router.push(resolveAppUrl('/'));
        }
      } catch (err) {
        router.push(resolveAppUrl('/'));
      } finally {
        setLoading(false);
      }
    };

    checkStreamOwnership();
  }, [user, authLoading, params, router]);

  if (loading || authLoading) {
    return (
      <Main>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-lg">Loading...</p>
        </div>
      </Main>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <Main>
      <StreamPublishForm stream={params?.stream} />
    </Main>
  );
}