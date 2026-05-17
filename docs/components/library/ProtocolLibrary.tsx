// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { SupabaseStorageService as StorageService } from '../../services/storageService';
import { ProtocolEditor } from './ProtocolEditor';
import { ProtocolViewer } from './ProtocolViewer';
import { ShareProtocolPopover } from './ShareProtocolPopover';
import { ConfirmDeleteModal } from '../ui/ConfirmDeleteModal';
import {
    PlusIcon, SearchIcon,
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
    'Return to Play': 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-800/40',
    'Screening':      'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800/40',
    'Monitoring':     'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800/40',
    'Performance':    'bg-emerald-50 dark:bg-emerald-900/25 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/40',
    'Prehab':         'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-800/40',
    'Custom':         'bg-slate-100 dark:bg-[#1A2D48] text-slate-600 dark:text-[#CBD5E1] border-slate-200 dark:border-[#243A58]',
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
    <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-[#1A2D48] p-0.5 rounded-lg border border-slate-200 dark:border-[#243A58]">
        <button
            onClick={() => setView('list')}
            className={`p-1.5 rounded-md transition-all ${view === 'list' ? 'bg-white dark:bg-[#132338] text-slate-900 dark:text-[#E2E8F0] shadow-sm' : 'text-slate-400 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#94A3B8]'}`}
            title="List view"
        >
            <ListIcon size={13} />
        </button>
        <button
            onClick={() => setView('grid')}
            className={`p-1.5 rounded-md transition-all ${view === 'grid' ? 'bg-white dark:bg-[#132338] text-slate-900 dark:text-[#E2E8F0] shadow-sm' : 'text-slate-400 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#94A3B8]'}`}
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
    const [confirmDeleteProto, setConfirmDeleteProto] = useState<{ id: string; name: string } | null>(null);
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
        saveProtocols(protocols.filter(p => p.id !== id));
        setPageView('list');
        setActiveProtocol(null);
        setConfirmDeleteProto(null);
    }, [protocols, saveProtocols]);

    // Filter protocols
    const filtered = protocols.filter(p => {
        if (categoryFilter !== 'All' && p.category !== categoryFilter) return false;
        if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    // ── Sub-Views ─────────────────────────────────────────────────────────────

    if (loading) {
        return <div className="text-center py-12 text-sm text-slate-400 dark:text-[#CBD5E1]">Loading protocols...</div>;
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
                    onDelete={() => setConfirmDeleteProto({ id: activeProtocol.id, name: activeProtocol.name })}
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
                                    : 'bg-white dark:bg-[#0F1C30] text-slate-500 dark:text-[#CBD5E1] border-slate-200 dark:border-[#243A58] hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-600 dark:hover:text-indigo-300'
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
                        className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-500 transition-all"
                    >
                        <PlusIcon size={13} /> Create Protocol
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="bg-white dark:bg-[#132338] px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm flex items-center gap-3">
                <SearchIcon size={16} className="text-slate-400 dark:text-[#CBD5E1] shrink-0" />
                <input
                    type="text"
                    placeholder="Search protocols..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="flex-1 bg-transparent text-sm outline-none text-slate-900 dark:text-[#E2E8F0] placeholder:text-slate-400 dark:placeholder:text-[#475569]"
                />
                <span className="text-xs text-slate-400 dark:text-[#CBD5E1] border-l border-slate-200 dark:border-[#243A58] pl-3 shrink-0">
                    {filtered.length} protocol{filtered.length !== 1 ? 's' : ''}
                </span>
            </div>

            {/* Protocol cards / table */}
            {filtered.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-[#243A58] rounded-xl">
                    <ClipboardListIcon size={32} className="mx-auto text-slate-300 dark:text-[#475569] mb-3" />
                    <p className="text-sm text-slate-400 dark:text-[#CBD5E1] font-medium">
                        {protocols.length === 0 ? 'No protocols yet' : 'No protocols match your filters'}
                    </p>
                    <p className="text-xs text-slate-300 dark:text-[#475569] mt-1">
                        {protocols.length === 0
                            ? 'Create your first protocol document — RTP frameworks, testing protocols, screening guides & more'
                            : 'Try adjusting your search or category filter'}
                    </p>
                    {protocols.length === 0 && (
                        <button
                            onClick={() => setPageView('create')}
                            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-500 transition-all"
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
                                className="bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-xl p-4 hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-700/60 transition-all cursor-pointer group relative"
                            >
                                <button
                                    onClick={(e) => handleShare(e, protocol)}
                                    className="absolute bottom-3 right-3 p-1.5 rounded-lg border opacity-0 group-hover:opacity-100 transition-all bg-white dark:bg-[#1A2D48] border-slate-200 dark:border-[#243A58] text-slate-400 dark:text-[#CBD5E1] hover:text-indigo-600 dark:hover:text-indigo-300 hover:border-indigo-200 dark:hover:border-indigo-700"
                                    title="Share protocol"
                                >
                                    <Link2Icon size={12} />
                                </button>
                                <div className="mb-3">
                                    <h4 className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0] truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors mb-1">
                                        {protocol.name}
                                    </h4>
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border ${CATEGORY_COLORS[protocol.category] || CATEGORY_COLORS['Custom']}`}>
                                        <TagIcon size={9} />
                                        {protocol.category}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 text-[11px] text-slate-400 dark:text-[#CBD5E1]">
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
                <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] overflow-hidden">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-[#243A58] bg-slate-50 dark:bg-[#0F1C30]">
                                <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#CBD5E1]">Protocol Name</th>
                                <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#CBD5E1]">Category</th>
                                <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#CBD5E1]">Blocks</th>
                                <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#CBD5E1]">Exercises</th>
                                <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#CBD5E1] text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-[#1A2D48]">
                            {filtered.map(protocol => {
                                const exerciseCount = countExercises(protocol.blocks);
                                const blockCount = countBlocks(protocol.blocks);
                                return (
                                    <tr
                                        key={protocol.id}
                                        onClick={() => { setActiveProtocol(protocol); setPageView('view'); }}
                                        className="group hover:bg-slate-50 dark:hover:bg-[#1A2D48] transition-colors cursor-pointer"
                                    >
                                        <td className="px-5 py-3">
                                            <span className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0] group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
                                                {protocol.name}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border ${CATEGORY_COLORS[protocol.category] || CATEGORY_COLORS['Custom']}`}>
                                                {protocol.category}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-xs text-slate-500 dark:text-[#CBD5E1]">{blockCount}</td>
                                        <td className="px-5 py-3 text-xs text-slate-500 dark:text-[#CBD5E1]">{exerciseCount || '—'}</td>
                                        <td className="px-5 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={e => { e.stopPropagation(); setActiveProtocol(protocol); setPageView('view'); }}
                                                    className="p-1.5 rounded-lg text-slate-400 dark:text-[#CBD5E1] hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/25 transition-all"
                                                    title="View"
                                                >
                                                    <EyeIcon size={14} />
                                                </button>
                                                <button
                                                    onClick={e => handleShare(e, protocol)}
                                                    className="p-1.5 rounded-lg text-slate-400 dark:text-[#CBD5E1] hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/25 transition-all"
                                                    title="Share protocol"
                                                >
                                                    <Link2Icon size={14} />
                                                </button>
                                                <button
                                                    onClick={e => { e.stopPropagation(); setConfirmDeleteProto({ id: protocol.id, name: protocol.name }); }}
                                                    className="p-1.5 rounded-lg text-slate-400 dark:text-[#CBD5E1] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
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
            <ConfirmDeleteModal
                isOpen={!!confirmDeleteProto}
                title="Delete Protocol"
                message={`Are you sure you want to delete "${confirmDeleteProto?.name}"?`}
                onConfirm={() => handleDelete(confirmDeleteProto?.id)}
                onCancel={() => setConfirmDeleteProto(null)}
            />
        </div>
    );
};
