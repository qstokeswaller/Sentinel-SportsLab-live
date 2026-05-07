// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { DatabaseService } from '../services/databaseService';
import { AlertCircle, FileText, Printer, DumbbellIcon, TagIcon, Activity as ActivityIcon } from 'lucide-react';

const BrandingBanner = () => (
    <div className="bg-white border-b border-slate-100 py-4 print:py-6 print:border-b-2 print:border-slate-200">
        <div className="flex flex-col items-center justify-center gap-1.5">
            <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                    <ActivityIcon className="text-white w-3.5 h-3.5" />
                </div>
                <span className="font-bold text-base text-slate-900 tracking-tight">
                    Sentinel <span className="text-indigo-600">SportsLab</span>
                </span>
            </div>
            <span className="text-[10px] text-slate-400 tracking-wide uppercase">Athlete Monitoring & Performance Intelligence</span>
        </div>
    </div>
);

// ── Types (duplicated from ProtocolLibrary — standalone page, no app imports) ─

interface TextLine { id: string; type: string; content: string; }
interface ProtocolExercise { name: string; notes: string; }
interface ProtocolBlock {
    id: string;
    type: 'text_block' | 'exercise_block';
    lines?: TextLine[];
    sectionName?: string;
    exercises?: ProtocolExercise[];
}
interface Protocol {
    id: string;
    name: string;
    category: string;
    blocks: ProtocolBlock[];
    createdAt: string;
    updatedAt: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
    'Return to Play': 'bg-red-50 text-red-600 border-red-100',
    'Screening': 'bg-blue-50 text-blue-600 border-blue-100',
    'Monitoring': 'bg-amber-50 text-amber-600 border-amber-100',
    'Performance': 'bg-emerald-50 text-emerald-600 border-emerald-100',
    'Prehab': 'bg-purple-50 text-purple-600 border-purple-100',
    'Custom': 'bg-slate-50 text-slate-600 border-slate-200',
};

const formatDate = (iso: string) => {
    try {
        return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
        return '';
    }
};

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

