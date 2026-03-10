// @ts-nocheck
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    ArrowLeftIcon, SaveIcon, PlusIcon, Trash2Icon,
    ChevronUpIcon, ChevronDownIcon,
    Heading1Icon, Heading2Icon, TypeIcon, ListIcon, ListOrderedIcon,
    MinusIcon, DumbbellIcon, XIcon, PlusCircleIcon, FileTextIcon,
} from 'lucide-react';
import type { Protocol, ProtocolBlock, BlockType, TextLine, LineType, ProtocolExercise } from './ProtocolLibrary';
import { PROTOCOL_CATEGORIES } from './ProtocolLibrary';

// ── Helpers ──────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 10);

const LINE_TYPES: { type: LineType; label: string; icon: React.FC<any> }[] = [
    { type: 'heading1', label: 'H1', icon: Heading1Icon },
    { type: 'heading2', label: 'H2', icon: Heading2Icon },
    { type: 'paragraph', label: 'Text', icon: TypeIcon },
    { type: 'bullet', label: 'Bullets', icon: ListIcon },
    { type: 'numbered', label: 'Numbers', icon: ListOrderedIcon },
    { type: 'divider', label: 'Divider', icon: MinusIcon },
];

const makeLine = (type: LineType = 'paragraph'): TextLine => ({
    id: 'ln_' + uid(),
    type,
    content: '',
});

const makeBlock = (type: BlockType): ProtocolBlock => ({
    id: 'blk_' + uid(),
    type,
    ...(type === 'text_block' ? { lines: [makeLine()] } : {}),
    ...(type === 'exercise_block' ? { sectionName: '', exercises: [] } : {}),
});

/** What type should the next line be after Enter? */
const nextLineType = (current: LineType): LineType => {
    if (current === 'bullet') return 'bullet';
    if (current === 'numbered') return 'numbered';
    return 'paragraph';
};

/** Count the display number for a numbered line at `idx` within consecutive numbered lines */
const getNumberedIndex = (lines: TextLine[], idx: number): number => {
    let count = 1;
    for (let i = idx - 1; i >= 0; i--) {
        if (lines[i].type !== 'numbered') break;
        count++;
    }
    return count;
};

// ── Auto-growing textarea ────────────────────────────────────────────────────

