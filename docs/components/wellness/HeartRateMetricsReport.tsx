// @ts-nocheck
import React, { useState, useRef } from 'react';
import { useAppState } from '../../context/AppStateContext';
import {
    UsersIcon, UserIcon, CalendarIcon, HeartPulseIcon,
    UploadIcon, CheckIcon, AlertCircleIcon, Trash2 as Trash2Icon,
} from 'lucide-react';
import { CustomSelect } from '../ui/CustomSelect';
import SmartCsvMapper from '../ui/SmartCsvMapper';
import { HR_SCHEMA } from '../../utils/csvSchemas';
import { SupabaseStorageService as StorageService } from '../../services/storageService';

const HR_ZONE_DEFS = [
    { zone: 'Z1', label: 'Recovery', min: 0, max: 60, color: 'bg-sky-400' },
    { zone: 'Z2', label: 'Aerobic', min: 60, max: 70, color: 'bg-emerald-400' },
    { zone: 'Z3', label: 'Tempo', min: 70, max: 80, color: 'bg-amber-400' },
    { zone: 'Z4', label: 'Threshold', min: 80, max: 90, color: 'bg-orange-500' },
    { zone: 'Z5', label: 'VO2 Max', min: 90, max: 100, color: 'bg-red-500' },
];

const classifyZone = (hr: number, maxHr: number) => {
    if (!maxHr || maxHr <= 0) return 'Z3';
    const pct = (hr / maxHr) * 100;
    for (const z of HR_ZONE_DEFS) { if (pct < z.max) return z.zone; }
    return 'Z5';
};

