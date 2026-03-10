// @ts-nocheck
import React from 'react';
import {
    ArrowLeftIcon, PencilIcon, Trash2Icon, CalendarIcon,
    TagIcon, DumbbellIcon, Link2Icon, PrinterIcon,
} from 'lucide-react';
import type { Protocol, ProtocolBlock, TextLine } from './ProtocolLibrary';

// ── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
    'Return to Play': 'bg-red-50 text-red-600 border-red-100',
    'Screening': 'bg-blue-50 text-blue-600 border-blue-100',
    'Monitoring': 'bg-amber-50 text-amber-600 border-amber-100',
    'Performance': 'bg-emerald-50 text-emerald-600 border-emerald-100',
    'Prehab': 'bg-purple-50 text-purple-600 border-purple-100',
    'Custom': 'bg-slate-50 text-slate-600 border-slate-200',
};

const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/** Convert **text** → <strong>text</strong> */
const renderBold = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
    });
};

// ── Text Block Line Renderer ─────────────────────────────────────────────────

/** Render an array of TextLines, grouping consecutive bullet/numbered into lists */
const renderTextLines = (lines: TextLine[]) => {
    const elements: React.ReactNode[] = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        if (line.type === 'heading1') {
            elements.push(
                <h2 key={line.id} className="text-xl font-bold text-slate-900 mt-5 mb-2 first:mt-0">
                    {renderBold(line.content)}
                </h2>
            );
            i++;
        } else if (line.type === 'heading2') {
            elements.push(
                <h3 key={line.id} className="text-base font-semibold text-slate-800 mt-4 mb-1.5 first:mt-0">
                    {renderBold(line.content)}
                </h3>
            );
            i++;
        } else if (line.type === 'paragraph') {
            elements.push(
                <p key={line.id} className="text-sm text-slate-700 leading-relaxed mb-2">
                    {renderBold(line.content)}
                </p>
            );
            i++;
        } else if (line.type === 'divider') {
            elements.push(<hr key={line.id} className="border-slate-200 my-4" />);
            i++;
        } else if (line.type === 'bullet') {
            // Collect consecutive bullet lines
            const items: TextLine[] = [];
            while (i < lines.length && lines[i].type === 'bullet') {
                items.push(lines[i]);
                i++;
            }
            elements.push(
                <ul key={items[0].id} className="list-disc list-inside space-y-1 mb-2 ml-1">
                    {items.filter(it => it.content).map(it => (
                        <li key={it.id} className="text-sm text-slate-700">{renderBold(it.content)}</li>
                    ))}
                </ul>
            );
        } else if (line.type === 'numbered') {
            // Collect consecutive numbered lines
            const items: TextLine[] = [];
            while (i < lines.length && lines[i].type === 'numbered') {
                items.push(lines[i]);
                i++;
            }
            elements.push(
                <ol key={items[0].id} className="list-decimal list-inside space-y-1 mb-2 ml-1">
                    {items.filter(it => it.content).map(it => (
                        <li key={it.id} className="text-sm text-slate-700">{renderBold(it.content)}</li>
                    ))}
                </ol>
            );
        } else {
            i++;
        }
    }

    return elements;
};

// ── Block Renderer ───────────────────────────────────────────────────────────

const BlockRenderer: React.FC<{ block: ProtocolBlock }> = ({ block }) => {
    if (block.type === 'text_block') {
        const lines = block.lines || [];
        if (lines.length === 0) return null;
        return <>{renderTextLines(lines)}</>;
    }

    if (block.type === 'exercise_block') {
        const exercises = block.exercises || [];
        return (
            <div className="bg-indigo-50/50 border border-indigo-200 rounded-xl p-4 my-3">
                {block.sectionName && (
                    <div className="flex items-center gap-2 mb-3">
                        <DumbbellIcon size={14} className="text-indigo-500" />
                        <h4 className="text-sm font-semibold text-indigo-700">{block.sectionName}</h4>
                        <span className="text-[10px] text-indigo-400 font-medium">
                            {exercises.length} exercise{exercises.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                )}
                {exercises.length > 0 ? (
                    <div className="space-y-1.5">
                        {exercises.map((ex, idx) => (
                            <div key={idx} className="flex items-start gap-2.5 bg-white rounded-lg border border-slate-200 px-3 py-2">
                                <span className="text-[10px] font-bold text-indigo-400 mt-0.5 w-5 shrink-0 text-right">
                                    {idx + 1}.
                                </span>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-slate-800">{ex.name}</p>
                                    {ex.notes && (
                                        <p className="text-xs text-slate-500 mt-0.5">{ex.notes}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-xs text-indigo-400 italic">No exercises added</p>
                )}
            </div>
        );
    }

    return null;
};

// ── Main Viewer ──────────────────────────────────────────────────────────────

interface ProtocolViewerProps {
    protocol: Protocol;
    onBack: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onShare: () => void;
}

export const ProtocolViewer: React.FC<ProtocolViewerProps> = ({ protocol, onBack, onEdit, onDelete, onShare }) => {
    const catColor = CATEGORY_COLORS[protocol.category] || CATEGORY_COLORS['Custom'];

    const handleSaveAsPdf = () => {
        window.open(`${window.location.origin}/protocol/${protocol.id}`, '_blank');
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="bg-white px-5 py-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
                    >
                        <ArrowLeftIcon size={16} />
                    </button>

                    <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-slate-900 truncate">{protocol.name}</h3>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border ${catColor}`}>
                                <TagIcon size={9} />
                                {protocol.category}
                            </span>
                            <span className="flex items-center gap-1">
                                <CalendarIcon size={10} />
                                Created {formatDate(protocol.createdAt)}
                            </span>
                            {protocol.updatedAt !== protocol.createdAt && (
                                <span className="flex items-center gap-1">
                                    Updated {formatDate(protocol.updatedAt)}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                        <button
                            onClick={onShare}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all"
                        >
                            <Link2Icon size={12} /> Share Link
                        </button>
                        <button
                            onClick={handleSaveAsPdf}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all"
                        >
                            <PrinterIcon size={12} /> Save as PDF
                        </button>
                        <button
                            onClick={onEdit}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all"
                        >
                            <PencilIcon size={12} /> Edit
                        </button>
                        <button
                            onClick={onDelete}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-all"
                        >
                            <Trash2Icon size={12} /> Delete
                        </button>
                    </div>
                </div>
            </div>

            {/* Document body */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-8 sm:px-14 py-8">
                {protocol.blocks.length > 0 ? (
                    protocol.blocks.map(block => (
                        <BlockRenderer key={block.id} block={block} />
                    ))
                ) : (
                    <p className="text-sm text-slate-400 italic text-center py-12">This protocol has no content yet.</p>
                )}
            </div>
        </div>
    );
};
