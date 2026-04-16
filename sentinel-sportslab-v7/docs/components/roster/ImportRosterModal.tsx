// @ts-nocheck
import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Upload, X, ChevronRight, CheckCircle2, AlertTriangle, FileSpreadsheet, Users } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { DatabaseService } from '../../services/databaseService';

// ── Field definitions ──────────────────────────────────────────────────────
type FieldKey = 'name' | 'first_name' | 'last_name' | 'age' | 'gender'
    | 'height_cm' | 'weight_kg' | 'sport' | 'position' | 'goals' | 'notes' | 'skip';

const FIELD_OPTIONS: { value: FieldKey; label: string }[] = [
    { value: 'name',       label: 'Full Name' },
    { value: 'first_name', label: 'First Name' },
    { value: 'last_name',  label: 'Last Name / Surname' },
    { value: 'age',        label: 'Age' },
    { value: 'gender',     label: 'Gender' },
    { value: 'height_cm',  label: 'Height (cm)' },
    { value: 'weight_kg',  label: 'Weight (kg)' },
    { value: 'sport',      label: 'Sport' },
    { value: 'position',   label: 'Position / Event' },
    { value: 'goals',      label: 'Training Goals' },
    { value: 'notes',      label: 'Notes' },
    { value: 'skip',       label: '— Skip this column —' },
];

// Patterns for auto-detection — normalised header matched against these
const FIELD_PATTERNS: Record<FieldKey, string[]> = {
    name:       ['name', 'full name', 'fullname', 'player', 'athlete', 'player name', 'athlete name', 'full_name'],
    first_name: ['first name', 'firstname', 'first', 'forename', 'given name', 'givenname', 'first_name', 'fname'],
    last_name:  ['last name', 'lastname', 'last', 'surname', 'family name', 'familyname', 'last_name', 'lname', 'second name'],
    age:        ['age', 'years', 'yr', 'age (years)'],
    gender:     ['gender', 'sex', 'm/f', 'male/female', 'gender/sex'],
    height_cm:  ['height', 'height cm', 'height (cm)', 'ht', 'ht (cm)', 'stature', 'height_cm'],
    weight_kg:  ['weight', 'weight kg', 'weight (kg)', 'wt', 'wt (kg)', 'mass', 'bodyweight', 'body weight', 'weight_kg'],
    sport:      ['sport', 'discipline', 'activity', 'code'],
    position:   ['position', 'pos', 'event', 'role', 'playing position', 'squad position'],
    goals:      ['goals', 'training goals', 'objectives', 'target'],
    notes:      ['notes', 'comments', 'remarks', 'additional', 'info', 'additional info'],
    skip:       [],
};

function normalise(s: string): string {
    return s.toLowerCase().trim().replace(/[()[\]_]/g, ' ').replace(/\s+/g, ' ').trim();
}

function detectField(header: string): FieldKey {
    const norm = normalise(header);
    for (const [field, patterns] of Object.entries(FIELD_PATTERNS) as [FieldKey, string[]][]) {
        if (field === 'skip') continue;
        if (patterns.some(p => norm === p || norm.includes(p))) return field;
    }
    return 'skip';
}

// ── Resolve a row of raw CSV values into an athlete name + profile ─────────
function resolveRow(row: Record<string, string>, mapping: Record<string, FieldKey>) {
    const get = (field: FieldKey) => {
        const col = Object.entries(mapping).find(([, f]) => f === field)?.[0];
        return col ? (row[col] || '').trim() : '';
    };

    // Name resolution — combine first+last if no combined column
    let name = get('name');
    if (!name) {
        const first = get('first_name');
        const last  = get('last_name');
        name = [first, last].filter(Boolean).join(' ');
    }

    return {
        name,
        age:        get('age'),
        gender:     get('gender'),
        height_cm:  get('height_cm'),
        weight_kg:  get('weight_kg'),
        sport:      get('sport'),
        position:   get('position'),
        goals:      get('goals'),
        notes:      get('notes'),
    };
}

// ── Component ───────────────────────────────────────────────────────────────
interface Props { onClose: () => void; }

