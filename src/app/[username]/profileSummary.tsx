"use client";

import { resolveApiUrl, resolveAssetUrl } from '@/common/helpers/api';
import ImageWithActions from '@/app/common/components/image/imageWithActions';

type ProfileSummaryProps = {
    username: string;
    name?: string;
    email?: string;
    imageUrl?: string;
    canEdit?: boolean;
    creationDate?: string;
    onImageUpdated?: (imageUrl: string) => void;
};

export default function ProfileSummary({ username, name, email, imageUrl, canEdit, creationDate, onImageUpdated }: ProfileSummaryProps) {
    const displayImage = imageUrl
        ? resolveAssetUrl(`/uploads/${imageUrl}?max=600`)
        : resolveAssetUrl('/icons/person.svg');

    const handleUpload = async (file: File, onProgress: (percent: number) => void) => {
        const formData = new FormData();
        formData.append('image', file);

        return new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', resolveApiUrl('/users/upload-image'));

            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    onProgress(Math.round((e.loaded / e.total) * 100));
                }
            };

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    const data = JSON.parse(xhr.responseText);
                    onImageUpdated?.(data.imageUrl);
                    resolve();
                } else {
                    reject(new Error('Upload failed'));
                }
            };

            xhr.onerror = () => reject(new Error('Upload failed'));
            xhr.send(formData);
        });
    };

    return (
        <div className="podcast-summary w-full h-auto shadow-md overflow-hidden flex flex-col bg-purple-200">
            <div className="flex flex-col md:flex-row md:items-start">
                <div className="relative w-full h-[150px] md:w-1/3 md:h-[376] bg-purple-200 flex-shrink-0">
                    <ImageWithActions
                        src={displayImage}
                        alt={username}
                        canEdit={canEdit}
                        hasImage={!!imageUrl}
                        onUpload={handleUpload}
                    />
                </div>
                <div className="p-4 flex-grow flex flex-col md:ml-4">
                    <h2 className="text-lg font-bold text-gray-800">{name || username}</h2>
                    <p className="text-sm text-gray-600">@{username}</p>

                    <div className="mt-4 text-sm text-gray-500">
                        {email && <p><strong>Email:</strong> {email}</p>}
                        {creationDate && (
                            <p><strong>Member since:</strong> {new Date(creationDate).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric"
                            })}</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
