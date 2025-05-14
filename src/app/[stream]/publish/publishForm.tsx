"use client";

import { useForm, SubmitHandler } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useState } from "react";

type PodcastDto = {
    imageUrl?: FileList;
    title: string;
    description: string;
    uploadDate: string;
    url: FileList;
    author: string;
};

export default function StreamPublishForm({ stream }: { stream?: string | string[] }) {
    const { register, handleSubmit, formState: { errors } } = useForm<PodcastDto>(),
        router = useRouter(),
        [submitting, setSubmitting] = useState(false),
        [progress, setProgress] = useState(-1);

    const onSubmit: SubmitHandler<PodcastDto> = (data) => {
        setSubmitting(true);
        const formData = new FormData();
        formData.append("image", data.imageUrl?.[0] as File);
        formData.append("title", data.title);
        formData.append("description", data.description);
        formData.append("uploadDate", data.uploadDate);
        formData.append("file", data.url?.[0] as File);
        formData.append("author", data.author);

        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/${stream}/podcasts`);

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                setProgress(Math.round((event.loaded / event.total) * 100));
            }
        };

        xhr.onload = () => {
            setSubmitting(false);
            if (xhr.status === 201) {
                alert(`Podcast uploaded: ${data.title}`);
                router.push(`/${stream}/podcasts`);
            } else {
                alert('Error uploading podcast.');
            }
        };

        xhr.onerror = () => {
            setSubmitting(false);
            alert('Error uploading podcast.');
        };

        xhr.send(formData);
    }

    return (
        <div className="max-w-[800px] mx-auto w-full px-4 bg-purple-200 rounded-sm pt-4 pb-4 mt-4">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                        Title
                    </label>
                    <input
                        id="title"
                        {...register("title", { required: "Title is required" })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm p-3"
                    />
                    {errors.title && <p className="text-red-500 text-sm">{errors.title.message}</p>}
                </div>
                <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                        Description
                    </label>
                    <textarea
                        id="description"
                        {...register("description", { required: "Description is required" })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm p-3"
                    />
                    {errors.description && <p className="text-red-500 text-sm">{errors.description.message}</p>}
                </div>
                <div>
                    <label htmlFor="author" className="block text-sm font-medium text-gray-700">
                        Author
                    </label>
                    <input
                        id="author"
                        {...register("author", { required: "Author is required" })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm p-3"
                    />
                    {errors.author && <p className="text-red-500 text-sm">{errors.author.message}</p>}
                </div>

                <div>
                    <label htmlFor="imageFile" className="block text-sm font-medium text-gray-700">
                        Upload Image
                    </label>
                    <input
                        id="imageFile"
                        type="file"
                        accept="image/*"
                        {...register("imageUrl", { required: "Image is required" })}
                        className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border file:border-gray-300 file:text-sm file:font-semibold file:bg-gray-50 hover:file:bg-gray-100"
                    />
                    {errors.imageUrl && <p className="text-red-500 text-sm">{errors.imageUrl.message}</p>}
                </div>

                <div>
                    <label htmlFor="podcastFile" className="block text-sm font-medium text-gray-700">
                        Upload Podcast File
                    </label>
                    <input
                        id="podcastFile"
                        type="file"
                        accept="audio/*"
                        {...register("url", { required: "Podcast file is required" })}
                        className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border file:border-gray-300 file:text-sm file:font-semibold file:bg-gray-50 hover:file:bg-gray-100"
                    />
                    {errors.url && <p className="text-red-500 text-sm">{errors.url.message}</p>}
                </div>
                <button
                    type="submit"
                    className="w-full bg-purple-600 text-purple-200 py-2 px-4 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                    disabled={submitting}
                >
                    {submitting ? 'Uploading...' : 'Upload'}
                </button>
                {progress > 0 && progress < 100 && (
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                        <div
                            className="bg-purple-600 h-2 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                )}
            </form>
        </div>
    );
}