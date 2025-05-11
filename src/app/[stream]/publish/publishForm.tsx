"use client";

import { useForm, SubmitHandler } from "react-hook-form";

type PodcastDto = {
    imageUrl?: FileList;
    title: string;
    description: string;
    uploadDate: string;
    url: FileList;
    author: string;
};

export default function StreamPublishForm({ stream }: { stream?: string }) {
    const { register, handleSubmit, formState: { errors } } = useForm<PodcastDto>();

    const onSubmit: SubmitHandler<PodcastDto> = (data) => {
        const formData = new FormData();
        formData.append("image", data.imageUrl?.[0] as File);
        formData.append("title", data.title);
        formData.append("description", data.description);
        formData.append("uploadDate", data.uploadDate);
        formData.append("file", data.url?.[0] as File);
        formData.append("author", data.author);


        fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/${stream}/podcasts`, {
            method: "POST",
            body: formData,
        })
            .then((res) => res.json())
            .then((result) => {
                console.log("Podcast created:", result);
            })
            .catch((err) => console.error("Error creating podcast:", err));
    };

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
                >
                    Submit
                </button>
            </form>
        </div>
    );
}