const renderTextLines = (lines: TextLine[]) => {
    if (!Array.isArray(lines)) return null;
    const elements: React.ReactNode[] = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];
        if (!line) { i++; continue; }

        if (line.type === 'heading1') {
            elements.push(
                <h2 key={line.id || i} className="text-xl font-bold text-slate-900 mt-5 mb-2 first:mt-0">
                    {renderBold(line.content)}
                </h2>
            );
            i++;
        } else if (line.type === 'heading2') {
            elements.push(
                <h3 key={line.id || i} className="text-base font-semibold text-slate-800 mt-4 mb-1.5 first:mt-0">
                    {renderBold(line.content)}
                </h3>
            );
            i++;
        } else if (line.type === 'paragraph') {
            elements.push(
                <p key={line.id || i} className="text-sm text-slate-700 leading-relaxed mb-2">
                    {renderBold(line.content)}
                </p>
            );
            i++;
        } else if (line.type === 'divider') {
            elements.push(<hr key={line.id || i} className="border-slate-200 my-4" />);
            i++;
        } else if (line.type === 'bullet') {
            const items: TextLine[] = [];
            while (i < lines.length && lines[i]?.type === 'bullet') {
                items.push(lines[i]);
                i++;
            }
            elements.push(
                <ul key={items[0]?.id || `ul-${i}`} className="list-disc list-inside space-y-1 mb-2 ml-1">
                    {items.filter(it => it.content).map((it, idx) => (
                        <li key={it.id || idx} className="text-sm text-slate-700">{renderBold(it.content)}</li>
                    ))}
                </ul>
            );
        } else if (line.type === 'numbered') {
            const items: TextLine[] = [];
            while (i < lines.length && lines[i]?.type === 'numbered') {
                items.push(lines[i]);
                i++;
            }
            elements.push(
                <ol key={items[0]?.id || `ol-${i}`} className="list-decimal list-inside space-y-1 mb-2 ml-1">
                    {items.filter(it => it.content).map((it, idx) => (
                        <li key={it.id || idx} className="text-sm text-slate-700">{renderBold(it.content)}</li>
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
    if (!block) return null;

    if (block.type === 'text_block') {
        const lines = block.lines || [];
        if (lines.length === 0) return null;
        return <>{renderTextLines(lines)}</>;
    }

    if (block.type === 'exercise_block') {
        const exercises = block.exercises || [];
        return (
            <div className="bg-indigo-50/50 border border-indigo-200 rounded-xl p-4 my-3" style={{ breakInside: 'avoid' }}>
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
                            <div key={idx} className="flex items-start gap-2.5 bg-white rounded-lg border border-slate-200 px-3 py-2" style={{ breakInside: 'avoid' }}>
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

// ── Normalise protocol data from RPC ─────────────────────────────────────────

const normaliseProtocol = (raw: any): Protocol | null => {
    if (!raw || typeof raw !== 'object') return null;
    return {
        id: raw.id || '',
        name: raw.name || 'Untitled Protocol',
        category: raw.category || 'Custom',
        blocks: Array.isArray(raw.blocks) ? raw.blocks : [],
        createdAt: raw.createdAt || raw.created_at || '',
        updatedAt: raw.updatedAt || raw.updated_at || raw.createdAt || raw.created_at || '',
    };
};

// ── Main Component ───────────────────────────────────────────────────────────

const PublicProtocolView: React.FC = () => {
    const { protocolId } = useParams<{ protocolId: string }>();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [protocol, setProtocol] = useState<Protocol | null>(null);

    useEffect(() => {
        const load = async () => {
            if (!protocolId) { setError('Invalid link — no protocol ID provided.'); setLoading(false); return; }
            try {
                const result = await DatabaseService.getSharedProtocol(protocolId);
                const normalised = normaliseProtocol(result);
                if (!normalised) { setError('Protocol not found.'); }
                else { setProtocol(normalised); }
            } catch (err: any) {
                console.error('Failed to load protocol:', err);
                setError('Failed to load protocol. The link may be invalid or the server is temporarily unavailable.');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [protocolId]);

    const handlePrint = () => window.print();

    // ── Loading state ────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-sm text-slate-500 font-medium">Loading protocol...</p>
                </div>
            </div>
        );
    }

    // ── Error state ──────────────────────────────────────────────────────────
    if (error || !protocol) {
        return (
            <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center px-4">
                <div className="text-center max-w-sm">
                    <AlertCircle size={40} className="text-red-400 mx-auto mb-4" />
                    <h2 className="text-lg font-semibold text-slate-900 mb-2">Invalid Link</h2>
                    <p className="text-sm text-slate-500">{error || 'This protocol could not be found.'}</p>
                </div>
            </div>
        );
    }

    // ── Render protocol ──────────────────────────────────────────────────────
    const catColor = CATEGORY_COLORS[protocol.category] || CATEGORY_COLORS['Custom'];

    return (
        <div className="bg-[#F8F9FF] print-standalone">
            <BrandingBanner />
            {/* Header bar */}
            <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between print:border-none print:px-0 no-print">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0">
                        <FileText size={16} className="text-indigo-500" />
                    </div>
                    <div>
                        <h1 className="text-base font-bold text-slate-900">{protocol.name}</h1>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border ${catColor}`}>
                                <TagIcon size={9} /> {protocol.category}
                            </span>
                            {protocol.createdAt && (
                                <span className="text-[10px] text-slate-400 font-medium">
                                    Created {formatDate(protocol.createdAt)}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <button
                    onClick={handlePrint}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-[10px] font-semibold transition-all"
                >
                    <Printer size={12} /> Download PDF
                </button>
            </div>

            {/* Print-only header */}
            <div className="hidden" style={{ display: 'none' }} id="print-header">
                <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>{protocol.name}</h1>
                <p style={{ fontSize: '11px', color: '#94a3b8' }}>
                    {protocol.category}{protocol.createdAt ? ` · Created ${formatDate(protocol.createdAt)}` : ''}
                </p>
                <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '12px 0' }} />
            </div>

            {/* Document body */}
            <div className="max-w-3xl mx-auto px-4 sm:px-8 mt-5 pb-12 print:px-0 print:mt-0">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-8 sm:px-14 py-8 print:border-none print:shadow-none print:px-0 print:py-0">
                    {protocol.blocks.length > 0 ? (
                        protocol.blocks.map((block, idx) => (
                            <BlockRenderer key={block?.id || idx} block={block} />
                        ))
                    ) : (
                        <p className="text-sm text-slate-400 italic text-center py-12">
                            This protocol has no content.
                        </p>
                    )}
                </div>
            </div>

            {/* Inline print styles for reliable PDF rendering */}
            <style>{`
                @media print {
                    .print-standalone { background: white !important; }
                    .print-standalone .no-print { display: none !important; }
                    #print-header { display: block !important; padding: 0 0 0 0; }
                    .print-standalone * { color-adjust: exact !important; -webkit-print-color-adjust: exact !important; }
                }
            `}</style>
        </div>
    );
};

export default PublicProtocolView;
