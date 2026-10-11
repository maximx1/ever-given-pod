"use client";

import { useForm, SubmitHandler } from "react-hook-form";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { resolveApiUrl, resolveAppUrl } from '@/common/helpers/api';
import { FIELD_LIMITS } from '@/common/limits';
import CharCount from '@/app/common/components/charCount';

type SeasonFormDto = {
    seasonTitle: string;
    seasonDescription: string;
    imageUrl?: FileList;
};

export default function SeasonPublishForm({ stream, onSeasonCreated }: {
    stream?: string | string[];
    onSeasonCreated?: () => void;
}) {
    const { register, handleSubmit, watch, formState: { errors } } = useForm<SeasonFormDto>(),
        params = useParams(),
        router = useRouter(),
        [submitting, setSubmitting] = useState(false);

    const onSubmit: SubmitHandler<SeasonFormDto> = (data) => {
        setSubmitting(true);
        const formData = new FormData();
        formData.append("seasonTitle", data.seasonTitle);
        formData.append("seasonDescription", data.seasonDescription);
        if (data.imageUrl?.[0]) {
            formData.append("image", data.imageUrl[0]);
        }
        formData.append("type", "season");

        fetch(resolveApiUrl(`/${stream}/podcasts`), {
            method: 'POST',
            body: formData,
        })
        .then((res) => {
            if (res.ok) {
                onSeasonCreated?.();
                router.push(resolveAppUrl(`/${params?.username}/${stream}`));
            } else {
                alert('Error creating season.');
            }
        })
        .catch(() => alert('Error creating season.'))
        .finally(() => setSubmitting(false));
    };

    return (
        <div className="max-w-[800px] mx-auto w-full px-4 bg-purple-200 rounded-sm pt-4 pb-4 mt-4">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div>
                    <div className="flex items-center gap-2">
                        <label htmlFor="seasonTitle" className="block text-sm font-medium text-gray-700">
                            Season Title
                        </label>
                        <CharCount current={watch('seasonTitle')?.length ?? 0} max={FIELD_LIMITS.title} />
                    </div>
                    <input
                        id="seasonTitle"
                        {...register("seasonTitle", { required: "Title is required" })}
                        maxLength={FIELD_LIMITS.title}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm p-3"
                    />
                    {errors.seasonTitle && <p className="text-red-500 text-sm">{errors.seasonTitle.message}</p>}
                </div>

                <div>
                    <div className="flex items-center gap-2">
                        <label htmlFor="seasonDescription" className="block text-sm font-medium text-gray-700">
                            Description
                        </label>
                        <CharCount current={watch('seasonDescription')?.length ?? 0} max={FIELD_LIMITS.description} />
                    </div>
                    <textarea
                        id="seasonDescription"
                        {...register("seasonDescription", { required: "Description is required" })}
                        maxLength={FIELD_LIMITS.description}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm p-3"
                    />
                    {errors.seasonDescription && <p className="text-red-500 text-sm">{errors.seasonDescription.message}</p>}
                </div>

                <div>
                    <label htmlFor="seasonImageFile" className="block text-sm font-medium text-gray-700">
                        Upload Cover Image (optional)
                    </label>
                    <input
                        id="seasonImageFile"
                        type="file"
                        accept="image/*"
                        {...register("imageUrl")}
                        className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border file:border-gray-300 file:text-sm file:font-semibold file:bg-gray-50 hover:file:bg-gray-100"
                    />
                </div>

                <button
                    type="submit"
                    className="w-full bg-purple-600 text-purple-200 py-2 px-4 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                    disabled={submitting}
                >
                    {submitting ? 'Creating...' : 'Create Season'}
                </button>
            </form>
        </div>
    );
}