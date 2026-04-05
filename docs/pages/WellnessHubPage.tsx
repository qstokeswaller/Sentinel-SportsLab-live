// @ts-nocheck
import React, { useState, useMemo, useRef } from 'react';
import {
    ClipboardListIcon, StethoscopeIcon, ShieldAlertIcon, ArrowLeftIcon, ActivityIcon,
    UsersIcon, AlertTriangleIcon, TrendingUpIcon,
    UploadIcon, PlusIcon, ChevronRightIcon, ShieldIcon,
} from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import WellnessHub from '../components/performance/WellnessHub';
import MedicalReports from '../components/wellness/MedicalReports';
import InjuryReport from '../components/wellness/InjuryReport';
import TrainingLoadEntry from '../components/analytics/TrainingLoadEntry';
import InterventionModal from '../components/analytics/InterventionModal';
import { ACWR_UTILS, ACWR_METRIC_TYPES } from '../utils/constants';
import { DatabaseService } from '../services/databaseService';
import ACWRLineChart from '../components/analytics/ACWRLineChart';
import IndividualizedThresholds from '../components/analytics/IndividualizedThresholds';
import SmartCsvMapper from '../components/ui/SmartCsvMapper';
import { getAcwrSchema } from '../utils/csvSchemas';
import { processAthleteMatching } from '../utils/athleteMatcher';
import UnmatchedAthleteResolver from '../components/ui/UnmatchedAthleteResolver';
import type { ResolvedEntry } from '../components/ui/UnmatchedAthleteResolver';

const SECTIONS = [
    { title: 'Questionnaire Data', desc: 'Wellness check-in responses, readiness scores & team trends', icon: ClipboardListIcon },
    { title: 'Medical Reports',    desc: 'Athlete opt-outs, medical status and strategic notes',       icon: StethoscopeIcon },
    { title: 'Injury Report',      desc: 'Injury tracking, body map analysis & return-to-play',        icon: ShieldAlertIcon },
    { title: 'ACWR Monitoring',    desc: 'Track acute:chronic workload ratios to prevent overtraining and optimise load', icon: ActivityIcon },
    { title: 'Load Thresholds',   desc: 'Individualized ACWR thresholds — personal safe training bands per athlete', icon: ShieldIcon },
];

// Helper: get initials from a name
const getInitials = (name: string) => name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??';

