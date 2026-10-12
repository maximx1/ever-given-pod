"use client";

import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { resolveApiUrl } from '@/common/helpers/api';
import { useAuth } from '@/app/common/context/AuthContext';
import { useFooterHeight } from '@/app/common/hooks/useFooterHeight';
import { SeasonDto, StreamDto } from '@/common/dtos/streamDto';
import { FIELD_LIMITS } from '@/common/limits';
import CharCount from '@/app/common/components/charCount';
import FileDropZone from '@/app/common/components/fileDropZone';

// "02 - Intro.mp3" sorts before "10 - Outro.mp3"
const byFileName = (a: File, b: File) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });

const titleFromFileName = (file: File) =>
    file.name.replace(/\.[^.]+$/, '').replace(/_/g, ' ').trim().slice(0, FIELD_LIMITS.title) || file.name;

const postForm = (path: string, formData: FormData, onProgress?: (percent: number) => void) =>
    new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', resolveApiUrl(path));

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                onProgress?.(Math.round((event.loaded / event.total) * 100));
            }
        };

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve();
                return;
            }
            let message = '';
            try {
                const body = JSON.parse(xhr.responseText);
                message = body.error || body.message || '';
            } catch { /* not JSON */ }
            reject(new Error(message || `Upload failed (${xhr.status})`));
        };

        xhr.onerror = () => reject(new Error('Upload failed. Check your connection.'));

        xhr.send(formData);
    });

