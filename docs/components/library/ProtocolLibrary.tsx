// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { SupabaseStorageService as StorageService } from '../../services/storageService';
import { ProtocolEditor } from './ProtocolEditor';
import { ProtocolViewer } from './ProtocolViewer';
import { ShareProtocolPopover } from './ShareProtocolPopover';
import {
    PlusIcon, SearchIcon, FileTextIcon, CalendarIcon,
    LayersIcon, Trash2Icon, TagIcon, ClipboardListIcon,
    ListIcon, LayoutGridIcon, EyeIcon, DumbbellIcon,
    Link2Icon,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

export type BlockType = 'text_block' | 'exercise_block' | 'pdf_block';
export type LineType = 'heading1' | 'heading2' | 'paragraph' | 'bullet' | 'numbered' | 'divider';

export interface TextLine {
    id: string;
    type: LineType;
    content: string;
}

export interface ProtocolExercise {
    name: string;
    notes: string;
}

export interface ProtocolBlock {
    id: string;
    type: BlockType;
    lines?: TextLine[];
    sectionName?: string;
    exercises?: ProtocolExercise[];
    // pdf_block fields
    pdfTitle?: string;
    pdfFileName?: string;
    pdfFileSize?: number;
    pdfUrl?: string;
}

export interface ProtocolAttachment {
    id: string;
    title: string;
    fileName: string;
    fileSize: number;
    url: string;
}

export interface Protocol {
    id: string;
    name: string;
    category: string;
    blocks: ProtocolBlock[];
    attachments?: ProtocolAttachment[];
    createdAt: string;
    updatedAt: string;
}

export const PROTOCOL_CATEGORIES = [
    'Return to Play',
    'Screening',
    'Monitoring',
    'Performance',
    'Prehab',
    'Custom',
] as const;

const CATEGORY_COLORS: Record<string, string> = {
    'Return to Play': 'bg-red-50 text-red-600 border-red-100',
    'Screening': 'bg-blue-50 text-blue-600 border-blue-100',
    'Monitoring': 'bg-amber-50 text-amber-600 border-amber-100',
    'Performance': 'bg-emerald-50 text-emerald-600 border-emerald-100',
    'Prehab': 'bg-purple-50 text-purple-600 border-purple-100',
    'Custom': 'bg-slate-50 text-slate-600 border-slate-200',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const countExercises = (blocks: ProtocolBlock[]) =>
    blocks.reduce((sum, b) => sum + (b.exercises?.length ?? 0), 0);

const countBlocks = (blocks: ProtocolBlock[]) => blocks.length;

// ── View Toggle ─────────────────────────────────────────────────────────────

// All 95 testing protocols generated from the complete protocol reference document.
// These appear for every user by default — merged on first load if not already present.
import { DEFAULT_PROTOCOLS } from '../../utils/defaultProtocols';

const ViewToggle: React.FC<{ view: 'grid' | 'list'; setView: (v: 'grid' | 'list') => void }> = ({ view, setView }) => (
    <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
        <button
            onClick={() => setView('list')}
            className={`p-1.5 rounded-md transition-all ${view === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}
            title="List view"
        >
            <ListIcon size={13} />
        </button>
        <button
            onClick={() => setView('grid')}
            className={`p-1.5 rounded-md transition-all ${view === 'grid' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}
            title="Grid view"
        >
            <LayoutGridIcon size={13} />
        </button>
    </div>
);

// ── Component ────────────────────────────────────────────────────────────────

export const ProtocolLibrary: React.FC = () => {
    const [protocols, setProtocols] = useState<Protocol[]>([]);
    const [loading, setLoading] = useState(true);
    const [pageView, setPageView] = useState<'list' | 'create' | 'edit' | 'view'>('list');
    const [activeProtocol, setActiveProtocol] = useState<Protocol | null>(null);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('grid');
    const [shareTarget, setShareTarget] = useState<Protocol | null>(null);

    const handleShare = useCallback((e: React.MouseEvent, protocol: Protocol) => {
        e.stopPropagation();
        setShareTarget(protocol);
    }, []);

    // Load protocols on mount — defaults are the base, user-created protocols layer on top
    useEffect(() => {
        (async () => {
            try {
                const data = await StorageService.getProtocols();
                const userProtocols = Array.isArray(data) ? data : [];

                // Build name lookup of defaults (normalised to lowercase for matching)
                const defaultNames = new Set(DEFAULT_PROTOCOLS.map(p => p.name.toLowerCase().trim()));
                const defaultIds = new Set(DEFAULT_PROTOCOLS.map(p => p.id));

                // User protocols that are NOT duplicates of defaults (by name or ID)
                const userOriginals = userProtocols.filter(p =>
                    !defaultIds.has(p.id) && !defaultNames.has(p.name?.toLowerCase().trim())
                );

                // Final list: all 95 defaults + any user-created originals on top
                const merged = [...userOriginals, ...DEFAULT_PROTOCOLS];
                setProtocols(merged);

                // Persist the clean merged set (removes old duplicates)
                if (userProtocols.length !== merged.length || userOriginals.length !== userProtocols.length) {
                    await StorageService.saveProtocols(merged);
                }
            } catch (err) {
                console.error('Load protocols error:', err);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const saveProtocols = useCallback(async (updated: Protocol[]) => {
        setProtocols(updated);
        try {
            await StorageService.saveProtocols(updated);
        } catch (err) {
            console.error('Save protocols error:', err);
        }
    }, []);

    const handleSave = useCallback((protocol: Protocol) => {
        const exists = protocols.find(p => p.id === protocol.id);
        const updated = exists
            ? protocols.map(p => p.id === protocol.id ? { ...protocol, updatedAt: new Date().toISOString() } : p)
            : [protocol, ...protocols];
        saveProtocols(updated);
        setActiveProtocol(protocol);
        setPageView('view');
    }, [protocols, saveProtocols]);

    const handleDelete = useCallback((id: string) => {
        if (!confirm('Delete this protocol?')) return;
        saveProtocols(protocols.filter(p => p.id !== id));
        setPageView('list');
        setActiveProtocol(null);
    }, [protocols, saveProtocols]);

    // Filter protocols
    const filtered = protocols.filter(p => {
        if (categoryFilter !== 'All' && p.category !== categoryFilter) return false;
        if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    // ── Sub-Views ─────────────────────────────────────────────────────────────

    if (loading) {
        return <div className="text-center py-12 text-sm text-slate-400">Loading protocols...</div>;
    }

    if (pageView === 'create') {
        return (
            <ProtocolEditor
                onSave={handleSave}
                onCancel={() => setPageView('list')}
            />
        );
    }

    if (pageView === 'edit' && activeProtocol) {
        return (
            <ProtocolEditor
                protocol={activeProtocol}
                onSave={handleSave}
                onCancel={() => setPageView('view')}
            />
        );
    }

    if (pageView === 'view' && activeProtocol) {
        return (
            <>
                <ProtocolViewer
                    protocol={activeProtocol}
                    onBack={() => { setPageView('list'); setActiveProtocol(null); }}
                    onEdit={() => setPageView('edit')}
                    onDelete={() => handleDelete(activeProtocol.id)}
                    onShare={() => setShareTarget(activeProtocol)}
                />
                {shareTarget && (
                    <ShareProtocolPopover
                        protocolId={shareTarget.id}
                        protocolName={shareTarget.name}
                        onClose={() => setShareTarget(null)}
                    />
                )}
            </>
        );
    }

    // ── Browse view ───────────────────────────────────────────────────────────

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                    {['All', ...PROTOCOL_CATEGORIES].map(cat => (
                        <button
                            key={cat}
                            onClick={() => setCategoryFilter(cat)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                                categoryFilter === cat
                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                    : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-200 hover:text-indigo-600'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <ViewToggle view={layoutMode} setView={setLayoutMode} />
                    <button
                        onClick={() => setPageView('create')}
                        className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-all"
                    >
                        <PlusIcon size={13} /> Create Protocol
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                <SearchIcon size={16} className="text-slate-400 shrink-0" />
                <input
                    type="text"
                    placeholder="Search protocols..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="flex-1 bg-transparent text-sm outline-none text-slate-900 placeholder:text-slate-400"
                />
                <span className="text-xs text-slate-400 border-l border-slate-200 pl-3 shrink-0">
                    {filtered.length} protocol{filtered.length !== 1 ? 's' : ''}
                </span>
            </div>

            {/* Protocol cards / table */}
            {filtered.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-xl">
                    <ClipboardListIcon size={32} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-sm text-slate-400 font-medium">
                        {protocols.length === 0 ? 'No protocols yet' : 'No protocols match your filters'}
                    </p>
                    <p className="text-xs text-slate-300 mt-1">
                        {protocols.length === 0
                            ? 'Create your first protocol document — RTP frameworks, testing protocols, screening guides & more'
                            : 'Try adjusting your search or category filter'}
                    </p>
                    {protocols.length === 0 && (
                        <button
                            onClick={() => setPageView('create')}
                            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-all"
                        >
                            Create Protocol
                        </button>
                    )}
                </div>
            ) : layoutMode === 'grid' ? (
                /* ── Grid View ─────────────────────────────────────────────── */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filtered.map(protocol => {
                        const exerciseCount = countExercises(protocol.blocks);
                        const blockCount = countBlocks(protocol.blocks);
                        return (
                            <div
                                key={protocol.id}
                                onClick={() => { setActiveProtocol(protocol); setPageView('view'); }}
                                className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group relative"
                            >
                                <button
                                    onClick={(e) => handleShare(e, protocol)}
                                    className="absolute bottom-3 right-3 p-1.5 rounded-lg border opacity-0 group-hover:opacity-100 transition-all bg-white border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200"
                                    title="Share protocol"
                                >
                                    <Link2Icon size={12} />
                                </button>
                                <div className="flex items-start gap-3 mb-3">
                                    <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0">
                                        <FileTextIcon size={16} className="text-indigo-500" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h4 className="text-sm font-semibold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                                            {protocol.name}
                                        </h4>
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border mt-1 ${CATEGORY_COLORS[protocol.category] || CATEGORY_COLORS['Custom']}`}>
                                            <TagIcon size={9} />
                                            {protocol.category}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 text-[11px] text-slate-400">
                                    <span className="flex items-center gap-1">
                                        <LayersIcon size={10} />
                                        {blockCount} block{blockCount !== 1 ? 's' : ''}
                                    </span>
                                    {exerciseCount > 0 && (
                                        <span className="flex items-center gap-1">
                                            <DumbbellIcon size={10} />
                                            {exerciseCount}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* ── List View (table) ─────────────────────────────────────── */
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50">
                                <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Protocol Name</th>
                                <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Category</th>
                                <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Blocks</th>
                                <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Exercises</th>
                                <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.map(protocol => {
                                const exerciseCount = countExercises(protocol.blocks);
                                const blockCount = countBlocks(protocol.blocks);
                                return (
                                    <tr
                                        key={protocol.id}
                                        onClick={() => { setActiveProtocol(protocol); setPageView('view'); }}
                                        className="group hover:bg-slate-50 transition-colors cursor-pointer"
                                    >
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0">
                                                    <FileTextIcon size={14} className="text-indigo-500" />
                                                </div>
                                                <span className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                                                    {protocol.name}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border ${CATEGORY_COLORS[protocol.category] || CATEGORY_COLORS['Custom']}`}>
                                                {protocol.category}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-xs text-slate-500">{blockCount}</td>
                                        <td className="px-5 py-3 text-xs text-slate-500">{exerciseCount || '—'}</td>
                                        <td className="px-5 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={e => { e.stopPropagation(); setActiveProtocol(protocol); setPageView('view'); }}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                                                    title="View"
                                                >
                                                    <EyeIcon size={14} />
                                                </button>
                                                <button
                                                    onClick={e => handleShare(e, protocol)}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                                                    title="Share protocol"
                                                >
                                                    <Link2Icon size={14} />
                                                </button>
                                                <button
                                                    onClick={e => { e.stopPropagation(); handleDelete(protocol.id); }}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                                                    title="Delete"
                                                >
                                                    <Trash2Icon size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {shareTarget && (
                <ShareProtocolPopover
                    protocolId={shareTarget.id}
                    protocolName={shareTarget.name}
                    onClose={() => setShareTarget(null)}
                />
            )}
        </div>
    );
};
