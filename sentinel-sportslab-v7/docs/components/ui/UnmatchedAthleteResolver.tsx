// @ts-nocheck
// ═══════════════════════════════════════════════════════════════════════
// UnmatchedAthleteResolver — Universal modal for resolving unknown names
//
// Used by all CSV import flows when a name doesn't match any athlete.
// Options per unmatched name:
//   1. Assign to existing athlete (fuzzy suggestions + dropdown)
//   2. Add as new athlete to a selected team
//   3. Skip / ignore this name
// ═══════════════════════════════════════════════════════════════════════

import React, { useState, useMemo } from 'react';
import {
    XIcon, UserPlusIcon, UserCheckIcon, SearchIcon,
    ChevronDownIcon, SkipForwardIcon, CheckCircleIcon, AlertTriangleIcon,
} from 'lucide-react';

export interface UnmatchedEntry {
    csvName: string;
    rowCount: number; // how many CSV rows have this name
}

export interface ResolvedEntry {
    csvName: string;
    action: 'assign' | 'add' | 'skip';
    athleteId?: string;      // for 'assign'
    athleteName?: string;    // for display
    teamId?: string;         // for 'add'
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (resolved: ResolvedEntry[]) => void;
    unmatchedNames: UnmatchedEntry[];
    allAthletes: { id: string; name: string }[];
    teams: { id: string; name: string; players?: any[] }[];
}

/** Simple fuzzy score between two strings (0-1) */
function nameSimilarity(a: string, b: string): number {
    const al = a.toLowerCase().trim();
    const bl = b.toLowerCase().trim();
    if (al === bl) return 1;
    if (al.includes(bl) || bl.includes(al)) return 0.8;
    // Token overlap
    const aTokens = al.split(/\s+/);
    const bTokens = bl.split(/\s+/);
    let matches = 0;
    for (const at of aTokens) {
        if (bTokens.some(bt => bt === at || bt.includes(at) || at.includes(bt))) matches++;
    }
    return matches / Math.max(aTokens.length, bTokens.length);
}