type Step = 'upload' | 'map' | 'preview' | 'done';

export const ImportRosterModal: React.FC<Props> = ({ onClose }) => {
    const { teams, initData } = useAppState();

    const [step, setStep]           = useState<Step>('upload');
    const [headers, setHeaders]     = useState<string[]>([]);
    const [rows, setRows]           = useState<Record<string, string>[]>([]);
    const [mapping, setMapping]     = useState<Record<string, FieldKey>>({});
    const [teamId, setTeamId]       = useState<string>('');
    const [importing, setImporting] = useState(false);
    const [results, setResults]     = useState<{ ok: number; skipped: number; failed: string[] } | null>(null);
    const [fileName, setFileName]   = useState('');
    const fileRef = useRef<HTMLInputElement>(null);

    const realTeams = teams.filter(t => t.id !== 't_private');

    // ── Parse file ────────────────────────────────────────────────────────
    const parseFile = (file: File) => {
        setFileName(file.name);
        const ext = file.name.split('.').pop()?.toLowerCase();

        const handleData = (data: Record<string, string>[]) => {
            if (!data.length) return;
            const hdrs = Object.keys(data[0]);
            const autoMap: Record<string, FieldKey> = {};
            hdrs.forEach(h => { autoMap[h] = detectField(h); });
            setHeaders(hdrs);
            setRows(data);
            setMapping(autoMap);
            setStep('map');
        };

        if (ext === 'csv') {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (r) => handleData(r.data as Record<string, string>[]),
            });
        } else {
            // xlsx / xls
            const reader = new FileReader();
            reader.onload = (e) => {
                const wb = XLSX.read(e.target?.result, { type: 'binary' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const data = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' });
                handleData(data.map(r => Object.fromEntries(
                    Object.entries(r).map(([k, v]) => [String(k), String(v)])
                )));
            };
            reader.readAsBinaryString(file);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) parseFile(file);
    };

    // ── Validation ────────────────────────────────────────────────────────
    const hasNameMapping = Object.values(mapping).some(f =>
        f === 'name' || f === 'first_name' || f === 'last_name'
    );

    const previewRows = rows
        .map(row => resolveRow(row, mapping))
        .filter(r => r.name.trim());

    const skippedCount = rows.length - previewRows.length;

    // ── Import ────────────────────────────────────────────────────────────
    const handleImport = async () => {
        setImporting(true);
        let ok = 0;
        const failed: string[] = [];

        for (const athlete of previewRows) {
            try {
                await DatabaseService.createAthlete({
                    name:       athlete.name,
                    team_id:    teamId || null,
                    age:        athlete.age        ? parseInt(athlete.age)        : undefined,
                    gender:     athlete.gender     || undefined,
                    height_cm:  athlete.height_cm  ? parseFloat(athlete.height_cm) : undefined,
                    weight_kg:  athlete.weight_kg  ? parseFloat(athlete.weight_kg) : undefined,
                    sport:      athlete.sport      || undefined,
                    position:   athlete.position   || undefined,
                    goals:      athlete.goals      || undefined,
                    notes:      athlete.notes      || undefined,
                });
                ok++;
            } catch {
                failed.push(athlete.name);
            }
        }

        await initData();
        setResults({ ok, skipped: skippedCount, failed });
        setStep('done');
        setImporting(false);
    };

    // ── Styles ────────────────────────────────────────────────────────────
    const SELECT = "bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 transition-colors";

    return (
        <div className="fixed inset-0 z-[700] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl w-full max-w-2xl max-h-[88vh] shadow-xl border border-slate-200 overflow-hidden flex flex-col">

                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-emerald-600 rounded-lg flex items-center justify-center text-white">
                            <FileSpreadsheet size={16} />
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-slate-900">Import Roster</h3>
                            <p className="text-xs text-slate-500">
                                {step === 'upload'  && 'Upload a CSV or Excel file'}
                                {step === 'map'     && `Map columns — ${rows.length} rows detected`}
                                {step === 'preview' && `Preview — ${previewRows.length} athletes ready`}
                                {step === 'done'    && 'Import complete'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Step indicator */}
                {step !== 'done' && (
                    <div className="px-5 pt-3 pb-1 flex items-center gap-2 shrink-0">
                        {(['upload', 'map', 'preview'] as Step[]).map((s, i) => (
                            <React.Fragment key={s}>
                                <div className={`flex items-center gap-1.5 text-xs font-medium ${step === s ? 'text-emerald-700' : i < ['upload','map','preview'].indexOf(step) ? 'text-slate-400' : 'text-slate-300'}`}>
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step === s ? 'bg-emerald-600 text-white' : i < ['upload','map','preview'].indexOf(step) ? 'bg-slate-300 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                        {i + 1}
                                    </div>
                                    <span className="hidden sm:inline capitalize">{s === 'map' ? 'Map columns' : s === 'upload' ? 'Upload' : 'Preview'}</span>
                                </div>
                                {i < 2 && <div className="flex-1 h-px bg-slate-100 max-w-[40px]" />}
                            </React.Fragment>
                        ))}
                    </div>
                )}

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">

                    {/* ── STEP 1: Upload ── */}
                    {step === 'upload' && (
                        <div
                            className="border-2 border-dashed border-slate-200 rounded-xl p-10 text-center hover:border-emerald-400 hover:bg-emerald-50/30 transition-all cursor-pointer group"
                            onDragOver={e => e.preventDefault()}
                            onDrop={handleDrop}
                            onClick={() => fileRef.current?.click()}
                        >
                            <input
                                ref={fileRef}
                                type="file"
                                accept=".csv,.xlsx,.xls"
                                className="hidden"
                                onChange={e => { if (e.target.files?.[0]) parseFile(e.target.files[0]); }}
                            />
                            <Upload size={36} className="mx-auto mb-3 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                            <p className="font-semibold text-slate-700 mb-1">Drop your file here or click to browse</p>
                            <p className="text-sm text-slate-400">Supports CSV, Excel (.xlsx, .xls)</p>
                            <p className="text-xs text-slate-300 mt-3">Only a <span className="font-semibold text-slate-400">Name column is required</span> — all other columns are optional</p>
                        </div>
                    )}

                    {/* ── STEP 2: Map columns ── */}
                    {step === 'map' && (
                        <div className="space-y-4">
                            <p className="text-sm text-slate-500">
                                We've auto-suggested a field for each column. Check the matches and adjust anything that's wrong.
                                <span className="font-semibold text-slate-700"> At least one Name column must be mapped.</span>
                            </p>

                            <div className="border border-slate-100 rounded-xl overflow-hidden">
                                {/* Column header row */}
                                <div className="grid grid-cols-[1fr_1fr_1fr] gap-0 bg-slate-50 px-4 py-2 border-b border-slate-100">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Column in file</span>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Sample data</span>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Maps to</span>
                                </div>
                                <div className="divide-y divide-slate-50">
                                    {headers.map(h => {
                                        const sample = rows.slice(0, 3).map(r => r[h]).filter(Boolean).join(', ');
                                        const mapped = mapping[h];
                                        const isNameField = mapped === 'name' || mapped === 'first_name' || mapped === 'last_name';
                                        return (
                                            <div key={h} className={`grid grid-cols-[1fr_1fr_1fr] gap-0 px-4 py-2.5 items-center ${isNameField ? 'bg-emerald-50/50' : ''}`}>
                                                <div className="flex items-center gap-2 min-w-0">
                                                    {isNameField && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />}
                                                    <span className="text-sm font-medium text-slate-700 truncate">{h}</span>
                                                </div>
                                                <span className="text-xs text-slate-400 truncate pr-3">{sample || '—'}</span>
                                                <select
                                                    value={mapped}
                                                    onChange={e => setMapping(prev => ({ ...prev, [h]: e.target.value as FieldKey }))}
                                                    className={`${SELECT} w-full ${isNameField ? 'border-emerald-300 text-emerald-800' : ''}`}
                                                >
                                                    {FIELD_OPTIONS.map(o => (
                                                        <option key={o.value} value={o.value}>{o.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Team assignment */}
                            <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                                <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                                    <Users size={12} /> Assign all imported athletes to
                                </label>
                                <select value={teamId} onChange={e => setTeamId(e.target.value)} className={`${SELECT} w-full`}>
                                    <option value="">Individual (no team)</option>
                                    {realTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                                <p className="text-[11px] text-slate-400">You can move athletes to different teams from the roster after import.</p>
                            </div>

                            {!hasNameMapping && (
                                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 font-medium">
                                    <AlertTriangle size={15} className="shrink-0" />
                                    No name column mapped. Set at least one column to Full Name, First Name, or Last Name to continue.
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── STEP 3: Preview ── */}
                    {step === 'preview' && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-slate-600">
                                    <span className="font-semibold text-slate-900">{previewRows.length} athletes</span> will be created
                                    {teamId && <span> in <span className="font-semibold">{realTeams.find(t => t.id === teamId)?.name}</span></span>}
                                    {skippedCount > 0 && <span className="text-amber-600 ml-2">· {skippedCount} rows skipped (no name)</span>}
                                </p>
                            </div>

                            <div className="border border-slate-100 rounded-xl overflow-hidden">
                                <div className="grid grid-cols-[2fr_1fr_1fr_1fr] bg-slate-50 px-4 py-2 border-b border-slate-100">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Name</span>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Age</span>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Sport</span>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Position</span>
                                </div>
                                <div className="divide-y divide-slate-50 max-h-72 overflow-y-auto">
                                    {previewRows.map((r, i) => (
                                        <div key={i} className="grid grid-cols-[2fr_1fr_1fr_1fr] px-4 py-2 text-sm">
                                            <span className="font-medium text-slate-800 truncate">{r.name}</span>
                                            <span className="text-slate-500">{r.age || '—'}</span>
                                            <span className="text-slate-500 truncate">{r.sport || '—'}</span>
                                            <span className="text-slate-500 truncate">{r.position || '—'}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── STEP 4: Done ── */}
                    {step === 'done' && results && (
                        <div className="text-center py-6 space-y-4">
                            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle2 size={36} />
                            </div>
                            <div>
                                <h4 className="text-lg font-bold text-slate-900">{results.ok} athlete{results.ok !== 1 ? 's' : ''} imported</h4>
                                {results.skipped > 0 && (
                                    <p className="text-sm text-amber-600 mt-1">{results.skipped} rows skipped — no name found</p>
                                )}
                            </div>
                            {results.failed.length > 0 && (
                                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-left">
                                    <p className="text-sm font-semibold text-rose-700 mb-2 flex items-center gap-1.5">
                                        <AlertTriangle size={14} /> {results.failed.length} failed to save
                                    </p>
                                    <ul className="text-xs text-rose-600 space-y-0.5">
                                        {results.failed.map((n, i) => <li key={i}>{n}</li>)}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-slate-100 bg-white flex justify-between items-center shrink-0">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-slate-500 hover:bg-slate-100 transition-colors">
                        {step === 'done' ? 'Close' : 'Cancel'}
                    </button>
                    <div className="flex gap-2">
                        {step === 'map' && (
                            <button onClick={() => setStep('upload')} className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                                Back
                            </button>
                        )}
                        {step === 'preview' && (
                            <button onClick={() => setStep('map')} className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                                Back
                            </button>
                        )}
                        {step === 'map' && (
                            <button
                                onClick={() => setStep('preview')}
                                disabled={!hasNameMapping}
                                className="px-5 py-2 bg-emerald-600 text-white rounded-full text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-40 flex items-center gap-2"
                            >
                                Preview <ChevronRight size={14} />
                            </button>
                        )}
                        {step === 'preview' && (
                            <button
                                onClick={handleImport}
                                disabled={importing || previewRows.length === 0}
                                className="px-5 py-2 bg-emerald-600 text-white rounded-full text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-40 flex items-center gap-2"
                            >
                                {importing ? 'Importing…' : `Import ${previewRows.length} Athletes`}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
