"use client";

import { useState, useRef, useEffect } from 'react';

type EditableTextProps = {
    value: string;
    canEdit: boolean;
    maxLength?: number;
    onSave: (newValue: string) => Promise<boolean>;
    className?: string;
    inputClassName?: string;
    tag?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
};

export default function EditableText({
    value,
    canEdit,
    maxLength,
    onSave,
    className = '',
    inputClassName = '',
    tag: Tag = 'span',
}: EditableTextProps) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(value);
    const [saving, setSaving] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editing) {
            inputRef.current?.focus();
            inputRef.current?.select();
        }
    }, [editing]);

    const handleSave = async () => {
        const trimmed = draft.trim();
        if (!trimmed || trimmed === value) {
            setEditing(false);
            setDraft(value);
            return;
        }
        setSaving(true);
        const ok = await onSave(trimmed);
        setSaving(false);
        if (ok) {
            setEditing(false);
        } else {
            setDraft(value);
            setEditing(false);
        }
    };

    const handleCancel = () => {
        setDraft(value);
        setEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSave();
        if (e.key === 'Escape') handleCancel();
    };

    if (!editing) {
        return (
            <Tag
                className={`${className} ${canEdit ? 'cursor-pointer hover:underline decoration-card-strong underline-offset-4' : ''}`}
                onClick={canEdit ? () => { setDraft(value); setEditing(true); } : undefined}
                title={canEdit ? 'Click to edit' : undefined}
            >
                {value}
            </Tag>
        );
    }

    return (
        <span className="inline-flex items-center gap-1.5">
            <input
                ref={inputRef}
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                maxLength={maxLength}
                disabled={saving}
                className={`border border-line rounded-sm px-2 py-0.5 text-sm focus:ring-accent focus:border-accent outline-none ${inputClassName}`}
            />
            <button
                type="button"
                onClick={handleSave}
                disabled={saving || !draft.trim()}
                className="text-xs px-2 py-0.5 bg-accent text-on-accent rounded-sm hover:bg-accent-strong disabled:opacity-50 cursor-pointer"
            >
                Save
            </button>
            <button
                type="button"
                onClick={handleCancel}
                disabled={saving}
                className="text-xs px-2 py-0.5 bg-track-strong text-ink-2 rounded-sm hover:bg-track-deep cursor-pointer"
            >
                Cancel
            </button>
        </span>
    );
}