// ── ACWR Monitoring Hub ─────────────────────────────────────────────────
const ACWRMonitoringHub: React.FC = () => {
    const { teams, loadRecords, wellnessData, bodyHeatmapData, acwrSettings, acwrExclusions, setAcwrExclusions, showToast, isLoading } = useAppState();
    const [selectedTeamId, setSelectedTeamId] = useState<string>('');
    const [acwrView, setAcwrView] = useState<'roster' | 'log' | 'athlete'>('roster');
    const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);
    const [interventionAthlete, setInterventionAthlete] = useState<any>(null);
    const [isInterventionOpen, setIsInterventionOpen] = useState(false);
    const [drilldownFilter, setDrilldownFilter] = useState<'28d' | '7d' | 'all'>('28d');
    const csvRef = useRef<HTMLInputElement>(null);
    const [isCsvMapperOpen, setIsCsvMapperOpen] = useState(false);
    const [csvMapperHeaders, setCsvMapperHeaders] = useState<string[]>([]);
    const [csvMapperRows, setCsvMapperRows] = useState<Record<string, string>[]>([]);

    // Unmatched athlete resolver state
    const [showAcwrResolver, setShowAcwrResolver] = useState(false);
    const [acwrUnmatched, setAcwrUnmatched] = useState<{ csvName: string; rowCount: number }[]>([]);
    const [acwrPendingMatched, setAcwrPendingMatched] = useState<any[]>([]);
    const [acwrPendingUnmatched, setAcwrPendingUnmatched] = useState<any[]>([]);
    const [acwrPendingMapping, setAcwrPendingMapping] = useState<Record<string, string>>({});

    // Teams with ACWR enabled (excluding t_private which is handled per-athlete)
    const enabledTeams = teams.filter(t => t.id !== 't_private' && acwrSettings[t.id]?.enabled);

    // Private clients with individual ACWR enabled
    const privateTeam = teams.find(t => t.id === 't_private');
    const enabledPrivateClients = (privateTeam?.players || [])
        .filter(p => acwrSettings[`ind_${p.id}`]?.enabled)
        .map(p => ({ ...p, teamId: 't_private', teamName: 'Private Client' }));

    // Auto-select first enabled team or private client (only once on mount)
    const hasAutoSelected = useRef(false);
    React.useEffect(() => {
        if (hasAutoSelected.current || selectedTeamId) return;
        const first = enabledTeams.length > 0 ? enabledTeams[0].id : (enabledPrivateClients.length > 0 ? `ind_${enabledPrivateClients[0].id}` : '');
        if (first) {
            setSelectedTeamId(first);
            hasAutoSelected.current = true;
        }
    }, [enabledTeams, enabledPrivateClients]);

    // Determine if selection is a private client
    const isPrivateClientSelected = selectedTeamId.startsWith('ind_');
    const privateClientId = isPrivateClientSelected ? selectedTeamId.replace('ind_', '') : null;

    const selectedTeam = isPrivateClientSelected ? null : enabledTeams.find(t => t.id === selectedTeamId);
    const teamSettings = selectedTeamId ? (acwrSettings[selectedTeamId] || null) : null;

    // Players for the selected team or private client
    const teamPlayers = useMemo(() => {
        if (isPrivateClientSelected && privateClientId) {
            const client = enabledPrivateClients.find(p => p.id === privateClientId);
            return client ? [client] : [];
        }
        if (selectedTeam) {
            return (selectedTeam.players || []).map(p => ({ ...p, teamId: selectedTeamId, teamName: selectedTeam.name || '' }));
        }
        return [];
    }, [selectedTeamId, selectedTeam, isPrivateClientSelected, privateClientId, enabledPrivateClients]);

    // Deduplicate players
    const uniquePlayers = useMemo(() => {
        const seen = new Set();
        return teamPlayers.filter(p => { if (seen.has(p.id)) return false; seen.add(p.id); return true; });
    }, [teamPlayers]);

    // Exclusion helpers
    const isExcluded = (athleteId: string) => acwrExclusions[athleteId]?.excluded === true;
    const getExclusion = (athleteId: string) => acwrExclusions[athleteId] || null;

    const toggleExclusion = (athleteId: string, athleteName: string) => {
        const current = acwrExclusions[athleteId];
        if (current?.excluded) {
            // Returning from injury — record return date, clear excluded
            setAcwrExclusions(prev => ({
                ...prev,
                [athleteId]: { ...current, excluded: false, returnDate: new Date().toISOString().split('T')[0] },
            }));
            showToast?.(`${athleteName} marked as returned — monitoring for 7 days`);
        } else {
            // Excluding — freeze current EWMA values
            const playerTeam = teams.find(t => (t.players || []).some(p => p.id === athleteId));
            const teamId = playerTeam?.id;
            const settings = (teamId === 't_private')
                ? (acwrSettings[`ind_${athleteId}`] || {})
                : (acwrSettings[teamId] || {});
            const acwrResult = ACWR_UTILS.calculateAthleteACWR(loadRecords || [], athleteId, {
                metricType: settings.method || 'srpe',
                acuteN: settings.acuteWindow || 7,
                chronicN: settings.chronicWindow || 28,
                freezeRestDays: settings.freezeRestDays !== false,
            });
            setAcwrExclusions(prev => ({
                ...prev,
                [athleteId]: {
                    excluded: true,
                    excludedDate: new Date().toISOString().split('T')[0],
                    returnDate: null,
                    frozenAcute: acwrResult.acute,
                    frozenChronic: acwrResult.chronic,
                    frozenRatio: acwrResult.ratio,
                },
            }));
            showToast?.(`${athleteName} excluded (injured) — EWMA frozen`);
        }
    };

    // Detect return-from-injury (returned within last 7 days)
    const isReturningFromInjury = (athleteId: string) => {
        const ex = acwrExclusions[athleteId];
        if (!ex || ex.excluded || !ex.returnDate) return false;
        const returnDate = new Date(ex.returnDate + 'T00:00:00');
        const daysSinceReturn = Math.floor((Date.now() - returnDate.getTime()) / 86400000);
        return daysSinceReturn <= 7;
    };

    // Calculate ACWR + risk for every player
    const rosterData = useMemo(() => {
        return uniquePlayers.map(player => {
            const excluded = isExcluded(player.id);
            const returning = isReturningFromInjury(player.id);
            const exclusion = getExclusion(player.id);

            // For private clients, use their individual settings; for team athletes, use team settings
            const settings = player.teamId === 't_private'
                ? (acwrSettings[`ind_${player.id}`] || {})
                : (acwrSettings[player.teamId] || {});
            const options = {
                metricType: settings.method || 'srpe',
                acuteN: settings.acuteWindow || 7,
                chronicN: settings.chronicWindow || 28,
                freezeRestDays: settings.freezeRestDays !== false,
            };

            // If excluded, use frozen values instead of calculating
            let acwrResult;
            if (excluded && exclusion) {
                acwrResult = {
                    acute: exclusion.frozenAcute || 0, chronic: exclusion.frozenChronic || 0,
                    ratio: exclusion.frozenRatio || 0, dates: [], loads: [],
                    acuteHistory: [], chronicHistory: [], ratioHistory: [],
                };
            } else {
                acwrResult = ACWR_UTILS.calculateAthleteACWR(loadRecords || [], player.id, options);
            }

            const status = excluded
                ? { label: 'Excluded', color: 'text-slate-400', bg: 'bg-slate-100', status: 'excluded' }
                : ACWR_UTILS.getRatioStatus(acwrResult.ratio);
            const reasons = excluded ? [] : ACWR_UTILS.getAthleteRiskReasoning(acwrResult, wellnessData, loadRecords, player.id);

            let score = 0;
            let flags: string[] = [];

            if (excluded) {
                flags.push('Injured / Excluded');
            } else {
                if (returning) { flags.push('Return from Injury'); score += 35; }
                if (acwrResult.ratio > 1.5) { score += 50; flags.push('ACWR Critical'); }
                else if (acwrResult.ratio > 1.3) { score += 30; flags.push('ACWR Elevated'); }
                else if (acwrResult.ratio >= 0.8 && acwrResult.ratio <= 1.3 && acwrResult.ratio > 0) { flags.push('ACWR Normal'); }
                else if (acwrResult.ratio < 0.8 && acwrResult.ratio > 0) { score += 10; flags.push('Undertrained'); }

                const lastWellness = (wellnessData || []).filter(d => d.athleteId === player.id).slice(-1)[0];
                if (lastWellness) {
                    if (lastWellness.energy < 3) { score += 40; flags.push('Severe Fatigue'); }
                    else if (lastWellness.energy < 5) { score += 20; flags.push('Low Energy'); }
                    if (lastWellness.stress > 8) { score += 30; flags.push('High Stress'); }
                    if (lastWellness.sleep < 5) { score += 25; flags.push('Poor Sleep'); }
                }

                const heatmapLogs = (bodyHeatmapData || []).filter(d => d.athleteId === player.id);
                const recentPain = heatmapLogs.some(log => (log.type === 'Acute Pain' || log.intensity > 7) && (Date.now() - new Date(log.timestamp).getTime()) < 86400000);
                if (recentPain) { score += 60; flags.push('Acute Pain'); }
            }

            let riskLevel = 'Clear';
            if (excluded) riskLevel = 'Excluded';
            else if (score >= 50) riskLevel = 'Critical';
            else if (score >= 20) riskLevel = 'Warning';

            const spark = acwrResult.ratioHistory?.slice(-14) || [];

            const athleteRecords = (loadRecords || []).filter(r => (r.athleteId === player.id || r.athlete_id === player.id));
            const lastSession = athleteRecords.length > 0
                ? [...athleteRecords].sort((a, b) => new Date(b.date) - new Date(a.date))[0]?.date
                : null;

            return {
                ...player,
                acwrResult, ratio: acwrResult.ratio, acute: acwrResult.acute, chronic: acwrResult.chronic,
                status, reasons, riskLevel, riskScore: score, flags, spark, lastSession,
                teamName: player.teamName || selectedTeam?.name || '',
                settings: options,
                excluded, returning, exclusion,
            };
        }).sort((a, b) => {
            // Excluded athletes go to the bottom
            if (a.excluded && !b.excluded) return 1;
            if (!a.excluded && b.excluded) return -1;
            return b.ratio - a.ratio;
        });
    }, [uniquePlayers, loadRecords, wellnessData, bodyHeatmapData, acwrSettings, acwrExclusions, selectedTeam]);

    // ACWR trendline — team average or individual client EWMA
    const teamTrendline = useMemo(() => {
        if (!selectedTeamId) return null;
        if (isPrivateClientSelected && privateClientId) {
            // Individual client: show their personal EWMA
            const settings = acwrSettings[selectedTeamId] || {};
            const options = {
                metricType: settings.method || 'srpe',
                acuteN: settings.acuteWindow || 7,
                chronicN: settings.chronicWindow || 28,
                freezeRestDays: settings.freezeRestDays !== false,
            };
            return ACWR_UTILS.calculateAthleteACWR(loadRecords || [], privateClientId, options);
        }
        if (!selectedTeam || !teamSettings?.enabled) return null;
        // Team average: exclude injured athletes
        const playerIds = (selectedTeam.players || []).filter(p => !isExcluded(p.id)).map(p => p.id);
        if (playerIds.length === 0) return null;
        const options = {
            metricType: teamSettings.method || 'srpe',
            acuteN: teamSettings.acuteWindow || 7,
            chronicN: teamSettings.chronicWindow || 28,
            freezeRestDays: teamSettings.freezeRestDays !== false,
        };
        return ACWR_UTILS.calculateTeamACWR(loadRecords || [], playerIds, options);
    }, [selectedTeamId, selectedTeam, loadRecords, teamSettings, acwrExclusions, isPrivateClientSelected, privateClientId, acwrSettings]);

    // Summary stats
    const summary = useMemo(() => {
        const total = rosterData.length;
        const excluded = rosterData.filter(r => r.excluded).length;
        const active = rosterData.filter(r => !r.excluded);
        const critical = active.filter(r => r.riskLevel === 'Critical').length;
        const warning = active.filter(r => r.riskLevel === 'Warning').length;
        const clear = active.filter(r => r.riskLevel === 'Clear').length;
        const noData = active.filter(r => r.ratio === 0 && !r.excluded).length;
        return { total, critical, warning, clear, noData, excluded };
    }, [rosterData]);

    // CSV import — Step 1: read file and open SmartCsvMapper
    const handleCsvFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            const text = (evt.target?.result as string).trim();
            const lines = text.split('\n');
            if (lines.length < 2) { showToast?.('CSV file is empty or invalid'); return; }
            const headers = lines[0].split(',').map(h => h.trim());
            const rows = lines.slice(1).filter(l => l.trim()).map(line => {
                const cols = line.split(',').map(c => c.trim());
                const obj: Record<string, string> = {};
                headers.forEach((h, i) => { obj[h] = cols[i] || ''; });
                return obj;
            });
            setCsvMapperHeaders(headers);
            setCsvMapperRows(rows);
            setIsCsvMapperOpen(true);
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    // CSV import — Step 2: SmartCsvMapper confirmed → check for unmatched athletes
    const handleCsvMapperConfirm = ({ rows, mapping }: { rows: Record<string, string>[]; mapping: Record<string, string> }) => {
        setIsCsvMapperOpen(false);
        setAcwrPendingMapping(mapping);
        const allPlayers = teams.flatMap(t => (t.players || []).map(p => ({ id: p.id, name: p.name, teamId: t.id })));
        const getVal = (row: any, fieldId: string) => mapping[fieldId] ? row[mapping[fieldId]] : '';

        const { matchedRows, unmatchedNames, unmatchedRows } = processAthleteMatching(
            rows, allPlayers, (row) => getVal(row, 'athlete')
        );

        setAcwrPendingMatched(matchedRows);
        setAcwrPendingUnmatched(unmatchedRows);

        if (unmatchedNames.length > 0) {
            setAcwrUnmatched(unmatchedNames);
            setShowAcwrResolver(true);
        } else {
            doAcwrImport(matchedRows, mapping);
        }
    };

    const handleAcwrResolverConfirm = (resolved: ResolvedEntry[]) => {
        setShowAcwrResolver(false);
        const resolvedMap = new Map<string, string>();
        for (const r of resolved) {
            if (r.action === 'assign' && r.athleteId) resolvedMap.set(r.csvName.toLowerCase(), r.athleteId);
        }
        const newlyMatched = acwrPendingUnmatched
            .filter(row => resolvedMap.has((row._csvName || '').toLowerCase()))
            .map(row => ({ ...row, _athleteId: resolvedMap.get((row._csvName || '').toLowerCase()) }));
        doAcwrImport([...acwrPendingMatched, ...newlyMatched], acwrPendingMapping);
    };

    const doAcwrImport = (rows: any[], mapping: Record<string, string>) => {
        const lockedMethod = teamSettings?.method || 'srpe';
        const allPlayers = teams.flatMap(t => (t.players || []).map(p => ({ ...p, teamId: t.id })));
        let imported = 0;

        for (const row of rows) {
            const athleteId = row._athleteId;
            const player = allPlayers.find(p => p.id === athleteId);
            if (!player) continue;
            const getVal = (fieldId: string) => mapping[fieldId] ? row[mapping[fieldId]] : '';

            const date = getVal('date') || new Date().toISOString().split('T')[0];
            const sessionType = (getVal('session_type') || 'training').toLowerCase();
            let value = 0;

            if (lockedMethod === 'srpe') {
                const directSrpe = Number(getVal('srpe')) || 0;
                const rpeVal = Number(getVal('rpe')) || 0;
                const durVal = Number(getVal('duration')) || 0;
                value = directSrpe > 0 ? directSrpe : rpeVal * durVal;
            } else {
                value = Number(getVal('value')) || 0;
            }

            if (value > 0) {
                try {
                    DatabaseService.saveTrainingLoad({
                        athlete_id: player.id, team_id: player.teamId, date,
                        metric_type: lockedMethod, value,
                        session_type: sessionType,
                        rpe: Number(getVal('rpe')) || null,
                        duration_minutes: Number(getVal('duration')) || null,
                    });
                    imported++;
                } catch (err) {}
            }
        }
        showToast?.(`Imported ${imported} training load records from CSV`);
    };

    // Mini sparkline (pixel heights — percentage heights don't work in flex containers)
    const MiniSparkline = ({ data, heightPx = 24 }: { data: number[]; heightPx?: number }) => {
        if (data.length < 2) return <span className="text-[10px] text-slate-300 italic">No trend</span>;
        const max = Math.max(...data, 1.5);
        return (
            <div className="flex items-end gap-[1px]" style={{ height: `${heightPx}px` }}>
                {data.map((val, i) => {
                    const h = Math.max((val / max) * heightPx, 2);
                    const color = val > 1.5 ? 'bg-rose-400' : val > 1.3 ? 'bg-amber-400' : val >= 0.8 ? 'bg-emerald-400' : val > 0 ? 'bg-sky-400' : 'bg-slate-200';
                    return <div key={i} className={`flex-1 rounded-sm ${color}`} style={{ height: `${h}px` }} />;
                })}
            </div>
        );
    };

    // Daily breakdown data for athlete drill-down (must be top-level hook)
    const drilldownPlayerData = acwrView === 'athlete' && selectedAthleteId
        ? rosterData.find(r => r.id === selectedAthleteId) : null;

    const dailyData = useMemo(() => {
        if (!drilldownPlayerData) return [];
        const { acwrResult } = drilldownPlayerData;
        const filterDays = drilldownFilter === '7d' ? 7 : drilldownFilter === '28d' ? 28 : 9999;
        const cutoff = new Date(Date.now() - filterDays * 86400000).toISOString().split('T')[0];
        const days = [];
        const ratioHist = acwrResult.ratioHistory || [];
        const dates = acwrResult.dates || [];
        const loads = acwrResult.loads || [];
        const restDaySet = acwrResult.restDays || new Set();
        for (let i = 0; i < dates.length; i++) {
            if (dates[i] < cutoff) continue;
            const isRestDay = restDaySet.has(dates[i]);
            days.push({
                date: dates[i], load: loads[i], ratio: ratioHist[i] || 0, isRestDay,
                status: ACWR_UTILS.getRatioStatus(ratioHist[i] || 0),
            });
        }
        return days.reverse();
    }, [drilldownPlayerData, drilldownFilter]);

    // ── Log Training Load sub-view ──────────────────────────────────────
    if (acwrView === 'log') {
        return (
            <div className="space-y-4 animate-in fade-in duration-200">
                <button onClick={() => setAcwrView('roster')} className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
                    <ArrowLeftIcon size={14} /> Back to Roster
                </button>
                <TrainingLoadEntry teamId={selectedTeamId} onSaved={() => { setAcwrView('roster'); }} />
            </div>
        );
    }

    // ── Individual Athlete drill-down ────────────────────────────────────
    if (acwrView === 'athlete' && selectedAthleteId) {
        const playerData = drilldownPlayerData;
        if (!playerData) { setAcwrView('roster'); return null; }

        const { acwrResult, status, reasons, spark, settings: playerSettings } = playerData;
        const athleteLoad = (loadRecords || []).filter(r => (r.athleteId === selectedAthleteId || r.athlete_id === selectedAthleteId));
        const sortedLoad = [...athleteLoad].sort((a, b) => new Date(a.date) - new Date(b.date));

        const filterDays = drilldownFilter === '7d' ? 7 : drilldownFilter === '28d' ? 28 : 9999;
        const cutoff = new Date(Date.now() - filterDays * 86400000).toISOString().split('T')[0];
        const filteredLoad = sortedLoad.filter(r => r.date >= cutoff);

        const methodLabel = ACWR_METRIC_TYPES[playerSettings?.metricType]?.label || playerSettings?.metricType || 'sRPE';

        return (
            <div className="space-y-4 animate-in fade-in duration-200">
                <button onClick={() => { setAcwrView('roster'); setSelectedAthleteId(null); }} className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
                    <ArrowLeftIcon size={14} /> Back to Roster
                </button>

                {/* Athlete header */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-200 rounded-xl flex items-center justify-center text-lg font-bold text-slate-600">
                            {getInitials(playerData.name)}
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-slate-900">{playerData.name}</h3>
                            <p className="text-xs text-slate-500">{playerData.position || 'Athlete'} · {playerData.teamName} · {methodLabel}</p>
                        </div>
                        <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${status.bg} ${status.color}`}>
                            {status.label} — {acwrResult.ratio.toFixed(2)}
                        </div>
                    </div>
                </div>

                {/* ACWR Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-1">
                        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">ACWR Ratio</div>
                        <div className={`text-3xl font-bold ${status.color}`}>{acwrResult.ratio.toFixed(2)}</div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-1">
                        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Acute ({playerSettings.acuteN}d)</div>
                        <div className="text-3xl font-bold text-slate-900">{acwrResult.acute}</div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-1">
                        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Chronic ({playerSettings.chronicN}d)</div>
                        <div className="text-3xl font-bold text-slate-900">{acwrResult.chronic}</div>
                    </div>
                    <div className="bg-slate-900 rounded-xl shadow-sm p-4 space-y-1">
                        <div className="text-[10px] font-semibold text-indigo-300 uppercase tracking-wide">Sessions</div>
                        <div className="text-3xl font-bold text-white">{athleteLoad.length}</div>
                    </div>
                </div>

                {/* Filter tabs */}
                <div className="flex items-center gap-2">
                    {(['7d', '28d', 'all'] as const).map(f => (
                        <button key={f} onClick={() => setDrilldownFilter(f)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                drilldownFilter === f ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                        >{f === 'all' ? 'All Data' : `Last ${f}`}</button>
                    ))}
                </div>

                {/* ACWR Trend Line Chart */}
                {acwrResult.ratioHistory?.length > 2 && (
                    <ACWRLineChart
                        dates={acwrResult.dates || []}
                        ratioHistory={acwrResult.ratioHistory || []}
                        acuteHistory={acwrResult.acuteHistory}
                        chronicHistory={acwrResult.chronicHistory}
                        restDays={acwrResult.restDays}
                        height={200}
                        showAcuteChronic={true}
                        title={`ACWR Trend — ${playerData.name}`}
                    />
                )}

                {/* Daily breakdown table */}
                {dailyData.length > 0 && (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
                            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Daily Load & ACWR</h4>
                        </div>
                        <div className="divide-y divide-slate-100 max-h-[350px] overflow-y-auto">
                            {dailyData.map((day, i) => (
                                <div key={i} className={`grid grid-cols-4 gap-4 px-5 py-2.5 text-sm ${day.isRestDay ? 'bg-slate-50/50 text-slate-400' : ''}`}>
                                    <span className="font-medium text-slate-700">
                                        {new Date(day.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                                    </span>
                                    <span className={day.isRestDay ? 'italic' : 'font-medium text-slate-900'}>
                                        {day.isRestDay ? 'Rest Day' : `${day.load} ${ACWR_METRIC_TYPES[playerSettings.metricType]?.unit || 'AU'}`}
                                    </span>
                                    <span className={`font-bold ${day.status.color}`}>{day.ratio.toFixed(2)}</span>
                                    <span className={`text-xs font-medium ${day.status.color}`}>{day.status.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Risk Analysis */}
                {reasons.length > 0 && (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Risk Analysis</h4>
                        {reasons.map((reason, idx) => {
                            const sev = reason.severity === 'critical' ? { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', badge: 'bg-rose-100 text-rose-600' }
                                      : reason.severity === 'warning' ? { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-600' }
                                      : { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-700', badge: 'bg-sky-100 text-sky-600' };
                            return (
                                <div key={idx} className={`${sev.bg} ${sev.border} border rounded-xl p-3.5`}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-[10px] font-bold uppercase tracking-wide ${sev.text}`}>{reason.category}</span>
                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${sev.badge}`}>{reason.severity}</span>
                                    </div>
                                    <p className={`text-sm ${sev.text}`}>{reason.text}</p>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    // ── Main Roster View (default) ──────────────────────────────────────
    return (
        <div className="space-y-4 animate-in fade-in duration-200">
            {/* Loading state */}
            {isLoading && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
                    <ActivityIcon size={28} className="mx-auto text-slate-300 animate-pulse mb-2" />
                    <p className="text-sm text-slate-500">Loading ACWR data...</p>
                </div>
            )}

            {/* No ACWR enabled anywhere (only show after loading completes) */}
            {!isLoading && enabledTeams.length === 0 && enabledPrivateClients.length === 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center space-y-2">
                    <ActivityIcon size={28} className="mx-auto text-amber-400" />
                    <p className="text-sm font-medium text-amber-700">No teams or athletes have ACWR monitoring enabled.</p>
                    <p className="text-xs text-amber-500">Go to Settings → ACWR Monitoring to enable it for your teams.</p>
                </div>
            )}

            {/* Controls bar */}
            {(enabledTeams.length > 0 || enabledPrivateClients.length > 0) && (
                <>
                    <div data-tour="acwr-controls" className="flex flex-wrap items-center gap-3">
                        <div data-tour="acwr-team-selector" className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
                            <UsersIcon size={14} className="text-slate-400" />
                            <select value={selectedTeamId} onChange={e => setSelectedTeamId(e.target.value)} className="bg-transparent text-sm text-slate-700 outline-none">
                                {enabledTeams.length > 0 && (
                                    <optgroup label="Teams">
                                        {enabledTeams.map(t => <option key={t.id} value={t.id}>{t.name} ({(t.players || []).length})</option>)}
                                    </optgroup>
                                )}
                                {enabledPrivateClients.length > 0 && (
                                    <optgroup label="Private Clients">
                                        {enabledPrivateClients.map(p => <option key={`ind_${p.id}`} value={`ind_${p.id}`}>{p.name}</option>)}
                                    </optgroup>
                                )}
                            </select>
                        </div>
                        <div className="flex-1" />
                        <button data-tour="acwr-log-button" onClick={() => setAcwrView('log')} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm">
                            <PlusIcon size={14} /> Log Training Load
                        </button>
                        <button data-tour="acwr-csv-import" onClick={() => csvRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:border-indigo-300 text-slate-700 text-sm font-medium rounded-xl transition-colors shadow-sm">
                            <UploadIcon size={14} /> Import CSV
                        </button>
                        <input ref={csvRef} type="file" accept=".csv" className="hidden" onChange={handleCsvFileSelect} />
                    </div>

                    {/* Team EWMA trendline — line chart */}
                    {teamTrendline && teamTrendline.ratioHistory?.length > 2 && (
                        <div className="relative">
                            {/* Prominent ACWR value badge top-right */}
                            <div className="absolute top-3 right-4 z-10 flex items-center gap-2">
                                <div className="text-right">
                                    <div className="text-[9px] font-medium text-slate-400 uppercase tracking-wide">Current ACWR</div>
                                    <div className={`text-2xl font-bold ${ACWR_UTILS.getRatioStatus(teamTrendline.ratio).color}`}>
                                        {teamTrendline.ratio.toFixed(2)}
                                    </div>
                                </div>
                                <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${ACWR_UTILS.getRatioStatus(teamTrendline.ratio).bg} ${ACWR_UTILS.getRatioStatus(teamTrendline.ratio).color}`}>
                                    {ACWR_UTILS.getRatioStatus(teamTrendline.ratio).label}
                                </div>
                            </div>
                            <ACWRLineChart
                                dates={(teamTrendline.dates || []).slice(-28)}
                                ratioHistory={(teamTrendline.ratioHistory || []).slice(-28)}
                                acuteHistory={(teamTrendline.acuteHistory || []).slice(-28)}
                                chronicHistory={(teamTrendline.chronicHistory || []).slice(-28)}
                                restDays={teamTrendline.restDays}
                                height={230}
                                title={isPrivateClientSelected
                                    ? `ACWR — ${enabledPrivateClients.find(p => p.id === privateClientId)?.name || 'Client'} (${ACWR_METRIC_TYPES[acwrSettings[selectedTeamId]?.method]?.label || 'sRPE'})`
                                    : `Team Average ACWR — ${selectedTeam?.name} (${ACWR_METRIC_TYPES[teamSettings?.method]?.label || 'sRPE'})`
                                }
                            />
                        </div>
                    )}

                    {/* Summary strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3">
                            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Total</div>
                            <div className="text-2xl font-bold text-slate-900">{summary.total}</div>
                        </div>
                        <div className="bg-rose-50 rounded-xl border border-rose-200 px-4 py-3">
                            <div className="text-[10px] font-semibold text-rose-400 uppercase tracking-wide">Critical</div>
                            <div className="text-2xl font-bold text-rose-600">{summary.critical}</div>
                        </div>
                        <div className="bg-amber-50 rounded-xl border border-amber-200 px-4 py-3">
                            <div className="text-[10px] font-semibold text-amber-400 uppercase tracking-wide">Warning</div>
                            <div className="text-2xl font-bold text-amber-600">{summary.warning}</div>
                        </div>
                        <div className="bg-emerald-50 rounded-xl border border-emerald-200 px-4 py-3">
                            <div className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wide">Clear</div>
                            <div className="text-2xl font-bold text-emerald-600">{summary.clear}</div>
                        </div>
                        <div className="bg-slate-50 rounded-xl border border-slate-200 px-4 py-3">
                            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">No Data</div>
                            <div className="text-2xl font-bold text-slate-400">{summary.noData}</div>
                        </div>
                        {summary.excluded > 0 && (
                            <div className="bg-slate-100 rounded-xl border border-slate-300 px-4 py-3">
                                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Injured</div>
                                <div className="text-2xl font-bold text-slate-500">{summary.excluded}</div>
                            </div>
                        )}
                    </div>

                    {/* Athlete roster table */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Athlete Roster — ACWR Status</h4>
                                <div className="flex items-center gap-3 text-[10px] text-slate-400">
                                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-sky-500" /> &lt;0.8 Undertrained</span>
                                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" /> 0.8–1.3 Optimal</span>
                                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500" /> 1.31–1.5 Caution</span>
                                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-rose-500" /> &gt;1.5 Danger</span>
                                </div>
                            </div>
                        </div>

                        <div className="divide-y divide-slate-100">
                            {rosterData.length === 0 ? (
                                <div className="p-8 text-center">
                                    <UsersIcon size={28} className="mx-auto text-slate-300 mb-2" />
                                    <p className="text-sm text-slate-500">No athletes with ACWR monitoring enabled.</p>
                                </div>
                            ) : (
                                rosterData.map(player => {
                                    const riskBorder = player.excluded ? 'border-l-4 border-l-indigo-400 bg-indigo-50/30'
                                                     : player.ratio > 1.5 ? 'border-l-4 border-l-rose-500 bg-rose-50/30'
                                                     : player.ratio > 1.3 ? 'border-l-4 border-l-amber-400 bg-amber-50/30'
                                                     : player.ratio > 0 && player.ratio < 0.8 ? 'border-l-4 border-l-sky-400 bg-sky-50/30'
                                                     : 'border-l-4 border-l-transparent';
                                    const initialsStyle = player.excluded ? 'bg-indigo-100 text-indigo-600'
                                                        : player.ratio > 1.5 ? 'bg-rose-100 text-rose-700'
                                                        : player.ratio > 1.3 ? 'bg-amber-100 text-amber-700'
                                                        : player.ratio > 0 && player.ratio < 0.8 ? 'bg-sky-100 text-sky-700'
                                                        : 'bg-slate-200 text-slate-600';
                                    return (
                                        <div key={player.id}
                                            className={`flex items-center gap-4 px-5 py-3 hover:bg-slate-50/80 transition-colors cursor-pointer group ${riskBorder}`}
                                            onClick={() => { setSelectedAthleteId(player.id); setAcwrView('athlete'); }}
                                        >
                                            {/* Initials */}
                                            <div className="relative shrink-0">
                                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-bold ${initialsStyle}`}>
                                                    {getInitials(player.name)}
                                                </div>
                                                {player.riskLevel !== 'Clear' && player.riskLevel !== 'Excluded' && (
                                                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${player.riskLevel === 'Critical' ? 'bg-rose-500' : 'bg-amber-400'}`} />
                                                )}
                                            </div>
                                            {/* Name */}
                                            <div className="min-w-[130px]">
                                                <h4 className="text-sm font-medium text-slate-900 group-hover:text-indigo-600 transition-colors">{player.name}</h4>
                                            </div>
                                            {/* ACWR */}
                                            <div className="w-14 text-center shrink-0">
                                                {player.excluded ? (
                                                    <>
                                                        <div className="text-lg font-bold text-indigo-400">—</div>
                                                        <div className="text-[9px] font-semibold text-indigo-500">Injured</div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className={`text-lg font-bold ${player.status.color}`}>{player.ratio > 0 ? player.ratio.toFixed(2) : '—'}</div>
                                                        <div className={`text-[9px] font-semibold ${player.status.color}`}>{player.status.label}</div>
                                                    </>
                                                )}
                                            </div>
                                            {/* Acute / Chronic */}
                                            <div className="hidden lg:flex items-center gap-3 text-center shrink-0">
                                                <div className="w-12">
                                                    <div className="text-xs font-bold text-slate-900">{player.acute || '—'}</div>
                                                    <div className="text-[9px] text-slate-400">Acute</div>
                                                </div>
                                                <div className="w-12">
                                                    <div className="text-xs font-bold text-slate-900">{player.chronic || '—'}</div>
                                                    <div className="text-[9px] text-slate-400">Chronic</div>
                                                </div>
                                            </div>
                                            {/* Centre zone: sparkline + flags (fills the middle) */}
                                            <div className="flex-1 flex items-center justify-center gap-3 min-w-0">
                                                <div className="hidden md:block w-24 shrink-0">
                                                    <MiniSparkline data={player.spark} />
                                                </div>
                                                <div className="flex flex-wrap gap-1">
                                                    {player.flags.map((flag, idx) => {
                                                        const fc = flag === 'ACWR Normal' ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                                                 : flag.includes('Critical') || flag.includes('Pain') ? 'bg-rose-50 text-rose-600 border-rose-200'
                                                                 : flag.includes('Injured') || flag.includes('Excluded') ? 'bg-indigo-50 text-indigo-500 border-indigo-200'
                                                                 : flag.includes('Return from Injury') ? 'bg-violet-50 text-violet-600 border-violet-200'
                                                                 : flag.includes('Elevated') || flag.includes('Stress') || flag.includes('Sleep') ? 'bg-amber-50 text-amber-600 border-amber-200'
                                                                 : flag.includes('Fatigue') || flag.includes('Energy') ? 'bg-orange-50 text-orange-600 border-orange-200'
                                                                 : 'bg-sky-50 text-sky-600 border-sky-200';
                                                        return <span key={idx} className={`px-1.5 py-0.5 rounded border text-[9px] font-medium ${fc}`}>{flag}</span>;
                                                    })}
                                                </div>
                                            </div>
                                            {/* Right side: date + buttons */}
                                            <div className="flex items-center gap-2 shrink-0">
                                                <div className="hidden xl:block text-right w-14">
                                                    <div className="text-[10px] text-slate-400">
                                                        {player.excluded && player.exclusion?.excludedDate
                                                            ? new Date(player.exclusion.excludedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
                                                            : player.lastSession ? new Date(player.lastSession).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}
                                                    </div>
                                                </div>
                                                {/* Exclude/Return — highlighted when excluded */}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); toggleExclusion(player.id, player.name); }}
                                                    title={player.excluded ? 'Mark as returned from injury' : 'Exclude (injured)'}
                                                    className={`px-2.5 py-1.5 text-[10px] font-medium rounded-full transition-colors border ${
                                                        player.excluded
                                                            ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'
                                                            : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100 hover:text-slate-600'
                                                    }`}
                                                >
                                                    {player.excluded ? 'Injured ✕' : 'Exclude'}
                                                </button>
                                                {/* Intervene */}
                                                {!player.excluded && player.riskLevel !== 'Clear' ? (
                                                    <button onClick={(e) => { e.stopPropagation(); setInterventionAthlete(player); setIsInterventionOpen(true); }}
                                                        className={`px-3 py-1.5 text-white text-[10px] font-medium rounded-full transition-colors ${player.riskLevel === 'Critical' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-amber-500 hover:bg-amber-600'}`}
                                                    >Intervene</button>
                                                ) : !player.excluded ? (
                                                    <ChevronRightIcon size={14} className="text-slate-300" />
                                                ) : null}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                </>
            )}

            <InterventionModal
                athlete={interventionAthlete}
                isOpen={isInterventionOpen}
                onClose={() => { setIsInterventionOpen(false); setInterventionAthlete(null); }}
                loadRecords={loadRecords || []}
                wellnessData={wellnessData || []}
                acwrOptions={interventionAthlete?.settings || {}}
            />

            <SmartCsvMapper
                isOpen={isCsvMapperOpen}
                onClose={() => setIsCsvMapperOpen(false)}
                onConfirm={handleCsvMapperConfirm}
                schema={getAcwrSchema(teamSettings?.method || 'srpe')}
                csvHeaders={csvMapperHeaders}
                csvRows={csvMapperRows}
            />

            <UnmatchedAthleteResolver
                isOpen={showAcwrResolver}
                onClose={() => setShowAcwrResolver(false)}
                onConfirm={handleAcwrResolverConfirm}
                unmatchedNames={acwrUnmatched}
                allAthletes={teams.flatMap(t => (t.players || []).map(p => ({ id: p.id, name: p.name })))}
                teams={teams}
            />
        </div>
    );
};