const AutoTextarea: React.FC<{
    value: string;
    onChange: (v: string) => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
    onFocus: () => void;
    placeholder?: string;
    className?: string;
    inputRef?: React.Ref<HTMLTextAreaElement>;
}> = ({ value, onChange, onKeyDown, onFocus, placeholder, className = '', inputRef }) => {
    const internalRef = useRef<HTMLTextAreaElement>(null);
    const ref = (inputRef || internalRef) as React.RefObject<HTMLTextAreaElement>;

    useEffect(() => {
        if (ref.current) {
            ref.current.style.height = 'auto';
            ref.current.style.height = ref.current.scrollHeight + 'px';
        }
    }, [value]);

    return (
        <textarea
            ref={ref}
            value={value}
            onChange={e => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={onFocus}
            placeholder={placeholder}
            rows={1}
            className={`w-full resize-none overflow-hidden bg-transparent outline-none ${className}`}
        />
    );
};

// ── Single Line Renderer (edit mode) ─────────────────────────────────────────

const LineEditor: React.FC<{
    line: TextLine;
    lines: TextLine[];
    lineIdx: number;
    isFocused: boolean;
    onChange: (content: string) => void;
    onFocus: () => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
}> = ({ line, lines, lineIdx, isFocused, onChange, onFocus, onKeyDown }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-focus when this line becomes focused
    useEffect(() => {
        if (isFocused) {
            if (line.type === 'paragraph') {
                textareaRef.current?.focus();
            } else if (line.type !== 'divider') {
                inputRef.current?.focus();
            }
        }
    }, [isFocused, line.type]);

    if (line.type === 'divider') {
        return <hr className="border-slate-300 my-2" />;
    }

    if (line.type === 'heading1') {
        return (
            <input
                ref={inputRef}
                type="text"
                value={line.content}
                onChange={e => onChange(e.target.value)}
                onKeyDown={onKeyDown}
                onFocus={onFocus}
                placeholder="Heading 1"
                className="w-full text-xl font-bold text-slate-900 outline-none bg-transparent placeholder:text-slate-400"
            />
        );
    }

    if (line.type === 'heading2') {
        return (
            <input
                ref={inputRef}
                type="text"
                value={line.content}
                onChange={e => onChange(e.target.value)}
                onKeyDown={onKeyDown}
                onFocus={onFocus}
                placeholder="Heading 2"
                className="w-full text-base font-semibold text-slate-800 outline-none bg-transparent placeholder:text-slate-400"
            />
        );
    }

    if (line.type === 'bullet') {
        return (
            <div className="flex items-start gap-2">
                <span className="text-sm text-slate-500 font-medium mt-0.5 w-4 text-right shrink-0">•</span>
                <input
                    ref={inputRef}
                    type="text"
                    value={line.content}
                    onChange={e => onChange(e.target.value)}
                    onKeyDown={onKeyDown}
                    onFocus={onFocus}
                    placeholder="List item..."
                    className="flex-1 text-sm text-slate-700 outline-none bg-transparent placeholder:text-slate-400"
                />
            </div>
        );
    }

    if (line.type === 'numbered') {
        const num = getNumberedIndex(lines, lineIdx);
        return (
            <div className="flex items-start gap-2">
                <span className="text-sm text-slate-500 font-medium mt-0.5 w-4 text-right shrink-0">{num}.</span>
                <input
                    ref={inputRef}
                    type="text"
                    value={line.content}
                    onChange={e => onChange(e.target.value)}
                    onKeyDown={onKeyDown}
                    onFocus={onFocus}
                    placeholder="List item..."
                    className="flex-1 text-sm text-slate-700 outline-none bg-transparent placeholder:text-slate-400"
                />
            </div>
        );
    }

    // paragraph
    return (
        <AutoTextarea
            inputRef={textareaRef}
            value={line.content}
            onChange={onChange}
            onKeyDown={onKeyDown}
            onFocus={onFocus}
            placeholder="Type here... (use **text** for bold)"
            className="text-sm text-slate-700 leading-relaxed placeholder:text-slate-400"
        />
    );
};

// ── Text Block Card ──────────────────────────────────────────────────────────

const TextBlockCard: React.FC<{
    block: ProtocolBlock;
    onChange: (b: ProtocolBlock) => void;
    onDelete: () => void;
    onMove: (dir: -1 | 1) => void;
    isFirst: boolean;
    isLast: boolean;
}> = ({ block, onChange, onDelete, onMove, isFirst, isLast }) => {
    const lines = block.lines || [makeLine()];
    const [focusedIdx, setFocusedIdx] = useState(0);
    const focusedLine = lines[focusedIdx] || lines[0];
    // Track which line ID to auto-focus after insert
    const pendingFocusRef = useRef<string | null>(null);

    const updateLine = (idx: number, content: string) => {
        const updated = lines.map((ln, i) => i === idx ? { ...ln, content } : ln);
        onChange({ ...block, lines: updated });
    };

    const changeLineType = (type: LineType) => {
        const updated = lines.map((ln, i) => i === focusedIdx ? { ...ln, type } : ln);
        onChange({ ...block, lines: updated });
    };

    const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const currentType = lines[idx].type;
            const newLine = makeLine(nextLineType(currentType));
            const updated = [...lines];
            updated.splice(idx + 1, 0, newLine);
            onChange({ ...block, lines: updated });
            pendingFocusRef.current = newLine.id;
            setFocusedIdx(idx + 1);
        }
        if (e.key === 'Backspace' && lines[idx].content === '' && lines.length > 1) {
            e.preventDefault();
            const updated = lines.filter((_, i) => i !== idx);
            onChange({ ...block, lines: updated });
            const newIdx = Math.max(0, idx - 1);
            setFocusedIdx(newIdx);
            pendingFocusRef.current = updated[newIdx]?.id || null;
        }
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center gap-1 px-3 py-2 bg-slate-50 border-b border-slate-200">
                <div className="flex items-center gap-0.5 bg-white rounded-lg border border-slate-200 p-0.5">
                    {LINE_TYPES.map(({ type, label, icon: Icon }) => (
                        <button
                            key={type}
                            onClick={() => changeLineType(type)}
                            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all ${
                                focusedLine?.type === type
                                    ? 'bg-indigo-100 text-indigo-700 shadow-sm'
                                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                            }`}
                            title={label}
                        >
                            <Icon size={13} />
                            <span className="hidden sm:inline">{label}</span>
                        </button>
                    ))}
                </div>
                <div className="flex-1" />
                <div className="flex items-center gap-0.5">
                    <button onClick={() => onMove(-1)} disabled={isFirst} className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 transition-all" title="Move up">
                        <ChevronUpIcon size={14} />
                    </button>
                    <button onClick={() => onMove(1)} disabled={isLast} className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 transition-all" title="Move down">
                        <ChevronDownIcon size={14} />
                    </button>
                    <button onClick={onDelete} className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all" title="Delete block">
                        <Trash2Icon size={14} />
                    </button>
                </div>
            </div>

            {/* Content area — multi-line */}
            <div className="px-4 py-3 space-y-1">
                {lines.map((line, idx) => (
                    <LineEditor
                        key={line.id}
                        line={line}
                        lines={lines}
                        lineIdx={idx}
                        isFocused={focusedIdx === idx && pendingFocusRef.current === line.id}
                        onChange={content => updateLine(idx, content)}
                        onFocus={() => { setFocusedIdx(idx); pendingFocusRef.current = null; }}
                        onKeyDown={e => handleKeyDown(idx, e)}
                    />
                ))}
            </div>
        </div>
    );
};

// ── Exercise Block Card ──────────────────────────────────────────────────────

const ExerciseBlockCard: React.FC<{
    block: ProtocolBlock;
    onChange: (b: ProtocolBlock) => void;
    onDelete: () => void;
    onMove: (dir: -1 | 1) => void;
    isFirst: boolean;
    isLast: boolean;
}> = ({ block, onChange, onDelete, onMove, isFirst, isLast }) => {
    const exercises = block.exercises || [];

    const updateExercise = (idx: number, field: keyof ProtocolExercise, value: string) => {
        const updated = exercises.map((ex, i) => i === idx ? { ...ex, [field]: value } : ex);
        onChange({ ...block, exercises: updated });
    };

    const addExercise = () => {
        onChange({ ...block, exercises: [...exercises, { name: '', notes: '' }] });
    };

    const removeExercise = (idx: number) => {
        onChange({ ...block, exercises: exercises.filter((_, i) => i !== idx) });
    };

    const moveExercise = (idx: number, dir: -1 | 1) => {
        const target = idx + dir;
        if (target < 0 || target >= exercises.length) return;
        const arr = [...exercises];
        [arr[idx], arr[target]] = [arr[target], arr[idx]];
        onChange({ ...block, exercises: arr });
    };

    return (
        <div className="rounded-xl border border-indigo-200 overflow-hidden shadow-sm">
            {/* Header */}
            <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border-b border-indigo-200">
                <DumbbellIcon size={14} className="text-indigo-500 shrink-0" />
                <span className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wide">Exercise Block</span>
                <div className="flex-1" />
                <div className="flex items-center gap-0.5">
                    <button onClick={() => onMove(-1)} disabled={isFirst} className="p-1 rounded text-indigo-400 hover:text-indigo-700 hover:bg-indigo-100 disabled:opacity-30 transition-all" title="Move up">
                        <ChevronUpIcon size={14} />
                    </button>
                    <button onClick={() => onMove(1)} disabled={isLast} className="p-1 rounded text-indigo-400 hover:text-indigo-700 hover:bg-indigo-100 disabled:opacity-30 transition-all" title="Move down">
                        <ChevronDownIcon size={14} />
                    </button>
                    <button onClick={onDelete} className="p-1 rounded text-indigo-400 hover:text-red-500 hover:bg-red-50 transition-all" title="Delete block">
                        <Trash2Icon size={14} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="bg-indigo-50/30 p-4 space-y-3">
                <input
                    type="text"
                    value={block.sectionName || ''}
                    onChange={e => onChange({ ...block, sectionName: e.target.value })}
                    placeholder="Section name (e.g., ROM, Isometrics, Plyometrics)"
                    className="w-full px-3 py-2 rounded-lg border border-indigo-200 bg-white text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 placeholder:text-slate-400 placeholder:font-normal"
                />

                {exercises.length > 0 && (
                    <div className="space-y-1.5">
                        {exercises.map((ex, idx) => (
                            <div key={idx} className="flex items-start gap-2 bg-white rounded-lg border border-slate-200 p-2.5">
                                <span className="text-[10px] font-bold text-indigo-400 mt-2 w-5 shrink-0 text-right">{idx + 1}.</span>
                                <div className="flex-1 space-y-1.5">
                                    <input
                                        type="text"
                                        value={ex.name}
                                        onChange={e => updateExercise(idx, 'name', e.target.value)}
                                        placeholder="Exercise name"
                                        className="w-full text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400 bg-transparent"
                                    />
                                    <input
                                        type="text"
                                        value={ex.notes}
                                        onChange={e => updateExercise(idx, 'notes', e.target.value)}
                                        placeholder="Notes / modifications (optional)"
                                        className="w-full text-xs text-slate-500 outline-none placeholder:text-slate-400 bg-transparent"
                                    />
                                </div>
                                <div className="flex flex-col items-center gap-0.5 shrink-0">
                                    <button onClick={() => moveExercise(idx, -1)} disabled={idx === 0} className="p-0.5 text-slate-300 hover:text-indigo-500 disabled:opacity-30 transition-colors">
                                        <ChevronUpIcon size={12} />
                                    </button>
                                    <button onClick={() => moveExercise(idx, 1)} disabled={idx === exercises.length - 1} className="p-0.5 text-slate-300 hover:text-indigo-500 disabled:opacity-30 transition-colors">
                                        <ChevronDownIcon size={12} />
                                    </button>
                                    <button onClick={() => removeExercise(idx)} className="p-0.5 text-slate-300 hover:text-red-500 transition-colors mt-0.5">
                                        <XIcon size={12} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <button
                    onClick={addExercise}
                    className="flex items-center gap-1.5 text-xs font-medium text-indigo-500 hover:text-indigo-700 transition-colors"
                >
                    <PlusCircleIcon size={13} /> Add Exercise
                </button>
            </div>
        </div>
    );
};

// ── Main Editor ──────────────────────────────────────────────────────────────

interface ProtocolEditorProps {
    protocol?: Protocol;
    onSave: (protocol: Protocol) => void;
    onCancel: () => void;
}

export const ProtocolEditor: React.FC<ProtocolEditorProps> = ({ protocol, onSave, onCancel }) => {
    const isEdit = !!protocol;
    const [name, setName] = useState(protocol?.name || '');
    const [category, setCategory] = useState(protocol?.category || 'Custom');
    const [blocks, setBlocks] = useState<ProtocolBlock[]>(
        protocol?.blocks?.length ? protocol.blocks : []
    );

    const updateBlock = useCallback((idx: number, block: ProtocolBlock) => {
        setBlocks(prev => prev.map((b, i) => i === idx ? block : b));
    }, []);

    const deleteBlock = useCallback((idx: number) => {
        setBlocks(prev => prev.filter((_, i) => i !== idx));
    }, []);

    const moveBlock = useCallback((idx: number, dir: -1 | 1) => {
        setBlocks(prev => {
            const target = idx + dir;
            if (target < 0 || target >= prev.length) return prev;
            const arr = [...prev];
            [arr[idx], arr[target]] = [arr[target], arr[idx]];
            return arr;
        });
    }, []);

    const addBlock = useCallback((type: 'text' | 'exercise') => {
        const blockType: BlockType = type === 'text' ? 'text_block' : 'exercise_block';
        setBlocks(prev => [...prev, makeBlock(blockType)]);
    }, []);

    const handleSave = () => {
        if (!name.trim()) return;
        const now = new Date().toISOString();
        onSave({
            id: protocol?.id || 'proto_' + uid(),
            name: name.trim(),
            category,
            blocks,
            createdAt: protocol?.createdAt || now,
            updatedAt: now,
        });
    };

    return (
        <div className="space-y-4">
            {/* Header bar */}
            <div className="bg-white px-5 py-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                    <button onClick={onCancel} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all">
                        <ArrowLeftIcon size={16} />
                    </button>
                    <h3 className="text-sm font-semibold text-slate-700">
                        {isEdit ? 'Edit Protocol' : 'Create Protocol'}
                    </h3>
                    <div className="flex-1" />
                    <button
                        onClick={handleSave}
                        disabled={!name.trim()}
                        className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-all"
                    >
                        <SaveIcon size={13} /> Save
                    </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Protocol title"
                        className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-900 outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 placeholder:text-slate-400"
                    />
                    <select
                        value={category}
                        onChange={e => setCategory(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 bg-white min-w-[160px]"
                    >
                        {PROTOCOL_CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Blocks */}
            <div className="space-y-3">
                {blocks.map((block, idx) => (
                    block.type === 'exercise_block' ? (
                        <ExerciseBlockCard
                            key={block.id}
                            block={block}
                            onChange={b => updateBlock(idx, b)}
                            onDelete={() => deleteBlock(idx)}
                            onMove={dir => moveBlock(idx, dir)}
                            isFirst={idx === 0}
                            isLast={idx === blocks.length - 1}
                        />
                    ) : (
                        <TextBlockCard
                            key={block.id}
                            block={block}
                            onChange={b => updateBlock(idx, b)}
                            onDelete={() => deleteBlock(idx)}
                            onMove={dir => moveBlock(idx, dir)}
                            isFirst={idx === 0}
                            isLast={idx === blocks.length - 1}
                        />
                    )
                ))}

                {blocks.length === 0 && (
                    <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                        <FileTextIcon size={28} className="mx-auto text-slate-300 mb-3" />
                        <p className="text-sm text-slate-500 font-medium mb-1">Start building your protocol</p>
                        <p className="text-xs text-slate-400">Add a text or exercise block below to get started</p>
                    </div>
                )}

                {/* Add Block buttons */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                    <button
                        onClick={() => addBlock('text')}
                        className="flex items-center justify-center gap-2 px-4 py-4 bg-white border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all"
                    >
                        <PlusIcon size={16} />
                        <span className="text-sm font-medium">Text Block</span>
                    </button>
                    <button
                        onClick={() => addBlock('exercise')}
                        className="flex items-center justify-center gap-2 px-4 py-4 bg-indigo-50/50 border-2 border-dashed border-indigo-300 rounded-xl text-indigo-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                    >
                        <DumbbellIcon size={16} />
                        <span className="text-sm font-medium">Exercise Block</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
