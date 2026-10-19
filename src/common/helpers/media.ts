// Whether an episode file is video, judged by its extension as the server does when it is uploaded
export const isVideoUrl = (url?: string) => !!url && /\.(mp4|m4v|mov|webm|mkv|ogv)$/i.test(url.split('?')[0]);
