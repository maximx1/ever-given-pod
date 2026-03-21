"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/common/context/AuthContext';
import Main from '../layout/main';
import { resolveAppUrl } from '@/common/helpers/api';

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push(resolveAppUrl('/login'));
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <Main>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-lg">Loading...</p>
        </div>
      </Main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <Main>
      <div className="max-w-2xl mx-auto w-full px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-3xl font-bold mb-6">Profile</h1>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-gray-600">Name</label>
              <p className="text-lg">{user.name || 'Not set'}</p>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-600">Email</label>
              <p className="text-lg">{user.email || 'Not set'}</p>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-600">User ID</label>
              <p className="text-lg font-mono text-gray-700">{user.id}</p>
            </div>
          </div>
        </div>
      </div>
    </Main>
  );
}