export default function AddButton({ stream, onEpisodeCreated, seasons = [] }: { stream?: string | string[]; onEpisodeCreated?: () => void; seasons?: SeasonDto[] }) {
    const { user } = useAuth(),
        visibleFooterHeight = useFooterHeight(),
        [isOwner, setIsOwner] = useState(false),
        [loading, setLoading] = useState(true),
        [dialogOpen, setDialogOpen] = useState(false),
        [title, setTitle] = useState(''),
        [description, setDescription] = useState(''),
        [author, setAuthor] = useState(''),
        [seasonId, setSeasonId] = useState(''),
        [imageFile, setImageFile] = useState<File | null>(null),
        [imagePreview, setImagePreview] = useState<string | null>(null),
        [audioFiles, setAudioFiles] = useState<File[]>([]),
        [submitting, setSubmitting] = useState(false),
        [progress, setProgress] = useState(-1),
        [uploadingName, setUploadingName] = useState(''),
        [batchStarted, setBatchStarted] = useState(false),
        [tab, setTab] = useState<'episode' | 'season'>('episode');

    // The Season tab starts a new season, with any number of files as its first episodes.
    // The Episode tab adds one episode, or several files at once to an existing season.
    // A batch that failed part-way stays a batch, even with one file left to retry.
    const createsSeason = tab === 'season';
    const isBatch = !createsSeason && (audioFiles.length > 1 || batchStarted);
    const titlesFromFiles = createsSeason || isBatch;
    const showsTextFields = !isBatch;
    const imageRequired = !titlesFromFiles && !seasonId;
    const needsSeasonChoice = isBatch && !seasonId;
    const canSubmit = !submitting
        && (createsSeason ? !!title.trim() : audioFiles.length > 0)
        && (!showsTextFields || !!title.trim())
        && !needsSeasonChoice
        && (!imageRequired || !!imageFile);

    useEffect(() => {
        if (!user || !stream) {
            setLoading(false);
            return;
        }

        const checkOwnership = async () => {
            try {
                const res = await fetch(resolveApiUrl(`/${stream}`));
                if (res.ok) {
                    const streamData: StreamDto = await res.json();
                    setIsOwner(streamData.userId === user.id);
                } else {
                    setIsOwner(false);
                }
            } catch {
                setIsOwner(false);
            } finally {
                setLoading(false);
            }
        };

        checkOwnership();
    }, [user, stream]);

    const handleImageSelected = (file: File) => {
        if (!file.type.startsWith('image/')) return;
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const handleAudioSelected = (files: File[]) => {
        const known = new Set(audioFiles.map((file) => `${file.name}:${file.size}`));
        const merged = [...audioFiles, ...files.filter((file) => !known.has(`${file.name}:${file.size}`))].sort(byFileName);
        setAudioFiles(merged);
        // Several files with no season to put them in: they start a new one
        if (tab === 'episode' && merged.length > 1 && !seasonId && !batchStarted) {
            setTab('season');
        }
    };

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setAuthor('');
        setSeasonId('');
        setImageFile(null);
        setImagePreview(null);
        setAudioFiles([]);
        setProgress(-1);
        setUploadingName('');
        setBatchStarted(false);
        setTab('episode');
    };

    const closeDialog = () => {
        setDialogOpen(false);
        resetForm();
    };

    // Creates the season the files will go into and returns its id
    const createSeason = async () => {
        const res = await fetch(resolveApiUrl(`/${stream}/seasons`), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: title.trim(), description: description.trim() }),
        });
        if (!res.ok) throw new Error('Could not create the season.');
        const created: SeasonDto = await res.json();

        // From here on a retry adds to this season instead of creating another
        setSeasonId(created.id);
        setTab('episode');
        setBatchStarted(true);
        onEpisodeCreated?.();

        if (imageFile) {
            const formData = new FormData();
            formData.append('seasonId', created.id);
            formData.append('image', imageFile);
            await postForm(`/${stream}/season-image`, formData).catch((error: Error) => {
                toast.error(`Season cover was not saved: ${error.message}`);
            });
        }
        return created.id;
    };

    const handleSubmit = async () => {
        if (!canSubmit) return;

        setSubmitting(true);
        if (isBatch) setBatchStarted(true);
        const files = [...audioFiles];
        const fromFileNames = titlesFromFiles;
        let uploaded = 0;
        try {
            const targetSeasonId = createsSeason ? await createSeason() : seasonId;

            for (const file of files) {
                setUploadingName(files.length > 1 ? `${uploaded + 1} of ${files.length}: ${file.name}` : '');
                setProgress(0);

                const formData = new FormData();
                formData.append('title', fromFileNames ? titleFromFileName(file) : title.trim());
                formData.append('description', fromFileNames ? '' : description.trim());
                formData.append('author', author.trim());
                if (targetSeasonId) formData.append('seasonId', targetSeasonId);
                if (!fromFileNames && imageFile) formData.append('image', imageFile);
                formData.append('file', file);

                await postForm(`/${stream}/podcasts`, formData, setProgress);
                uploaded += 1;
                // Uploaded files leave the list, so a retry only sends what is left
                setAudioFiles((prev) => prev.filter((f) => f !== file));
            }

            closeDialog();
        } catch (error) {
            const reason = error instanceof Error ? error.message : 'Upload failed.';
            toast.error(files.length > 1 ? `Uploaded ${uploaded} of ${files.length}. ${reason}` : reason);
            setProgress(-1);
            setUploadingName('');
        } finally {
            setSubmitting(false);
            onEpisodeCreated?.();
        }
    };

    const fileCount = `${audioFiles.length} file${audioFiles.length === 1 ? '' : 's'}`;
    const submitLabel = submitting ? (audioFiles.length > 0 ? 'Uploading...' : 'Creating...')
        : createsSeason ? (audioFiles.length > 0 ? `Create Season and Upload ${fileCount}` : 'Create Season')
        : isBatch ? `Upload ${fileCount}`
        : 'Upload';

    if (loading || !isOwner) {
        return null;
    }

    return (
        <>
            <div
                onClick={() => setDialogOpen(true)}
                style={{ position: 'fixed', bottom: `${16 + visibleFooterHeight}px`, right: '16px' }}
                className="w-16 h-16 z-10 shadow-md rounded-full flex items-center justify-center bg-purple-500 cursor-pointer hover:bg-purple-600 transition-colors"
            >
                <span className="text-3xl font-bold text-white">+</span>
            </div>

            {dialogOpen && (
                // Clicking outside does not close this dialog: a stray click would throw away what was typed
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-lg shadow-lg p-6 w-[420px] max-h-[90vh] overflow-y-auto">
                        <div role="tablist" className="flex border-b border-gray-200 mb-4">
                            {(['episode', 'season'] as const).map((name) => (
                                <button
                                    key={name}
                                    type="button"
                                    role="tab"
                                    aria-selected={tab === name}
                                    onClick={() => setTab(name)}
                                    disabled={submitting || batchStarted}
                                    className={`px-4 py-2 -mb-px text-lg font-bold border-b-2 transition-colors disabled:cursor-not-allowed ${
                                        tab === name ? 'border-purple-600 text-gray-800' : 'border-transparent text-gray-400 hover:text-gray-600'
                                    }`}
                                >
                                    {name === 'episode' ? 'Episode' : 'Season'}
                                </button>
                            ))}
                        </div>
                        {createsSeason && (
                            <p className="text-sm text-gray-500 mb-3">
                                A season groups episodes in order: a season of a show, or one book and its parts. Add its first episodes now, or add them later from the Episode tab.
                            </p>
                        )}
                        <div className="space-y-3">
                            {showsTextFields && (
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <label className="text-sm font-medium text-gray-700">{createsSeason ? 'Season Title' : 'Title'}</label>
                                        <CharCount current={title.length} max={FIELD_LIMITS.title} />
                                    </div>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder={createsSeason ? 'Season title, e.g. the book name' : 'Episode title'}
                                        maxLength={FIELD_LIMITS.title}
                                        className="w-full border border-gray-300 rounded-md p-3 text-sm focus:ring-purple-500 focus:border-purple-500 outline-none"
                                        autoFocus
                                        disabled={submitting}
                                        onKeyDown={(e) => { if (e.key === 'Escape' && !submitting) closeDialog(); }}
                                    />
                                </div>
                            )}
                            {showsTextFields && (
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <label className="text-sm font-medium text-gray-700">{createsSeason ? 'Season Description' : 'Description'}</label>
                                        <CharCount current={description.length} max={FIELD_LIMITS.description} />
                                    </div>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder={createsSeason ? 'Optional' : 'Episode description'}
                                        maxLength={FIELD_LIMITS.description}
                                        rows={3}
                                        className="w-full border border-gray-300 rounded-md p-3 text-sm focus:ring-purple-500 focus:border-purple-500 outline-none resize-vertical"
                                        disabled={submitting}
                                        onKeyDown={(e) => { if (e.key === 'Escape' && !submitting) closeDialog(); }}
                                    />
                                </div>
                            )}
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <label className="text-sm font-medium text-gray-700">Author</label>
                                    <CharCount current={author.length} max={FIELD_LIMITS.author} />
                                </div>
                                <input
                                    type="text"
                                    value={author}
                                    onChange={(e) => setAuthor(e.target.value)}
                                    placeholder="Author name"
                                    maxLength={FIELD_LIMITS.author}
                                    className="w-full border border-gray-300 rounded-md p-3 text-sm focus:ring-purple-500 focus:border-purple-500 outline-none"
                                    disabled={submitting}
                                    onKeyDown={(e) => { if (e.key === 'Escape' && !submitting) closeDialog(); }}
                                />
                            </div>
                            {!createsSeason && (seasons.length > 0 || isBatch) && (
                                <div>
                                    <label className="text-sm font-medium text-gray-700 block mb-1">Season</label>
                                    <select
                                        value={seasonId}
                                        onChange={(e) => setSeasonId(e.target.value)}
                                        className="w-full border border-gray-300 rounded-md p-3 text-sm focus:ring-purple-500 focus:border-purple-500 outline-none bg-white"
                                        disabled={submitting}
                                    >
                                        <option value="">{isBatch ? 'Choose a season' : 'No season'}</option>
                                        {seasons.map((season) => (
                                            <option key={season.id} value={season.id}>{season.title}</option>
                                        ))}
                                    </select>
                                    {needsSeasonChoice && (
                                        <p className="text-xs text-red-600 mt-1">
                                            Choose the season these files belong to, or use the Season tab to start a new one.
                                        </p>
                                    )}
                                </div>
                            )}
                            {showsTextFields && (
                                <div>
                                    <label className="text-sm font-medium text-gray-700 block mb-1">
                                        {createsSeason ? 'Season Cover (optional)' : imageRequired ? 'Episode Image' : 'Episode Image (optional)'}
                                    </label>
                                    <FileDropZone
                                        accept="image/*"
                                        label="Drag & drop an image here"
                                        onFileSelected={handleImageSelected}
                                        previewUrl={imagePreview}
                                        onClear={() => { setImageFile(null); setImagePreview(null); }}
                                    />
                                </div>
                            )}
                            <div>
                                <label className="text-sm font-medium text-gray-700 block mb-1">
                                    {createsSeason ? 'Audio Files (optional)' : isBatch ? 'Audio Files' : 'Audio File'}
                                </label>
                                {audioFiles.length > 0 && (
                                    <ol className="border border-gray-300 rounded-md bg-gray-50 mb-2 max-h-[180px] overflow-y-auto divide-y divide-gray-200">
                                        {audioFiles.map((file, index) => (
                                            <li key={`${file.name}:${file.size}`} className="flex items-center justify-between px-3 py-2">
                                                <span className="text-sm text-gray-700 truncate">
                                                    {titlesFromFiles && <span className="text-gray-400 mr-2">{index + 1}.</span>}
                                                    {file.name}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => setAudioFiles((prev) => prev.filter((f) => f !== file))}
                                                    className="text-gray-400 hover:text-gray-600 text-lg leading-none ml-2 disabled:opacity-30"
                                                    disabled={submitting}
                                                    title="Remove file"
                                                >
                                                    &times;
                                                </button>
                                            </li>
                                        ))}
                                    </ol>
                                )}
                                {titlesFromFiles && audioFiles.length > 0 && (
                                    <p className="text-xs text-gray-500 mb-2">
                                        Each file becomes an episode of {createsSeason ? 'the new season' : 'the chosen season'}, in this order. Titles come from the file names.
                                    </p>
                                )}
                                {!submitting && (
                                    <FileDropZone
                                        accept="audio/*"
                                        label={audioFiles.length > 0 ? 'Add more audio files' : 'Drag & drop one or more audio files here'}
                                        multiple
                                        onFilesSelected={handleAudioSelected}
                                    />
                                )}
                            </div>
                        </div>

                        {submitting && progress >= 0 && (
                            <div className="mt-4">
                                {uploadingName && <p className="text-xs text-gray-500 mb-1 truncate">Uploading {uploadingName}</p>}
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-purple-600 h-2 rounded-full transition-all"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-2 mt-4">
                            <button
                                type="button"
                                onClick={closeDialog}
                                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                                disabled={submitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmit}
                                className="px-4 py-2 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
                                disabled={!canSubmit}
                            >
                                {submitLabel}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
