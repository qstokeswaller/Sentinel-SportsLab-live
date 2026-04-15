// @ts-nocheck
import React, { useState, useCallback, useMemo } from 'react';
import {
    XIcon, UploadIcon, SaveIcon, ZapIcon, LinkIcon, CheckIcon,
    AlertTriangleIcon, PlusIcon, Trash2Icon, ChevronDownIcon, TagIcon,
} from 'lucide-react';
import { PLATFORM_FIELDS, fuzzyMatchHeader } from './GpsColumnMapper';
import { useAppState } from '../../context/AppStateContext';

// ═══════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════

export interface GpsColumnConfig {
    csvColumn: string;       // exact original header from CSV
    platformField: string;   // field id from PLATFORM_FIELDS, '' = Ignore
    displayName: string;     // what the platform shows to the user
    autoMapped: boolean;     // true if system mapped it, false if user chose manually
}

export interface GpsTeamProfile {
    teamId: string;
    teamName: string;
    provider: string;
    columnMapping: GpsColumnConfig[];
    acwrColumn: string;      // which CSV column feeds the ACWR engine
    headerFingerprint: string[];  // sorted lowercase headers at save time
    savedAt: string;
}

export interface GpsCategory {
    id: string;
    label: string;
    color: string;           // tailwind color name: indigo, emerald, sky, amber, rose, violet
}

// ═══════════════════════════════════════════════════════════════════
// Storage helpers — exported so ReportingHub + Settings can share
// ═══════════════════════════════════════════════════════════════════

export const loadGpsProfiles = (): GpsTeamProfile[] => {
    try { return JSON.parse(localStorage.getItem('gps_team_profiles') || '[]'); } catch { return []; }
};
export const saveGpsProfiles = (profiles: GpsTeamProfile[]) => {
    try { localStorage.setItem('gps_team_profiles', JSON.stringify(profiles)); } catch {}
};
export const getProfileForTeam = (teamId: string): GpsTeamProfile | null =>
    loadGpsProfiles().find(p => p.teamId === teamId) || null;

export const DEFAULT_CATEGORIES: GpsCategory[] = [
    { id: 'training',    label: 'Training',    color: 'indigo' },
    { id: 'matchday',    label: 'Matchday',    color: 'emerald' },
    { id: 'recovery',    label: 'Recovery',    color: 'sky' },
    { id: 'fitness_test',label: 'Fitness Test',color: 'amber' },
];
export const loadGpsCategories = (): GpsCategory[] => {
    try {
        const saved = JSON.parse(localStorage.getItem('gps_categories') || '[]');
        return saved.length > 0 ? saved : [...DEFAULT_CATEGORIES];
    } catch { return [...DEFAULT_CATEGORIES]; }
};
export const saveGpsCategories = (cats: GpsCategory[]) => {
    try { localStorage.setItem('gps_categories', JSON.stringify(cats)); } catch {}
};

// ═══════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════

const PLATFORM_FIELD_OPTIONS = [
    { value: '', label: '— Ignore this column —' },
    ...PLATFORM_FIELDS.map(f => ({ value: f.id, label: `${f.label}  ·  ${f.group}` })),
];

const ACWR_METHOD_LABELS: Record<string, string> = {
    sprint_distance: 'Sprint Distance (m)',
    total_distance:  'Total Distance (m)',
    srpe:            'sRPE',
    player_load:     'Player Load (AU)',
    hml:             'HML Distance (m)',
};

const COLOR_OPTIONS = ['indigo', 'emerald', 'sky', 'amber', 'rose', 'violet', 'teal', 'orange'];
const COLOR_DOT: Record<string, string> = {
    indigo:  'bg-indigo-500',
    emerald: 'bg-emerald-500',
    sky:     'bg-sky-500',
    amber:   'bg-amber-500',
    rose:    'bg-rose-500',
    violet:  'bg-violet-500',
    teal:    'bg-teal-500',
    orange:  'bg-orange-500',
};
const COLOR_BADGE: Record<string, string> = {
    indigo:  'bg-indigo-50 text-indigo-700 border-indigo-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    sky:     'bg-sky-50 text-sky-700 border-sky-200',
    amber:   'bg-amber-50 text-amber-700 border-amber-200',
    rose:    'bg-rose-50 text-rose-700 border-rose-200',
    violet:  'bg-violet-50 text-violet-700 border-violet-200',
    teal:    'bg-teal-50 text-teal-700 border-teal-200',
    orange:  'bg-orange-50 text-orange-700 border-orange-200',
};

// ═══════════════════════════════════════════════════════════════════
// GpsConfigModal
// ═══════════════════════════════════════════════════════════════════

