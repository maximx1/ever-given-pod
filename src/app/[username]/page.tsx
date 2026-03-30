"use client";

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import Main from '../layout/main';
import ProfileSummary from './profileSummary';
import StreamList from './streamList';
import AddStreamButton from '@/app/common/components/buttons/addStreamButton';
import { resolveApiUrl } from '@/common/helpers/api';
import { StreamDto } from '@/common/dtos/streamDto';
import { useAuth } from '@/app/common/context/AuthContext';

type ProfileData = {
    id: string;
    username: string;
    name?: string;
    email?: string;
    imageUrl?: string;
    creationDate?: string;
    streams: StreamDto[];
};

export default function UserProfilePage() {
    const params = useParams();
    const { user } = useAuth();
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);

    const username = params?.username as string;

    const fetchProfile = useCallback(() => {
        if (!username) return;

        fetch(resolveApiUrl(`/users/${username}`))
            .then((res) => {
                if (!res.ok) {
                    setProfile(null);
                    return null;
                }
                return res.json();
            })
            .then((data) => {
                if (data) setProfile(data);
            })
            .catch(() => {
                setProfile(null);
            })
            .finally(() => setLoading(false));
    }, [username]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    if (loading) {
        return (
            <Main>
                <div className="flex items-center justify-center min-h-[300px]">
                    <p className="text-lg">Loading...</p>
                </div>
            </Main>
        );
    }

    if (!profile) {
        return (
            <Main>
                <div className="flex items-center justify-center min-h-[300px]">
                    <p className="text-lg">User not found.</p>
                </div>
            </Main>
        );
    }

    const canEdit = user?.id === profile?.id;

    return (
        <Main>
            <ProfileSummary
                username={profile.username}
                name={profile.name}
                email={profile.email}
                imageUrl={profile.imageUrl}
                canEdit={canEdit}
                creationDate={profile.creationDate}
                onImageUpdated={(newImageUrl: string) => setProfile((prev) => prev ? { ...prev, imageUrl: newImageUrl } : prev)}
            />
            <StreamList username={profile.username} streams={profile.streams} canEdit={canEdit} onStreamDeleted={fetchProfile} />
            {canEdit && <AddStreamButton onStreamCreated={fetchProfile} />}
        </Main>
    );
}