// ── Main Page Component ─────────────────────────────────────────────────
export const WellnessHubPage: React.FC = () => {
    const [activeSection, setActiveSection] = useState<string | null>(null);
    const { isLoading } = useAppState();

    if (activeSection) {
        return (
            <div className="space-y-5 animate-in fade-in duration-300">
                <div className="flex items-center justify-between bg-white px-5 py-3.5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setActiveSection(null)} className="p-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-all">
                            <ArrowLeftIcon size={16} />
                        </button>
                        <div>
                            <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Wellness Hub</div>
                            <h2 className="text-base font-semibold text-slate-900">{activeSection}</h2>
                        </div>
                    </div>
                </div>
                <div className="min-h-[600px] relative">
                    {isLoading && (
                        <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-[1px] flex flex-col items-center justify-center gap-3 rounded-xl">
                            <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                            <span className="text-xs font-medium text-slate-400">Loading {activeSection.toLowerCase()}...</span>
                        </div>
                    )}
                    {activeSection === 'Questionnaire Data' && <WellnessHub />}
                    {activeSection === 'Medical Reports' && <MedicalReports />}
                    {activeSection === 'Injury Report' && <InjuryReport />}
                    {activeSection === 'ACWR Monitoring' && <ACWRMonitoringHub />}
                    {activeSection === 'Load Thresholds' && <IndividualizedThresholds />}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5 animate-in fade-in duration-300">
            <div className="bg-white px-5 py-4 rounded-xl border border-slate-200 shadow-sm">
                <h2 className="text-xl font-semibold text-slate-900">Wellness Hub</h2>
                <p className="text-sm text-slate-500 mt-0.5">Athlete wellness monitoring, medical records & injury tracking.</p>
            </div>
            {isLoading ? (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-[150px] flex items-start gap-4">
                                <div className="w-10 h-10 rounded-lg bg-slate-100 animate-pulse shrink-0" />
                                <div className="flex-1 space-y-2 py-1">
                                    <div className="h-4 w-32 bg-slate-100 rounded animate-pulse" />
                                    <div className="h-3 w-full bg-slate-50 rounded animate-pulse" />
                                    <div className="h-3 w-2/3 bg-slate-50 rounded animate-pulse" />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex flex-col items-center py-3">
                        <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-2" />
                        <span className="text-xs font-medium text-slate-400">Loading wellness data...</span>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {SECTIONS.map((section, i) => (
                        <button key={i} onClick={() => setActiveSection(section.title)}
                            className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group flex flex-col text-left h-[150px]"
                        >
                            <div className="flex items-start gap-4 h-full">
                                <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-500 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-all shrink-0">
                                    <section.icon size={20} />
                                </div>
                                <div className="flex flex-col justify-center h-full">
                                    <h3 className="text-base font-semibold text-slate-900 mb-1 leading-tight">{section.title}</h3>
                                    <p className="text-xs text-slate-500 leading-relaxed">{section.desc}</p>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default WellnessHubPage;