interface GpsConfigModalProps {
    teamId: string;
    teamName: string;
    onClose: () => void;
    onSaved: () => void;
}

export const GpsConfigModal: React.FC<GpsConfigModalProps> = ({
    teamId, teamName, onClose, onSaved,
}) => {
    const { acwrSettings, showToast } = useAppState();

    const existingProfile = useMemo(() => getProfileForTeam(teamId), [teamId]);

    // Draft state — initialised from saved profile if one exists
    const [provider, setProvider]             = useState(existingProfile?.provider || '');
    const [columnMappings, setColumnMappings] = useState<GpsColumnConfig[]>(existingProfile?.columnMapping || []);
    const [acwrColumn, setAcwrColumn]         = useState(existingProfile?.acwrColumn || '');
    const [fingerprint, setFingerprint]       = useState<string[]>(existingProfile?.headerFingerprint || []);
    const [hasHeaders, setHasHeaders]         = useState(columnMappings.length > 0);
    const [saving, setSaving]                 = useState(false);

    // Team ACWR method (from global settings)
    const teamMethod = acwrSettings?.[teamId]?.method || 'sprint_distance';
    const methodLabel = ACWR_METHOD_LABELS[teamMethod] || teamMethod;

    // Stats
    const mappedCount = columnMappings.filter(m => m.platformField).length;
    const totalCount  = columnMappings.length;
    const pct = totalCount ? Math.round((mappedCount / totalCount) * 100) : 0;

    // ── Upload handler ─────────────────────────────────────────────
    const handleUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            const text = (ev.target.result as string);
            const lines = text.split('\n').filter(l => l.trim());
            if (lines.length < 1) { showToast('CSV is empty — nothing to read', 'error'); return; }
            const headers = lines[0]
                .replace(/^\uFEFF/, '')
                .split(',')
                .map(h => h.trim().replace(/^"|"$/g, ''))
                .filter(Boolean);

            const mappings: GpsColumnConfig[] = headers.map(h => {
                const { fieldId, confidence } = fuzzyMatchHeader(h);
                const field = PLATFORM_FIELDS.find(f => f.id === fieldId);
                return {
                    csvColumn:     h,
                    platformField: fieldId || '',
                    displayName:   field ? field.label : h,
                    autoMapped:    !!fieldId && confidence >= 0.5,
                };
            });

            setColumnMappings(mappings);
            setFingerprint(headers.map(h => h.toLowerCase().trim()).sort());
            setHasHeaders(true);

            const auto = mappings.filter(m => m.autoMapped).length;
            showToast(`${auto} of ${headers.length} columns auto-mapped`, 'success');
        };
        reader.readAsText(file);
        e.target.value = '';
    }, [showToast]);

    // ── Update a single row ────────────────────────────────────────
    const updateMapping = (idx: number, patch: Partial<GpsColumnConfig>) => {
        setColumnMappings(prev => prev.map((m, i) => {
            if (i !== idx) return m;
            const updated = { ...m, ...patch };
            // Auto-fill display name when platform field changes
            if (patch.platformField !== undefined) {
                const field = PLATFORM_FIELDS.find(f => f.id === patch.platformField);
                updated.displayName = field ? field.label : m.csvColumn;
                updated.autoMapped  = false;
            }
            return updated;
        }));
    };

    // ── Save ───────────────────────────────────────────────────────
    const handleSave = () => {
        setSaving(true);
        const profile: GpsTeamProfile = {
            teamId,
            teamName,
            provider: provider.trim(),
            columnMapping: columnMappings,
            acwrColumn,
            headerFingerprint: fingerprint,
            savedAt: new Date().toISOString(),
        };
        const existing = loadGpsProfiles().filter(p => p.teamId !== teamId);
        saveGpsProfiles([...existing, profile]);
        setSaving(false);
        showToast(`GPS profile saved for ${teamName}`, 'success');
        onSaved();
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">

                {/* ── Header ── */}
                <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shrink-0">
                            <LinkIcon size={18} />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-slate-900">
                                Configure GPS Import — <span className="text-indigo-600">{teamName}</span>
                            </h2>
                            <p className="text-xs text-slate-400">
                                Map CSV columns to platform fields once. Future imports auto-apply this profile.
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-xl text-slate-400 transition-colors">
                        <XIcon size={18} />
                    </button>
                </div>

                {/* ── Body ── */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* Provider + Upload row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-medium text-slate-600 block mb-1.5">
                                GPS Provider / Device <span className="text-slate-400 font-normal">(optional)</span>
                            </label>
                            <input
                                type="text"
                                value={provider}
                                onChange={e => setProvider(e.target.value)}
                                placeholder="e.g. Catapult, Polar Team Pro, STATSports"
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-600 block mb-1.5">
                                Upload Sample CSV <span className="text-slate-400 font-normal">(only headers are read — data is not stored)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:border-slate-300 transition-colors">
                                <UploadIcon size={14} className="text-indigo-500 shrink-0" />
                                <span className="truncate">
                                    {hasHeaders
                                        ? `${totalCount} columns detected — upload again to reset`
                                        : 'Upload a CSV to auto-detect columns'}
                                </span>
                                <input type="file" accept=".csv" className="hidden" onChange={handleUpload} />
                            </label>
                        </div>
                    </div>

                    {/* Empty state */}
                    {!hasHeaders && (
                        <div className="flex flex-col items-center justify-center py-14 text-center space-y-3 border-2 border-dashed border-slate-200 rounded-xl">
                            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-300">
                                <UploadIcon size={28} />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-slate-600">Upload a sample CSV to get started</p>
                                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                                    The system will auto-detect and map your columns using smart matching.
                                    You only need to do this once per team.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Column Mapping Table */}
                    {hasHeaders && (
                        <>
                            {/* Progress header */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-semibold text-slate-900">Column Mapping</h3>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-500">{mappedCount} / {totalCount} mapped</span>
                                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                            pct >= 80 ? 'text-emerald-700 bg-emerald-50' :
                                            pct >= 50 ? 'text-amber-700 bg-amber-50' :
                                            'text-rose-700 bg-rose-50'
                                        }`}>{pct}%</span>
                                    </div>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-1.5 mb-4">
                                    <div
                                        className={`h-1.5 rounded-full transition-all duration-500 ${
                                            pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                                        }`}
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>

                                <div className="border border-slate-200 rounded-xl overflow-hidden">
                                    {/* Table header */}
                                    <div className="grid grid-cols-[2fr_2fr_2fr_72px] bg-slate-50 border-b border-slate-200 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 gap-3">
                                        <span>CSV Column</span>
                                        <span>Platform Field</span>
                                        <span>Display Name</span>
                                        <span className="text-center">Status</span>
                                    </div>

                                    {/* Rows */}
                                    <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                                        {columnMappings.map((m, idx) => (
                                            <div
                                                key={m.csvColumn}
                                                className="grid grid-cols-[2fr_2fr_2fr_72px] items-center px-4 py-2.5 gap-3 hover:bg-slate-50/50 transition-colors"
                                            >
                                                <span
                                                    className="text-xs font-mono text-slate-700 truncate"
                                                    title={m.csvColumn}
                                                >
                                                    {m.csvColumn}
                                                </span>
                                                <select
                                                    value={m.platformField}
                                                    onChange={e => updateMapping(idx, { platformField: e.target.value })}
                                                    className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-indigo-400 transition-colors truncate"
                                                >
                                                    {PLATFORM_FIELD_OPTIONS.map(opt => (
                                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                    ))}
                                                </select>
                                                <input
                                                    type="text"
                                                    value={m.displayName}
                                                    onChange={e => updateMapping(idx, { displayName: e.target.value, autoMapped: false })}
                                                    placeholder={m.csvColumn}
                                                    className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-indigo-400 transition-colors"
                                                />
                                                <div className="flex justify-center">
                                                    {m.platformField ? (
                                                        <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border ${
                                                            m.autoMapped
                                                                ? 'text-indigo-700 bg-indigo-50 border-indigo-200'
                                                                : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                                                        }`}>
                                                            {m.autoMapped ? 'Auto' : 'Manual'}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[9px] font-semibold text-slate-400 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                                                            Ignored
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* ACWR Column Binding */}
                            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5 space-y-3">
                                <div className="flex items-center gap-2">
                                    <ZapIcon size={15} className="text-indigo-600 shrink-0" />
                                    <h3 className="text-sm font-semibold text-indigo-900">ACWR Column Binding</h3>
                                    <span className="text-[10px] text-indigo-500 bg-indigo-100 px-2 py-0.5 rounded-full font-semibold">Required for ACWR</span>
                                </div>
                                <p className="text-xs text-indigo-700 leading-relaxed">
                                    This team's ACWR method is set to <strong>{methodLabel}</strong>. Select which CSV column
                                    contains that data — the ACWR engine will always read from this column automatically on import.
                                </p>
                                <select
                                    value={acwrColumn}
                                    onChange={e => setAcwrColumn(e.target.value)}
                                    className="w-full bg-white border border-indigo-300 rounded-lg px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-500 transition-colors"
                                >
                                    <option value="">— Select the ACWR load column —</option>
                                    {columnMappings.map(m => (
                                        <option key={m.csvColumn} value={m.csvColumn}>
                                            {m.displayName !== m.csvColumn
                                                ? `${m.displayName}  (${m.csvColumn})`
                                                : m.csvColumn}
                                        </option>
                                    ))}
                                </select>
                                {acwrColumn ? (
                                    <p className="text-xs text-indigo-700 font-medium flex items-center gap-1.5">
                                        <CheckIcon size={12} className="text-indigo-500" />
                                        ACWR reads from: <span className="font-mono bg-indigo-100 px-1.5 py-0.5 rounded text-indigo-800">{acwrColumn}</span>
                                    </p>
                                ) : (
                                    <p className="text-xs text-amber-600 font-medium flex items-center gap-1.5">
                                        <AlertTriangleIcon size={12} />
                                        No column selected — ACWR calculations won't use GPS data until this is set
                                    </p>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* ── Footer ── */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
                    <p className="text-xs text-slate-400">
                        {existingProfile
                            ? `Last configured ${new Date(existingProfile.savedAt).toLocaleDateString()}`
                            : 'No profile saved yet for this team'}
                    </p>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!hasHeaders || saving}
                            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <SaveIcon size={14} />
                            {saving ? 'Saving…' : 'Save Profile'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════
// GpsCategoryManager — used standalone in Settings GPS tab
// ═══════════════════════════════════════════════════════════════════

interface GpsCategoryManagerProps {
    onChanged?: () => void;
}

export const GpsCategoryManager: React.FC<GpsCategoryManagerProps> = ({ onChanged }) => {
    const { showToast } = useAppState();
    const [categories, setCategories] = useState<GpsCategory[]>(loadGpsCategories);
    const [newLabel, setNewLabel]     = useState('');
    const [newColor, setNewColor]     = useState('indigo');

    const save = (cats: GpsCategory[]) => {
        setCategories(cats);
        saveGpsCategories(cats);
        onChanged?.();
    };

    const handleAdd = () => {
        const label = newLabel.trim();
        if (!label) { showToast('Enter a category name first', 'error'); return; }
        if (categories.some(c => c.label.toLowerCase() === label.toLowerCase())) {
            showToast('That category already exists', 'error'); return;
        }
        const id = label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        save([...categories, { id, label, color: newColor }]);
        setNewLabel('');
        setNewColor('indigo');
        showToast(`Category "${label}" added`, 'success');
    };

    const handleDelete = (id: string) => {
        const cat = categories.find(c => c.id === id);
        save(categories.filter(c => c.id !== id));
        showToast(`Category "${cat?.label}" removed`, 'success');
    };

    const handleReset = () => {
        save([...DEFAULT_CATEGORIES]);
        showToast('Categories reset to defaults', 'success');
    };

    return (
        <div className="space-y-4">
            {/* Existing categories */}
            <div className="space-y-2">
                {categories.map(cat => (
                    <div key={cat.id} className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl border border-slate-200">
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${COLOR_DOT[cat.color] || 'bg-slate-400'}`} />
                        <span className="text-sm font-medium text-slate-700 flex-1">{cat.label}</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${COLOR_BADGE[cat.color] || ''}`}>
                            {cat.color}
                        </span>
                        <button
                            onClick={() => handleDelete(cat.id)}
                            title="Remove category"
                            className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                            <Trash2Icon size={13} />
                        </button>
                    </div>
                ))}
            </div>

            {/* Add new */}
            <div className="flex items-end gap-2 pt-2 border-t border-slate-100">
                <div className="flex-1">
                    <label className="text-[10px] font-semibold uppercase text-slate-400 tracking-wide block mb-1.5">New Category</label>
                    <input
                        type="text"
                        value={newLabel}
                        onChange={e => setNewLabel(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAdd()}
                        placeholder="e.g. Pre-season, Test Day…"
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-400 transition-colors"
                    />
                </div>
                <div>
                    <label className="text-[10px] font-semibold uppercase text-slate-400 tracking-wide block mb-1.5">Colour</label>
                    <div className="flex gap-1.5 flex-wrap">
                        {COLOR_OPTIONS.map(c => (
                            <button
                                key={c}
                                onClick={() => setNewColor(c)}
                                title={c}
                                className={`w-6 h-6 rounded-full ${COLOR_DOT[c]} transition-all ${newColor === c ? 'ring-2 ring-offset-1 ring-slate-700 scale-110' : 'opacity-60 hover:opacity-100'}`}
                            />
                        ))}
                    </div>
                </div>
                <button
                    onClick={handleAdd}
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap"
                >
                    <PlusIcon size={13} /> Add
                </button>
            </div>

            <button
                onClick={handleReset}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
                Reset to defaults
            </button>
        </div>
    );
};

export default GpsConfigModal;
