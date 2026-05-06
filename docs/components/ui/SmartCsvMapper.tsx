// @ts-nocheck
// ═══════════════════════════════════════════════════════════════════════
// SmartCsvMapper — Universal smart CSV import with auto-detection
//
// Flow:
//  1. Parent reads CSV file → passes headers + rows as props
//  2. Auto-maps CSV headers to schema fields via fuzzy matching
//  3. Shows confirmation modal with detected mappings
//  4. User can adjust any column mapping via dropdown
//  5. On confirm → returns mapped data to parent for processing
//
// Used by: ACWR Training Load, HR Data, Hamstring/NordBord imports
// ═══════════════════════════════════════════════════════════════════════

import React, { useState, useMemo, useEffect } from 'react';
import {
    XIcon, CheckIcon, AlertTriangleIcon, SparklesIcon,
    ChevronDownIcon, ChevronUpIcon, ArrowRightIcon, UploadIcon,
    CheckCircleIcon, Edit3Icon,
} from 'lucide-react';
import type { CsvImportSchema } from '../../utils/csvSchemas';
import { autoMapHeaders } from '../../utils/csvSchemas';

// ═══════════════════════════════════════════════════════════════════════

interface SmartCsvMapperProps {
    isOpen: boolean;
    onClose: () => void;
    /** Called when user confirms mapping. Returns { rows, mapping }. */
    onConfirm: (result: {
        rows: Record<string, string>[];
        mapping: Record<string, string>;
        headers: string[];
    }) => void;
    schema: CsvImportSchema;
    /** CSV headers (first row) */
    csvHeaders: string[];
    /** Parsed CSV rows as objects keyed by header */
    csvRows: Record<string, string>[];
}

// Accent color presets (Tailwind classes)
const ACCENT = {
    indigo: { bg: 'bg-indigo-600', bgLight: 'bg-indigo-50', bgHover: 'hover:bg-indigo-700', text: 'text-indigo-600', border: 'border-indigo-200', ring: 'ring-indigo-500' },
    rose:   { bg: 'bg-rose-600',   bgLight: 'bg-rose-50',   bgHover: 'hover:bg-rose-700',   text: 'text-rose-600',   border: 'border-rose-200',   ring: 'ring-rose-500' },
    orange: { bg: 'bg-orange-500', bgLight: 'bg-orange-50', bgHover: 'hover:bg-orange-600', text: 'text-orange-600', border: 'border-orange-200', ring: 'ring-orange-500' },
    emerald:{ bg: 'bg-emerald-600',bgLight: 'bg-emerald-50',bgHover: 'hover:bg-emerald-700',text: 'text-emerald-600',border: 'border-emerald-200',ring: 'ring-emerald-500' },
};