const UnmatchedAthleteResolver: React.FC<Props> = ({
    isOpen, onClose, onConfirm, unmatchedNames, allAthletes, teams,
}) => {
    // State: one resolution per unmatched name
    const [resolutions, setResolutions] = useState<Record<string, {
        action: 'assign' | 'add' | 'skip';
        athleteId?: string;
        teamId?: string;
    }>>({});

    // Suggestions: top 3 similar athletes per unmatched name
    const suggestions = useMemo(() => {
        const result: Record<string, { id: string; name: string; score: number }[]> = {};
        for (const entry of unmatchedNames) {
            const scored = allAthletes
                .map(a => ({ ...a, score: nameSimilarity(entry.csvName, a.name) }))
                .filter(a => a.score > 0.3)
                .sort((a, b) => b.score - a.score)
                .slice(0, 3);
            result[entry.csvName] = scored;
        }
        return result;
    }, [unmatchedNames, allAthletes]);

    const updateResolution = (csvName: string, patch: any) => {
        setResolutions(prev => ({ ...prev, [csvName]: { ...prev[csvName], ...patch } }));
    };

    const allResolved = unmatchedNames.every(e => {
        const r = resolutions[e.csvName];
        if (!r?.action) return false;
        if (r.action === 'assign' && !r.athleteId) return false;
        if (r.action === 'add' && !r.teamId) return false;
        return true;
    });
    const resolvedCount = unmatchedNames.filter(e => resolutions[e.csvName]?.action).length;

    const handleConfirm = () => {
        const resolved: ResolvedEntry[] = unmatchedNames.map(e => {
            const r = resolutions[e.csvName];
            if (!r || r.action === 'skip') return { csvName: e.csvName, action: 'skip' };
            if (r.action === 'assign') {
                const athlete = allAthletes.find(a => a.id === r.athleteId);
                return { csvName: e.csvName, action: 'assign', athleteId: r.athleteId, athleteName: athlete?.name };
            }
            return { csvName: e.csvName, action: 'add', teamId: r.teamId };
        });
        onConfirm(resolved);
    };

    const handleSkipAll = () => {
        const skipped: ResolvedEntry[] = unmatchedNames.map(e => ({ csvName: e.csvName, action: 'skip' }));
        onConfirm(skipped);
    };

    if (!isOpen || unmatchedNames.length === 0) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-100 bg-amber-50/50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                                <AlertTriangleIcon size={18} />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-slate-900">
                                    {unmatchedNames.length} Unrecognised Name{unmatchedNames.length > 1 ? 's' : ''}
                                </h3>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                    These names don't match any athlete in your roster. Resolve each one below.
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
                            <XIcon size={16} className="text-slate-400" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {unmatchedNames.map(entry => {
                        const r = resolutions[entry.csvName];
                        const sug = suggestions[entry.csvName] || [];
                        const isResolved = !!r?.action;

                        return (
                            <div key={entry.csvName} className={`rounded-xl border p-4 transition-all ${
                                isResolved
                                    ? r.action === 'skip' ? 'border-slate-200 bg-slate-50/50 opacity-60' : 'border-emerald-200 bg-emerald-50/30'
                                    : 'border-amber-200 bg-amber-50/20'
                            }`}>
                                {/* Name + row count */}
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <span className="text-sm font-semibold text-slate-900">"{entry.csvName}"</span>
                                        <span className="text-[10px] text-slate-400 ml-2">{entry.rowCount} row{entry.rowCount > 1 ? 's' : ''}</span>
                                    </div>
                                    {isResolved && (
                                        <span className={`text-[9px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                                            r.action === 'assign' ? 'bg-emerald-100 text-emerald-600'
                                            : r.action === 'add' ? 'bg-indigo-100 text-indigo-600'
                                            : 'bg-slate-100 text-slate-400'
                                        }`}>
                                            {r.action === 'assign' ? 'Assigned' : r.action === 'add' ? 'Will Add' : 'Skipped'}
                                        </span>
                                    )}
                                </div>

                                {/* Suggestions */}
                                {sug.length > 0 && (
                                    <div className="mb-3">
                                        <span className="text-[9px] font-medium text-slate-400 uppercase tracking-wide block mb-1.5">Did you mean?</span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {sug.map(s => (
                                                <button
                                                    key={s.id}
                                                    onClick={() => updateResolution(entry.csvName, { action: 'assign', athleteId: s.id })}
                                                    className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all ${
                                                        r?.action === 'assign' && r.athleteId === s.id
                                                            ? 'border-emerald-300 bg-emerald-100 text-emerald-700'
                                                            : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300'
                                                    }`}
                                                >
                                                    {s.name}
                                                    <span className="text-[9px] text-slate-300 ml-1">{Math.round(s.score * 100)}%</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Action buttons */}
                                <div className="flex items-center gap-2">
                                    {/* Assign to existing (dropdown) */}
                                    <div className="flex-1 relative">
                                        <select
                                            value={r?.action === 'assign' ? r.athleteId || '' : ''}
                                            onChange={e => {
                                                if (e.target.value) updateResolution(entry.csvName, { action: 'assign', athleteId: e.target.value });
                                            }}
                                            className="w-full text-[10px] border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-600 appearance-none pr-6"
                                        >
                                            <option value="">Assign to athlete...</option>
                                            {teams.filter(t => t.players?.length).map(t => (
                                                <optgroup key={t.id} label={t.name}>
                                                    {(t.players || []).map(p => (
                                                        <option key={p.id} value={p.id}>{p.name}</option>
                                                    ))}
                                                </optgroup>
                                            ))}
                                        </select>
                                        <ChevronDownIcon size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>

                                    {/* Add as new */}
                                    <div className="relative">
                                        <select
                                            value={r?.action === 'add' ? r.teamId || '' : ''}
                                            onChange={e => {
                                                if (e.target.value) updateResolution(entry.csvName, { action: 'add', teamId: e.target.value });
                                            }}
                                            className="text-[10px] border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-indigo-600 font-medium appearance-none pr-6 min-w-[100px]"
                                        >
                                            <option value="">Add to team...</option>
                                            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                        <UserPlusIcon size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none" />
                                    </div>

                                    {/* Skip */}
                                    <button
                                        onClick={() => updateResolution(entry.csvName, { action: 'skip' })}
                                        className={`p-1.5 rounded-lg border transition-all ${
                                            r?.action === 'skip'
                                                ? 'border-slate-300 bg-slate-100 text-slate-500'
                                                : 'border-slate-200 text-slate-300 hover:text-slate-500 hover:border-slate-300'
                                        }`}
                                        title="Skip this name"
                                    >
                                        <SkipForwardIcon size={12} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <button onClick={handleSkipAll} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
                        Skip all unmatched
                    </button>
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] text-slate-400">{resolvedCount}/{unmatchedNames.length} resolved</span>
                        <button
                            onClick={handleConfirm}
                            disabled={!allResolved}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                                allResolved
                                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            }`}
                        >
                            <CheckCircleIcon size={14} />
                            Continue Import
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UnmatchedAthleteResolver;
