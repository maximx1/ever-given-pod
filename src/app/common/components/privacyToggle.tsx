"use client";

type PrivacyToggleProps = {
    isPrivate: boolean;
    onChange: (isPrivate: boolean) => void;
};

export default function PrivacyToggle({ isPrivate, onChange }: PrivacyToggleProps) {
    return (
        <button
            type="button"
            onClick={() => onChange(!isPrivate)}
            className="flex items-center group transition-all duration-200 bg-transparent rounded-sm hover:bg-purple-400 hover:shadow pl-1 pr-2 py-2 text-sm select-none cursor-pointer"
            title={isPrivate ? 'Stream is private — click to make public' : 'Stream is public — click to make private'}
        >
            <div className={`relative w-8 h-4 rounded-full transition-colors ${isPrivate ? 'bg-purple-800' : 'bg-purple-400 group-hover:bg-purple-200'}`}>
                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${isPrivate ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
            </div>
            <span className="overflow-hidden max-w-0 group-hover:max-w-[150px] transition-all duration-200 whitespace-nowrap ml-1">
                {isPrivate ? 'Private' : 'Public'}
            </span>
        </button>
    );
}