const SmartCsvMapper: React.FC<SmartCsvMapperProps> = ({
    isOpen, onClose, onConfirm, schema, csvHeaders, csvRows,
}) => {
    const accent = ACCENT[schema.accentColor] || ACCENT.indigo;

    // ── Auto-mapping — recalculates when headers/schema change ──
    const autoMapping = useMemo(() => autoMapHeaders(csvHeaders, schema), [csvHeaders, schema]);

    // ── Current mapping state (fieldId → csvHeader) ──
    const [mapping, setMapping] = useState<Record<string, string>>({});

    // Reset mapping whenever a new file or schema is loaded
    useEffect(() => {
        const m: Record<string, string> = {};
        for (const [fieldId, { csvColumn }] of Object.entries(autoMapping)) {
            m[fieldId] = csvColumn;
        }
        setMapping(m);
    }, [autoMapping]);

    const [showPreview, setShowPreview] = useState(true);

    // ── Derived data ──
    const groups = useMemo(() => [...new Set(schema.fields.map(f => f.group))], [schema]);
    const mappedCount = Object.keys(mapping).filter(k => mapping[k]).length;
    const totalFields = schema.fields.length;
    const autoMatchCount = Object.keys(autoMapping).length;
    const requiredMissing = schema.fields.filter(f => f.required && !mapping[f.id]);
    const mappedCsvCols = new Set(Object.values(mapping).filter(Boolean));
    const unmappedCsvCols = csvHeaders.filter(h => !mappedCsvCols.has(h));
    const previewRows = csvRows.slice(0, 3);

    // ── Handlers ──
    const updateMapping = (fieldId: string, csvColumn: string) => {
        setMapping(prev => {
            const next = { ...prev };
            if (!csvColumn) {
                delete next[fieldId];
            } else {
                // Remove this csvColumn from any other field first
                for (const key of Object.keys(next)) {
                    if (next[key] === csvColumn && key !== fieldId) delete next[key];
                }
                next[fieldId] = csvColumn;
            }
            return next;
        });
    };

    const handleConfirm = () => {
        onConfirm({ rows: csvRows, mapping, headers: csvHeaders });
    };

    if (!isOpen) return null;

    // ── Confidence badge ──
    const ConfBadge = ({ fieldId }: { fieldId: string }) => {
        const auto = autoMapping[fieldId];
        const current = mapping[fieldId];
        if (!current) return <span className="w-2.5 h-2.5 rounded-full bg-slate-200 shrink-0" title="Not mapped" />;
        if (auto && auto.csvColumn === current) {
            if (auto.confidence >= 0.95) return <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" title={`Auto-matched (${Math.round(auto.confidence * 100)}%)`} />;
            if (auto.confidence >= 0.7) return <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" title={`Fuzzy match (${Math.round(auto.confidence * 100)}%)`} />;
            return <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" title={`Low match (${Math.round(auto.confidence * 100)}%)`} />;
        }
        // Manually set
        return <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shrink-0" title="Manually mapped" />;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">

                {/* ── Header ── */}
                <div className={`px-6 py-5 border-b border-slate-100 ${accent.bgLight}`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 ${accent.bg}`}>
                                <SparklesIcon size={18} />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900">Smart CSV Import</h3>
                                <p className="text-xs text-slate-500 mt-0.5">{schema.name}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
                            <XIcon size={18} className="text-slate-400" />
                        </button>
                    </div>

                    {/* Stats bar */}
                    <div className="mt-3 flex items-center gap-4 text-[11px]">
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            <span className="text-slate-600">Auto-matched <strong>{autoMatchCount}</strong> of <strong>{csvHeaders.length}</strong> columns</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${mappedCount > 0 ? 'bg-indigo-400' : 'bg-slate-300'}`} />
                            <span className="text-slate-600"><strong>{mappedCount}</strong> of <strong>{totalFields}</strong> fields mapped</span>
                        </div>
                        {requiredMissing.length > 0 && (
                            <div className="flex items-center gap-1.5">
                                <AlertTriangleIcon size={11} className="text-rose-500" />
                                <span className="text-rose-600 font-semibold">{requiredMissing.length} required field{requiredMissing.length > 1 ? 's' : ''} missing</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Column Mapping Body ── */}
                <div className="flex-1 overflow-y-auto">

                    {/* Grouped fields */}
                    <div className="p-4 space-y-1">
                        {groups.map(group => {
                            const fields = schema.fields.filter(f => f.group === group);
                            const groupMapped = fields.filter(f => mapping[f.id]).length;
                            const hasRequiredMissing = fields.some(f => f.required && !mapping[f.id]);

                            return (
                                <div key={group} className="border border-slate-200 rounded-xl overflow-hidden">
                                    <div className="flex items-center justify-between px-4 py-2 bg-slate-50/80">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-semibold text-slate-700">{group}</span>
                                            {hasRequiredMissing && <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />}
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-400">{groupMapped}/{fields.length}</span>
                                    </div>
                                    <div className="divide-y divide-slate-50">
                                        {fields.map(field => (
                                            <div key={field.id} className={`flex items-center gap-3 px-4 py-2 transition-all ${
                                                mapping[field.id]
                                                    ? autoMapping[field.id]?.csvColumn === mapping[field.id]
                                                        ? 'bg-emerald-50/40'
                                                        : 'bg-sky-50/40'
                                                    : field.required
                                                        ? 'bg-rose-50/40'
                                                        : ''
                                            }`}>
                                                {/* Confidence dot */}
                                                <ConfBadge fieldId={field.id} />

                                                {/* Field label */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-xs font-medium text-slate-700 truncate">{field.label}</span>
                                                        {field.required && <span className="text-[9px] font-bold text-rose-500 uppercase">req</span>}
                                                    </div>
                                                    {field.description && <p className="text-[10px] text-slate-400 truncate">{field.description}</p>}
                                                </div>

                                                {/* Arrow */}
                                                <ArrowRightIcon size={12} className="text-slate-300 shrink-0" />

                                                {/* CSV Column dropdown */}
                                                <select
                                                    value={mapping[field.id] || ''}
                                                    onChange={e => updateMapping(field.id, e.target.value)}
                                                    className={`w-44 shrink-0 text-xs px-2 py-1.5 rounded-lg border transition-all cursor-pointer ${
                                                        mapping[field.id]
                                                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800 font-medium'
                                                            : 'border-slate-200 bg-white text-slate-500'
                                                    }`}
                                                >
                                                    <option value="">— Skip —</option>
                                                    {csvHeaders.map(h => (
                                                        <option key={h} value={h} disabled={mappedCsvCols.has(h) && mapping[field.id] !== h}>
                                                            {h}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Unmapped CSV columns */}
                        {unmappedCsvCols.length > 0 && (
                            <div className="border border-slate-200 rounded-xl overflow-hidden">
                                <div className="flex items-center justify-between px-4 py-2 bg-slate-50/80">
                                    <span className="text-xs font-semibold text-slate-500">Unmapped CSV Columns</span>
                                    <span className="text-[10px] font-bold text-slate-400">{unmappedCsvCols.length} skipped</span>
                                </div>
                                <div className="px-4 py-2 flex flex-wrap gap-1.5">
                                    {unmappedCsvCols.map(h => (
                                        <span key={h} className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-medium rounded-md">{h}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Data Preview ── */}
                    <div className="px-4 pb-4">
                        <button
                            onClick={() => setShowPreview(!showPreview)}
                            className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors mb-2"
                        >
                            {showPreview ? <ChevronUpIcon size={14} /> : <ChevronDownIcon size={14} />}
                            Data Preview ({Math.min(3, csvRows.length)} of {csvRows.length} rows)
                        </button>

                        {showPreview && previewRows.length > 0 && (
                            <div className="border border-slate-200 rounded-xl overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-[10px]">
                                        <thead>
                                            <tr className="bg-slate-50">
                                                {/* Show only mapped fields in preview */}
                                                {schema.fields.filter(f => mapping[f.id]).map(f => (
                                                    <th key={f.id} className="px-3 py-2 text-left font-semibold text-slate-600 whitespace-nowrap border-b border-slate-100">
                                                        {f.label}
                                                        <span className="block text-[9px] font-normal text-slate-400">{mapping[f.id]}</span>
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {previewRows.map((row, i) => (
                                                <tr key={i} className="border-t border-slate-50 hover:bg-slate-50/50">
                                                    {schema.fields.filter(f => mapping[f.id]).map(f => (
                                                        <td key={f.id} className="px-3 py-1.5 text-slate-700 whitespace-nowrap">
                                                            {row[mapping[f.id]] || <span className="text-slate-300">—</span>}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Footer ── */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <div className="text-[11px] text-slate-500">
                        {csvRows.length} row{csvRows.length !== 1 ? 's' : ''} detected
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={requiredMissing.length > 0}
                            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white rounded-xl shadow-sm transition-all ${
                                requiredMissing.length > 0
                                    ? 'bg-slate-300 cursor-not-allowed'
                                    : `${accent.bg} ${accent.bgHover} hover:shadow-md`
                            }`}
                        >
                            <CheckCircleIcon size={16} />
                            Confirm & Import ({mappedCount} field{mappedCount !== 1 ? 's' : ''})
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SmartCsvMapper;