export const HeartRateMetricsReport: React.FC = () => {
    const {
        teams,
        hrData, setHrData,
        hrReportViewMode, setHrReportViewMode,
        hrReportSelectedAthlete, setHrReportSelectedAthlete,
        showToast,
    } = useAppState();

    const [hrReportDateRange, setHrReportDateRange] = useState({ start: '2025-01-01', end: new Date().toISOString().split('T')[0] });
    const [hrImportStatus, setHrImportStatus] = useState<'success' | 'error' | null>(null);
    const [hrImportMessage, setHrImportMessage] = useState('');
    const [hrReportSelectedTeam, setHrReportSelectedTeam] = useState('');
    const hrFileRef = useRef<HTMLInputElement>(null);
    const [isHrMapperOpen, setIsHrMapperOpen] = useState(false);
    const [hrCsvHeaders, setHrCsvHeaders] = useState<string[]>([]);
    const [hrCsvRows, setHrCsvRows] = useState<Record<string, string>[]>([]);

    // HR CSV — Step 1: read file, open SmartCsvMapper
    const handleHrFileUpload = (e: any) => {
        const file = e.target?.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = (ev.target.result as string).trim();
            const lines = text.split('\n').filter(l => l.trim());
            if (lines.length < 2) { setHrImportStatus('error'); setHrImportMessage('CSV file is empty.'); return; }
            const headers = lines[0].split(',').map(h => h.trim());
            const rows = lines.slice(1).filter(l => l.trim()).map(line => {
                const cols = line.split(',').map(c => c.trim());
                const obj: Record<string, string> = {};
                headers.forEach((h, i) => { obj[h] = cols[i] || ''; });
                return obj;
            });
            setHrCsvHeaders(headers);
            setHrCsvRows(rows);
            setIsHrMapperOpen(true);
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    // HR CSV — Step 2: SmartCsvMapper confirmed → process mapped data
    const handleHrMapperConfirm = ({ rows, mapping }: { rows: Record<string, string>[]; mapping: Record<string, string> }) => {
        setIsHrMapperOpen(false);
        const getVal = (row: Record<string, string>, fieldId: string) => mapping[fieldId] ? row[mapping[fieldId]] : '';
        const parsed = [];

        for (const row of rows) {
            const num = (fieldId: string) => parseFloat(getVal(row, fieldId)) || 0;
            const str = (fieldId: string) => getVal(row, fieldId) || '';

            const avgHr = num('avg_hr');
            const maxHr = num('max_hr');
            if (!avgHr && !maxHr) continue;

            parsed.push({
                id: `hr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                date: str('date') || new Date().toISOString().split('T')[0],
                session: str('session') || 'Session',
                athlete: str('athlete') || '',
                avgHr, maxHr,
                minHr: num('min_hr'),
                duration: num('duration'),
                trimp: num('trimp'),
                calories: num('calories'),
                zones: {
                    z1: num('z1'), z2: num('z2'), z3: num('z3'), z4: num('z4'), z5: num('z5'),
                },
                recoveryHr: num('recovery_hr'),
                zone: classifyZone(avgHr, maxHr || 200),
            });
        }

        if (parsed.length === 0) { setHrImportStatus('error'); setHrImportMessage('No valid HR rows found after mapping.'); return; }

        const updated = [...(Array.isArray(hrData) ? hrData : []), ...parsed];
        setHrData(updated);
        StorageService.saveHrData(updated);
        setHrImportStatus('success');
        setHrImportMessage(`Imported ${parsed.length} session${parsed.length > 1 ? 's' : ''} successfully.`);
        setTimeout(() => setHrImportStatus(null), 5000);
    };

    const handleClearHrData = () => {
        if (!confirm('Clear all imported HR data?')) return;
        setHrData([]);
        StorageService.saveHrData([]);
        showToast?.('HR data cleared', 'success');
    };

    // ─── Render ───────────────────────────────────────────────────────
    const allPlayers = teams.flatMap(t => t.players || []);
    const safeHrData = Array.isArray(hrData) ? hrData : [];
    const selectedTeamPlayers = hrReportSelectedTeam
        ? (teams.find(t => t.id === hrReportSelectedTeam)?.players || []).map(p => p.name.toLowerCase())
        : [];
    const filtered = safeHrData.filter(d => {
        if (d.date < hrReportDateRange.start || d.date > hrReportDateRange.end) return false;
        if (hrReportViewMode === 'Team' && hrReportSelectedTeam && d.athlete) {
            if (!selectedTeamPlayers.some(name => d.athlete.toLowerCase().includes(name))) return false;
        }
        if (hrReportViewMode === 'Individual' && hrReportSelectedAthlete) {
            const player = allPlayers.find(p => p.id === hrReportSelectedAthlete);
            if (player && d.athlete && !d.athlete.toLowerCase().includes(player.name.toLowerCase())) return false;
        }
        return true;
    }).sort((a, b) => a.date.localeCompare(b.date));

    const avgSessionHr = filtered.length > 0 ? Math.round(filtered.reduce((s, d) => s + d.avgHr, 0) / filtered.length) : 0;
    const peakHr = filtered.length > 0 ? Math.max(...filtered.map(d => d.maxHr || d.avgHr)) : 0;
    const avgTrimp = filtered.length > 0 ? Math.round(filtered.reduce((s, d) => s + (d.trimp || 0), 0) / filtered.length) : 0;
    const totalSessions = filtered.length;

    const zoneTotals: any = { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0 };
    const zoneSessionCount: any = { Z1: 0, Z2: 0, Z3: 0, Z4: 0, Z5: 0 };
    for (const d of filtered) {
        if (d.zones) { for (const k of Object.keys(zoneTotals)) zoneTotals[k] += d.zones[k] || 0; }
        if (d.zone) zoneSessionCount[d.zone] = (zoneSessionCount[d.zone] || 0) + 1;
    }
    const hasZoneTime = Object.values(zoneTotals).some((v: any) => v > 0);
    const totalZoneTime = Object.values(zoneTotals).reduce((a: any, b: any) => a + b, 0) as number;

    const recoveryEntries = filtered.filter(d => d.recoveryHr > 0);
    const avgRecoveryHr = recoveryEntries.length > 0 ? Math.round(recoveryEntries.reduce((s, d) => s + d.recoveryHr, 0) / recoveryEntries.length) : 0;

    const chartData = filtered.slice(-20);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Controls Header */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white dark:bg-[#132338] px-4 py-3 rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm">
                <div className="flex bg-slate-100 dark:bg-[#1A2D48] p-0.5 rounded-lg w-fit">
                    {['Team', 'Individual'].map(m => (
                        <button key={m} onClick={() => setHrReportViewMode(m)}
                            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${hrReportViewMode === m ? 'bg-white dark:bg-[#132338] text-slate-900 dark:text-[#E2E8F0] shadow-sm' : 'text-slate-400 dark:text-[#CBD5E1] hover:text-slate-600'}`}>
                            {m} View
                        </button>
                    ))}
                </div>
                {hrReportViewMode === 'Team' && (
                    <CustomSelect value={hrReportSelectedTeam} onChange={(e) => setHrReportSelectedTeam(e.target.value)}
                        variant="filter" size="xs" prefixIcon={<UsersIcon size={14} />} placeholder="All Teams">
                        <option value="">All Teams</option>
                        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </CustomSelect>
                )}
                {hrReportViewMode === 'Individual' && (
                    <CustomSelect value={hrReportSelectedAthlete} onChange={(e) => setHrReportSelectedAthlete(e.target.value)}
                        variant="filter" size="xs" prefixIcon={<UserIcon size={14} />} placeholder="All Athletes">
                        <option value="">All Athletes</option>
                        {allPlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </CustomSelect>
                )}
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#0F1C30] px-4 py-2 rounded-xl border border-slate-200 dark:border-[#243A58]">
                    <CalendarIcon size={14} className="text-slate-400 dark:text-[#CBD5E1]" />
                    <input type="date" value={hrReportDateRange.start} onChange={(e) => setHrReportDateRange({ ...hrReportDateRange, start: e.target.value })}
                        className="bg-transparent text-xs font-bold text-slate-700 dark:text-[#E2E8F0] outline-none uppercase w-24" />
                    <span className="text-slate-300 dark:text-[#475569]">-</span>
                    <input type="date" value={hrReportDateRange.end} onChange={(e) => setHrReportDateRange({ ...hrReportDateRange, end: e.target.value })}
                        className="bg-transparent text-xs font-bold text-slate-700 dark:text-[#E2E8F0] outline-none uppercase w-24" />
                </div>
                <div className="flex items-center gap-2">
                    <input ref={hrFileRef} type="file" accept=".csv" className="hidden" onChange={handleHrFileUpload} />
                    <button onClick={() => hrFileRef.current?.click()} className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg text-[10px] font-semibold uppercase tracking-wide hover:bg-indigo-500 transition-all">
                        <UploadIcon size={13} /> Import CSV
                    </button>
                    {safeHrData.length > 0 && (
                        <button onClick={handleClearHrData} className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-[#1A2D48] text-slate-500 dark:text-[#CBD5E1] rounded-lg text-[10px] font-semibold hover:bg-red-50 hover:text-red-500 transition-all">
                            <Trash2Icon size={12} /> Clear
                        </button>
                    )}
                </div>
            </div>

            {/* Import status */}
            {hrImportStatus && (
                <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-semibold ${hrImportStatus === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/25 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300'}`}>
                    {hrImportStatus === 'success' ? <CheckIcon size={14} /> : <AlertCircleIcon size={14} />}
                    {hrImportMessage}
                </div>
            )}

            {/* CSV format help */}
            {safeHrData.length === 0 && !hrImportStatus && (
                <div className="bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-xl p-6 text-center space-y-3">
                    <HeartPulseIcon size={32} className="mx-auto text-slate-300 dark:text-[#475569]" />
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-[#E2E8F0]">Import Heart Rate Data</h4>
                    <p className="text-xs text-slate-400 dark:text-[#CBD5E1] max-w-md mx-auto">Upload a CSV file from your HR monitoring system (Polar, Garmin, Catapult, FirstBeat, etc). Supported columns:</p>
                    <div className="flex flex-wrap justify-center gap-1.5 mt-2">
                        {['date', 'session', 'athlete', 'avg_hr', 'max_hr', 'min_hr', 'duration', 'trimp', 'calories', 'z1-z5', 'recovery_hr'].map(c => (
                            <span key={c} className="px-2 py-1 bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded text-[10px] font-mono text-slate-600 dark:text-[#CBD5E1]">{c}</span>
                        ))}
                    </div>
                    <p className="text-[10px] text-slate-400 dark:text-[#CBD5E1]">Minimum required: <strong>avg_hr</strong> or <strong>max_hr</strong>. All other columns are optional.</p>
                    <button onClick={() => hrFileRef.current?.click()} className="mt-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-500 transition-all">
                        <UploadIcon size={14} className="inline mr-1.5" /> Choose CSV File
                    </button>
                </div>
            )}

            {/* ── Dashboard (only shown when data exists) ── */}
            {filtered.length > 0 && (
                <>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-[#132338] p-5 rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm space-y-2 hover:border-indigo-200 dark:hover:border-indigo-600 transition-colors">
                            <div className="text-xs font-medium text-slate-700 dark:text-[#E2E8F0]">Avg Session HR</div>
                            <div className="text-3xl font-bold text-slate-900 dark:text-[#E2E8F0]">{avgSessionHr} <span className="text-sm font-normal text-slate-400 dark:text-[#CBD5E1]">BPM</span></div>
                            <div className="w-full h-1.5 bg-slate-100 dark:bg-[#1A2D48] rounded-full overflow-hidden"><div className="h-full bg-indigo-600 rounded-full" style={{ width: `${Math.min((avgSessionHr / 200) * 100, 100)}%` }} /></div>
                        </div>
                        <div className="bg-white dark:bg-[#132338] p-5 rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm space-y-2 hover:border-indigo-200 dark:hover:border-indigo-600 transition-colors">
                            <div className="text-xs font-medium text-slate-700 dark:text-[#E2E8F0]">Peak HR (Period)</div>
                            <div className="text-3xl font-bold text-slate-900 dark:text-[#E2E8F0]">{peakHr} <span className="text-sm font-normal text-slate-400 dark:text-[#CBD5E1]">BPM</span></div>
                            <div className="w-full h-1.5 bg-slate-100 dark:bg-[#1A2D48] rounded-full overflow-hidden"><div className="h-full bg-rose-500 rounded-full" style={{ width: `${Math.min((peakHr / 220) * 100, 100)}%` }} /></div>
                        </div>
                        <div className="bg-white dark:bg-[#132338] p-5 rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm space-y-2 hover:border-emerald-200 dark:hover:border-emerald-800/50 transition-colors">
                            <div className="text-xs font-medium text-slate-700 dark:text-[#E2E8F0]">{avgRecoveryHr > 0 ? 'Avg Recovery HR' : 'Total Sessions'}</div>
                            {avgRecoveryHr > 0
                                ? <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{avgRecoveryHr} <span className="text-sm font-normal text-emerald-300">BPM</span></div>
                                : <div className="text-3xl font-bold text-slate-900 dark:text-[#E2E8F0]">{totalSessions}</div>
                            }
                            <div className="text-xs text-slate-400 dark:text-[#CBD5E1]">{avgRecoveryHr > 0 ? 'Post-session 2min recovery' : `In selected date range`}</div>
                        </div>
                        <div className="bg-white dark:bg-[#132338] p-5 rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm space-y-2 hover:border-amber-200 dark:hover:border-amber-800/50 transition-colors">
                            <div className="text-xs font-medium text-slate-700 dark:text-[#E2E8F0]">{avgTrimp > 0 ? 'Avg TRIMP' : 'Total Sessions'}</div>
                            {avgTrimp > 0
                                ? <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">{avgTrimp} <span className="text-sm font-normal text-amber-300">AU</span></div>
                                : <div className="text-3xl font-bold text-slate-900 dark:text-[#E2E8F0]">{totalSessions}</div>
                            }
                            <div className="text-xs text-slate-400 dark:text-[#CBD5E1]">{avgTrimp > 0 ? 'Training impulse per session' : 'Across period'}</div>
                        </div>
                    </div>

                    {/* Session Load Chart */}
                    <div className="bg-white dark:bg-[#132338] p-5 rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm space-y-4">
                        <div className="flex justify-between items-center">
                            <h4 className="text-base font-semibold text-slate-800 dark:text-[#E2E8F0]">Session Load Analysis</h4>
                            <div className="flex gap-4">
                                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-indigo-500" /><span className="text-xs text-slate-400 dark:text-[#CBD5E1]">Avg HR</span></div>
                                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-cyan-300" /><span className="text-xs text-slate-400 dark:text-[#CBD5E1]">Max HR</span></div>
                            </div>
                        </div>
                        <div className="h-64 flex items-end gap-1 px-2 overflow-x-auto">
                            {chartData.map((d, i) => (
                                <div key={d.id || i} className="flex flex-col items-center gap-2 group cursor-pointer" style={{ minWidth: chartData.length > 12 ? 36 : undefined, flex: chartData.length <= 12 ? 1 : undefined }}>
                                    <div className="relative w-full flex items-end justify-center h-56">
                                        <div className="w-full max-w-[36px] bg-cyan-100 dark:bg-cyan-500/20 rounded-t-lg absolute bottom-0 transition-all duration-500 group-hover:bg-cyan-200 dark:group-hover:bg-cyan-500/30"
                                            style={{ height: `${((d.maxHr || d.avgHr) / 220) * 100}%` }} />
                                        <div className="w-full max-w-[36px] bg-indigo-600 rounded-t-lg relative z-10 transition-all duration-500 group-hover:scale-y-105 origin-bottom shadow-md shadow-indigo-200 dark:shadow-indigo-900/50"
                                            style={{ height: `${(d.avgHr / 220) * 100}%` }}>
                                            <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-[#0F1C30] text-white text-[9px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 border border-transparent dark:border-[#243A58]">
                                                {d.avgHr} / {d.maxHr || '—'} BPM{d.trimp ? ` · TRIMP ${d.trimp}` : ''}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="w-full text-center">
                                        <div className="text-[8px] font-black uppercase text-slate-400 dark:text-[#CBD5E1] truncate">{d.date.slice(5)}</div>
                                        <div className="text-[7px] font-bold uppercase text-indigo-300 truncate">{d.session}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Zone Distribution */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white dark:bg-[#132338] p-5 rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm space-y-4">
                            <h4 className="text-sm font-semibold text-slate-800 dark:text-[#E2E8F0]">HR Zone Distribution</h4>
                            {hasZoneTime ? (
                                <div className="space-y-2.5">
                                    {HR_ZONE_DEFS.map(z => {
                                        const val = zoneTotals[z.zone.toLowerCase()] || 0;
                                        const pct = totalZoneTime > 0 ? (val / totalZoneTime) * 100 : 0;
                                        return (
                                            <div key={z.zone} className="flex items-center gap-3">
                                                <span className="text-[10px] font-bold text-slate-500 dark:text-[#CBD5E1] w-6">{z.zone}</span>
                                                <span className="text-[9px] text-slate-400 dark:text-[#CBD5E1] w-16">{z.label}</span>
                                                <div className="flex-1 h-3 bg-slate-100 dark:bg-[#1A2D48] rounded-full overflow-hidden">
                                                    <div className={`h-full ${z.color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                                                </div>
                                                <span className="text-[10px] font-bold text-slate-600 dark:text-[#CBD5E1] w-10 text-right">{Math.round(pct)}%</span>
                                                <span className="text-[9px] text-slate-400 dark:text-[#CBD5E1] w-12 text-right">{Math.round(val)}m</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="space-y-2.5">
                                    {HR_ZONE_DEFS.map(z => {
                                        const count = zoneSessionCount[z.zone] || 0;
                                        const pct = totalSessions > 0 ? (count / totalSessions) * 100 : 0;
                                        return (
                                            <div key={z.zone} className="flex items-center gap-3">
                                                <span className="text-[10px] font-bold text-slate-500 dark:text-[#CBD5E1] w-6">{z.zone}</span>
                                                <span className="text-[9px] text-slate-400 dark:text-[#CBD5E1] w-16">{z.label}</span>
                                                <div className="flex-1 h-3 bg-slate-100 dark:bg-[#1A2D48] rounded-full overflow-hidden">
                                                    <div className={`h-full ${z.color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                                                </div>
                                                <span className="text-[10px] font-bold text-slate-600 dark:text-[#CBD5E1] w-12 text-right">{count} sess</span>
                                            </div>
                                        );
                                    })}
                                    <p className="text-[9px] text-slate-400 dark:text-[#CBD5E1] italic">Based on avg HR per session. Import z1–z5 columns for time-in-zone breakdown.</p>
                                </div>
                            )}
                        </div>
                        {/* Session Table */}
                        <div className="bg-white dark:bg-[#132338] p-5 rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm space-y-3">
                            <h4 className="text-sm font-semibold text-slate-800 dark:text-[#E2E8F0]">Session Log ({filtered.length})</h4>
                            <div className="max-h-64 overflow-y-auto -mx-1">
                                <table className="w-full text-xs">
                                    <thead className="sticky top-0 bg-white dark:bg-[#132338]">
                                        <tr className="text-[9px] font-semibold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide border-b border-slate-100 dark:border-[#1A2D48]">
                                            <th className="text-left py-2 px-2">Date</th>
                                            <th className="text-left py-2 px-2">Session</th>
                                            {hrReportViewMode === 'Team' && <th className="text-left py-2 px-2">Athlete</th>}
                                            <th className="text-right py-2 px-2">Avg</th>
                                            <th className="text-right py-2 px-2">Max</th>
                                            <th className="text-right py-2 px-2">Zone</th>
                                            {avgTrimp > 0 && <th className="text-right py-2 px-2">TRIMP</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.slice(-30).reverse().map((d, i) => {
                                            const zDef = HR_ZONE_DEFS.find(z => z.zone === d.zone);
                                            return (
                                                <tr key={d.id || i} className="border-b border-slate-50 dark:border-[#1A2D48] hover:bg-slate-50 dark:hover:bg-[#1A2D48] transition-colors">
                                                    <td className="py-2 px-2 text-slate-600 dark:text-[#CBD5E1] font-medium">{d.date}</td>
                                                    <td className="py-2 px-2 text-slate-700 dark:text-[#E2E8F0] font-semibold">{d.session}</td>
                                                    {hrReportViewMode === 'Team' && <td className="py-2 px-2 text-slate-500 dark:text-[#CBD5E1]">{d.athlete || '—'}</td>}
                                                    <td className="py-2 px-2 text-right font-bold text-indigo-600 dark:text-indigo-300">{d.avgHr}</td>
                                                    <td className="py-2 px-2 text-right font-bold text-slate-700 dark:text-[#E2E8F0]">{d.maxHr || '—'}</td>
                                                    <td className="py-2 px-2 text-right"><span className={`px-1.5 py-0.5 rounded text-[9px] font-bold text-white ${zDef?.color || 'bg-slate-400'}`}>{d.zone}</span></td>
                                                    {avgTrimp > 0 && <td className="py-2 px-2 text-right text-amber-600 dark:text-amber-400 font-semibold">{d.trimp || '—'}</td>}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </>
            )}

            <SmartCsvMapper
                isOpen={isHrMapperOpen}
                onClose={() => setIsHrMapperOpen(false)}
                onConfirm={handleHrMapperConfirm}
                schema={HR_SCHEMA}
                csvHeaders={hrCsvHeaders}
                csvRows={hrCsvRows}
            />
        </div>
    );
};

export default HeartRateMetricsReport;
