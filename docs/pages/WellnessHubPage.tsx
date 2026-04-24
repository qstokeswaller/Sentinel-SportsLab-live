// @ts-nocheck
import React, { useState, useMemo, useRef } from 'react';
import {
    ClipboardListIcon, StethoscopeIcon, ShieldAlertIcon, ArrowLeftIcon, ActivityIcon,
    UsersIcon, AlertTriangleIcon, TrendingUpIcon,
    UploadIcon, PlusIcon, ChevronRightIcon, ChevronLeftIcon, ShieldIcon, TableIcon,
    RotateCcwIcon, XCircleIcon, Trash2Icon, PencilIcon, CheckIcon,
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
    const { teams, loadRecords, setLoadRecords, wellnessData, bodyHeatmapData, acwrSettings, acwrExclusions, setAcwrExclusions, acwrRecalcAnchors, setAcwrRecalcAnchors, showToast, isLoading } = useAppState();
    const [selectedTeamId, setSelectedTeamId] = useState<string>('');
    const [acwrView, setAcwrView] = useState<'roster' | 'log' | 'athlete' | 'history'>('roster');
    const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);
    const [interventionAthlete, setInterventionAthlete] = useState<any>(null);
    const [isInterventionOpen, setIsInterventionOpen] = useState(false);
    // Exclude dropdown: tracks which player's exclude menu is open
    const [excludeMenuOpenId, setExcludeMenuOpenId] = useState<string | null>(null);
    const [drilldownFilter, setDrilldownFilter] = useState<'7d' | '28d' | '90d' | 'all' | 'custom'>('28d');
    const [drilldownFrom, setDrilldownFrom] = useState<string>(() => {
        const d = new Date(); d.setDate(d.getDate() - 29); return d.toISOString().split('T')[0];
    });
    const [drilldownTo, setDrilldownTo] = useState<string>(() => new Date().toISOString().split('T')[0]);

    // Load History state
    const [historyWeekStart, setHistoryWeekStart] = useState<Date>(() => {
        const d = new Date();
        const dow = d.getDay();
        const diff = d.getDate() - dow + (dow === 0 ? -6 : 1); // Monday
        d.setDate(diff);
        d.setHours(0, 0, 0, 0);
        return d;
    });
    const [historyChartFrom, setHistoryChartFrom] = useState<string>(() => {
        const d = new Date();
        d.setDate(d.getDate() - 27);
        return d.toISOString().split('T')[0];
    });
    const [historyChartTo, setHistoryChartTo] = useState<string>(() => new Date().toISOString().split('T')[0]);

    const csvRef = useRef<HTMLInputElement>(null);
    const [isCsvMapperOpen, setIsCsvMapperOpen] = useState(false);
    const [csvMapperHeaders, setCsvMapperHeaders] = useState<string[]>([]);
    const [csvMapperRows, setCsvMapperRows] = useState<Record<string, string>[]>([]);

    // Edit / delete mode for load tables
    const [editMode, setEditMode] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; playerName: string; date: string } | null>(null);

    const handleDeleteRecord = async (id: string) => {
        try {
            await DatabaseService.deleteTrainingLoad(id);
            setLoadRecords((prev: any[]) => prev.filter(r => r.id !== id));
            setDeleteConfirm(null);
            showToast?.('Load record deleted');
        } catch {
            showToast?.('Failed to delete record');
        }
    };

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

    // Auto-detect the metric type actually present in loadRecords for this team.
    // Falls back to the configured method only if data exists for it; otherwise uses
    // whatever metric_type dominates the actual records so charts always show data.
    const teamMetricType = useMemo(() => {
        const configured = teamSettings?.method || 'srpe';
        const playerIds = new Set(uniquePlayers.map(p => p.id));
        if (playerIds.size === 0) return configured;
        const teamRecords = (loadRecords || []).filter(r => playerIds.has(r.athlete_id || r.athleteId));
        if (teamRecords.length === 0) return configured;
        // Count records per metric_type
        const counts: Record<string, number> = {};
        for (const r of teamRecords) {
            const mt = r.metric_type || 'srpe';
            counts[mt] = (counts[mt] || 0) + 1;
        }
        // If the configured method has data, honour it; otherwise use the dominant metric
        if (counts[configured]) return configured;
        return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    }, [loadRecords, uniquePlayers, teamSettings]);

    // Exclusion helpers
    const isExcluded = (athleteId: string) => acwrExclusions[athleteId]?.excluded === true;
    const getExclusion = (athleteId: string) => acwrExclusions[athleteId] || null;

    // handleExclude — four modes:
    //   'injured'    : long-term injury exclusion — freeze EWMA until Return from Injury
    //   'non_injury' : long-term non-injury exclusion (travel, suspension) — freeze EWMA
    //   'rest'       : per-day freeze for today — treated as explicit rest, not a zero load
    //   'return'     : mark athlete as returning — resets ACWR anchor date to today (gathering phase restarts)
    //   'remove'     : completely clear any exclusion flag
    const handleExclude = (athleteId: string, mode: 'injured' | 'non_injury' | 'rest' | 'return' | 'remove', athleteName: string) => {
        setExcludeMenuOpenId(null);
        const current = acwrExclusions[athleteId] || {};
        const today = new Date().toISOString().split('T')[0];

        if (mode === 'return') {
            // Reset ACWR: set a per-athlete recalc anchor so EWMA starts fresh from today
            setAcwrRecalcAnchors(prev => ({ ...prev, [`rfi_${athleteId}`]: today }));
            setAcwrExclusions(prev => ({
                ...prev,
                [athleteId]: {
                    ...current,
                    excluded: false,
                    returnDate: today,
                    returnAnchorDate: today,
                    frozenAcute: null,
                    frozenChronic: null,
                    frozenRatio: null,
                },
            }));
            showToast?.(`${athleteName} — returning from injury, ACWR reset to gathering phase`);
            return;
        }

        if (mode === 'remove') {
            setAcwrExclusions(prev => {
                const next = { ...prev };
                delete next[athleteId];
                return next;
            });
            // Also clear any return-from-injury anchor
            setAcwrRecalcAnchors(prev => {
                const next = { ...prev };
                delete next[`rfi_${athleteId}`];
                return next;
            });
            showToast?.(`${athleteName} — exclusion removed`);
            return;
        }

        if (mode === 'rest') {
            const existing = current.restDays || [];
            if (existing.includes(today)) {
                showToast?.(`${athleteName} — today is already marked as rest`);
                return;
            }
            setAcwrExclusions(prev => ({
                ...prev,
                [athleteId]: { ...current, restDays: [...existing, today] },
            }));
            showToast?.(`${athleteName} — today marked as rest/freeze (EWMA held)`);
            return;
        }

        // mode === 'injured' or 'non_injury' — freeze EWMA at current values
        const playerTeam = teams.find(t => (t.players || []).some(p => p.id === athleteId));
        const teamId = playerTeam?.id;
        const settings = (teamId === 't_private')
            ? (acwrSettings[`ind_${athleteId}`] || {})
            : (acwrSettings[teamId] || {});
        const acwrResult = ACWR_UTILS.calculateAthleteACWR(loadRecords || [], athleteId, {
            metricType: teamMetricType,
            acuteN: settings.acuteWindow || 7,
            chronicN: settings.chronicWindow || 28,
            freezeRestDays: settings.freezeRestDays !== false,
        });
        setAcwrExclusions(prev => ({
            ...prev,
            [athleteId]: {
                ...current,
                excluded: true,
                excludeType: mode, // 'injured' | 'non_injury'
                excludedDate: today,
                returnDate: null,
                returnAnchorDate: null,
                frozenAcute: acwrResult.acute,
                frozenChronic: acwrResult.chronic,
                frozenRatio: acwrResult.ratio,
            },
        }));
        const label = mode === 'injured' ? 'excluded (injured)' : 'excluded (non-injury)';
        showToast?.(`${athleteName} ${label} — EWMA frozen`);
    };

    // Detect return-from-injury: player has a returnAnchorDate (ACWR reset) and is not yet excluded
    // They stay in "returning" state until their ACWR exits gathering phase (typically 21–28 days of data)
    const isReturningFromInjury = (athleteId: string) => {
        const ex = acwrExclusions[athleteId];
        return !!(ex && !ex.excluded && ex.returnAnchorDate);
    };

    // Days since return (for progress display)
    const daysSinceReturn = (athleteId: string): number => {
        const ex = acwrExclusions[athleteId];
        if (!ex?.returnAnchorDate) return 0;
        const d = new Date(ex.returnAnchorDate + 'T00:00:00');
        return Math.floor((Date.now() - d.getTime()) / 86400000);
    };

    // Calculate ACWR + risk for every player
    const rosterData = useMemo(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        return uniquePlayers.map(player => {
            const excluded = isExcluded(player.id);
            const returning = isReturningFromInjury(player.id);
            const exclusion = getExclusion(player.id);

            // Days since excluded (for time indicator)
            const daysSinceExcluded = excluded && exclusion?.excludedDate
                ? Math.floor((Date.now() - new Date(exclusion.excludedDate + 'T00:00:00').getTime()) / 86400000)
                : 0;

            // For private clients, use their individual settings; for team athletes, use team settings
            const settings = player.teamId === 't_private'
                ? (acwrSettings[`ind_${player.id}`] || {})
                : (acwrSettings[player.teamId] || {});

            // Per-athlete return-from-injury anchor overrides team anchor
            const rfAnchor = acwrRecalcAnchors[`rfi_${player.id}`] || exclusion?.returnAnchorDate || undefined;

            const options = {
                metricType: teamMetricType,
                acuteN: settings.acuteWindow || 7,
                chronicN: settings.chronicWindow || 28,
                freezeRestDays: settings.freezeRestDays !== false,
                recalcAnchorDate: rfAnchor,
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
                flags.push(exclusion?.excludeType === 'non_injury' ? 'Excluded' : 'Injured');
            } else {
                if (returning) { flags.push('Return from Injury'); score += 35; }
                if (acwrResult.ratio > 1.5) { score += 50; flags.push('ACWR Critical'); }
                else if (acwrResult.ratio > 1.3) { score += 30; flags.push('ACWR Elevated'); }
                else if (acwrResult.ratio >= 0.8 && acwrResult.ratio <= 1.3 && acwrResult.ratio > 0) { flags.push('ACWR Normal'); }
                else if (acwrResult.ratio < 0.8 && acwrResult.ratio > 0) { score += 10; flags.push('Underexposed'); }

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

            const athleteRecords = (loadRecords || []).filter(r =>
                (r.athleteId === player.id || r.athlete_id === player.id) && r.metric_type === teamMetricType
            );
            const lastSession = athleteRecords.length > 0
                ? [...athleteRecords].sort((a, b) => new Date(b.date) - new Date(a.date))[0]?.date
                : null;

            // Days without load data (for non-excluded players only)
            const noDataDays = (!excluded && lastSession)
                ? Math.floor((new Date(todayStr + 'T00:00:00').getTime() - new Date(lastSession + 'T00:00:00').getTime()) / 86400000)
                : 0;

            return {
                ...player,
                acwrResult, ratio: acwrResult.ratio, acute: acwrResult.acute, chronic: acwrResult.chronic,
                status, reasons, riskLevel, riskScore: score, flags, spark, lastSession,
                teamName: player.teamName || selectedTeam?.name || '',
                settings: options,
                excluded, returning, exclusion, daysSinceExcluded, noDataDays,
            };
        }).sort((a, b) => {
            if (a.excluded && !b.excluded) return 1;
            if (!a.excluded && b.excluded) return -1;
            const tierRank = { danger: 3, warning: 2, success: 0, neutral: 0 };
            const tA = tierRank[a.status?.status] ?? 0;
            const tB = tierRank[b.status?.status] ?? 0;
            if (tB !== tA) return tB - tA;
            const dA = a.lastSession || '';
            const dB = b.lastSession || '';
            if (dB !== dA) return dB.localeCompare(dA);
            return b.ratio - a.ratio;
        });
    }, [uniquePlayers, loadRecords, wellnessData, bodyHeatmapData, acwrSettings, acwrExclusions, acwrRecalcAnchors, selectedTeam, teamMetricType]);

    // ACWR trendline — team average or individual client EWMA
    const teamTrendline = useMemo(() => {
        if (!selectedTeamId) return null;
        if (isPrivateClientSelected && privateClientId) {
            // Individual client: show their personal EWMA
            const settings = acwrSettings[selectedTeamId] || {};
            const options = {
                metricType: teamMetricType,
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
            metricType: teamMetricType,
            acuteN: teamSettings.acuteWindow || 7,
            chronicN: teamSettings.chronicWindow || 28,
            freezeRestDays: teamSettings.freezeRestDays !== false,
        };
        return ACWR_UTILS.calculateTeamACWR(loadRecords || [], playerIds, options);
    }, [selectedTeamId, selectedTeam, loadRecords, teamSettings, acwrExclusions, isPrivateClientSelected, privateClientId, acwrSettings, teamMetricType]);

    // ── Load History computed data ──────────────────────────────────────
    const weekDays = useMemo(() => {
        const days: string[] = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(historyWeekStart);
            d.setDate(d.getDate() + i);
            days.push(d.toISOString().split('T')[0]);
        }
        return days;
    }, [historyWeekStart]);

    const weekMaxLoad = useMemo(() => {
        let max = 0;
        for (const player of uniquePlayers) {
            for (const day of weekDays) {
                const rec = (loadRecords || []).find(r =>
                    (r.athlete_id === player.id || r.athleteId === player.id) &&
                    r.date === day && r.metric_type === teamMetricType
                );
                if (rec && Number(rec.value) > max) max = Number(rec.value);
            }
        }
        return max || 1;
    }, [uniquePlayers, loadRecords, weekDays, teamMetricType]);

    const historyChartData = useMemo(() => {
        if (!teamTrendline || !teamTrendline.dates?.length) return null;
        const dates = teamTrendline.dates;
        const filtered = dates.map((d, i) => i).filter(i => dates[i] >= historyChartFrom && dates[i] <= historyChartTo);
        if (filtered.length < 2) return null;
        const s = filtered[0], e = filtered[filtered.length - 1] + 1;
        return {
            dates: dates.slice(s, e),
            ratioHistory: (teamTrendline.ratioHistory || []).slice(s, e),
            acuteHistory: (teamTrendline.acuteHistory || []).slice(s, e),
            chronicHistory: (teamTrendline.chronicHistory || []).slice(s, e),
            phases: (teamTrendline.phases || []).slice(s, e),
        };
    }, [teamTrendline, historyChartFrom, historyChartTo]);

    const goWeekBack = () => setHistoryWeekStart(prev => { const d = new Date(prev); d.setDate(d.getDate() - 7); return d; });
    const goWeekForward = () => setHistoryWeekStart(prev => { const d = new Date(prev); d.setDate(d.getDate() + 7); return d; });

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
        let skippedExcluded = 0;

        for (const row of rows) {
            const athleteId = row._athleteId;
            const player = allPlayers.find(p => p.id === athleteId);
            if (!player) continue;

            // Skip GPS data for excluded/injured players — sport scientist must manually clear exclusion first
            if (acwrExclusions[athleteId]?.excluded === true) { skippedExcluded++; continue; }

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
        const skipMsg = skippedExcluded > 0 ? ` · ${skippedExcluded} excluded player${skippedExcluded > 1 ? 's' : ''} skipped` : '';
        showToast?.(`Imported ${imported} training load records${skipMsg}`);
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
        const days = [];
        const ratioHist = acwrResult.ratioHistory || [];
        const dates = acwrResult.dates || [];
        const loads = acwrResult.loads || [];
        const restDaySet = acwrResult.restDays || new Set();
        for (let i = 0; i < dates.length; i++) {
            if (dates[i] < drilldownFrom || dates[i] > drilldownTo) continue;
            const isRestDay = restDaySet.has(dates[i]);
            const rec = (loadRecords || []).find((r: any) =>
                (r.athlete_id === selectedAthleteId || r.athleteId === selectedAthleteId) &&
                r.date === dates[i] && r.metric_type === teamMetricType
            );
            days.push({
                date: dates[i], load: loads[i], ratio: ratioHist[i] || 0, isRestDay,
                status: ACWR_UTILS.getRatioStatus(ratioHist[i] || 0),
                recordId: rec?.id || null,
            });
        }
        return days.reverse();
    }, [drilldownPlayerData, drilldownFrom, drilldownTo, loadRecords, selectedAthleteId, teamMetricType]);

    // ── Delete confirmation popup (shared across athlete + history views) ──
    const deleteModal = deleteConfirm ? (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setDeleteConfirm(null)}>
            <div className="bg-white rounded-xl shadow-2xl p-6 w-80 max-w-[90vw]" onClick={e => e.stopPropagation()}>
                <h3 className="text-sm font-semibold text-slate-900 mb-1">Delete load record?</h3>
                <p className="text-xs text-slate-500 mb-3">
                    <span className="font-medium text-slate-700">{deleteConfirm.playerName}</span>
                    {' · '}
                    {new Date(deleteConfirm.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
                    This will permanently remove this day's load. The day will be left blank with no recorded load.
                </p>
                <div className="flex gap-2">
                    <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium transition-colors">
                        Cancel
                    </button>
                    <button onClick={() => handleDeleteRecord(deleteConfirm.id)} className="flex-1 px-3 py-2 text-sm rounded-lg bg-rose-600 text-white font-semibold hover:bg-rose-700 transition-colors">
                        Delete
                    </button>
                </div>
            </div>
        </div>
    ) : null;

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
        const athleteLoad = (loadRecords || []).filter(r =>
            (r.athleteId === selectedAthleteId || r.athlete_id === selectedAthleteId) &&
            r.metric_type === teamMetricType
        );
        const sortedLoad = [...athleteLoad].sort((a, b) => new Date(a.date) - new Date(b.date));

        const filteredLoad = sortedLoad.filter(r => r.date >= drilldownFrom && r.date <= drilldownTo);

        const methodLabel = ACWR_METRIC_TYPES[playerSettings?.metricType]?.label || playerSettings?.metricType || 'sRPE';

        return (
            <>
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

                {/* Date range controls */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3 flex flex-wrap items-center gap-3">
                    {/* Quick buttons */}
                    <div className="flex items-center gap-1.5">
                        {([['7d', '7 days'], ['28d', '28 days'], ['90d', '90 days'], ['all', 'All time']] as const).map(([key, label]) => (
                            <button key={key} onClick={() => {
                                // Anchor to lastDataDate (not today) so chart shows real data window
                                const anchor = acwrResult.lastDataDate || new Date().toISOString().split('T')[0];
                                const to = anchor;
                                const days = key === '7d' ? 7 : key === '28d' ? 28 : key === '90d' ? 90 : 9999;
                                const from = days === 9999
                                    ? (acwrResult.dates?.[0] || to)
                                    : new Date(new Date(anchor + 'T00:00:00').getTime() - (days - 1) * 86400000).toISOString().split('T')[0];
                                setDrilldownFilter(key);
                                setDrilldownFrom(from);
                                setDrilldownTo(to);
                            }} className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                drilldownFilter === key ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}>{label}</button>
                        ))}
                    </div>
                    <div className="w-px h-5 bg-slate-200" />
                    {/* Custom date pickers */}
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="text-slate-400">From</span>
                        <input type="date" value={drilldownFrom}
                            onChange={e => { setDrilldownFrom(e.target.value); setDrilldownFilter('custom'); }}
                            className="border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 outline-none focus:border-indigo-400 transition-colors"
                        />
                        <span className="text-slate-400">to</span>
                        <input type="date" value={drilldownTo}
                            onChange={e => { setDrilldownTo(e.target.value); setDrilldownFilter('custom'); }}
                            className="border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 outline-none focus:border-indigo-400 transition-colors"
                        />
                    </div>
                    <div className="ml-auto text-[10px] text-slate-400">
                        {dailyData.length} day{dailyData.length !== 1 ? 's' : ''}
                    </div>
                </div>

                {/* ACWR Trend Line Chart — filtered to date range */}
                {acwrResult.ratioHistory?.length > 2 && (() => {
                    const allDates = acwrResult.dates || [];
                    const allRatios = acwrResult.ratioHistory || [];
                    const allAcute = acwrResult.acuteHistory || [];
                    const allChronic = acwrResult.chronicHistory || [];
                    const indices = allDates.map((d, i) => i).filter(i => allDates[i] >= drilldownFrom && allDates[i] <= drilldownTo);
                    if (indices.length < 2) return (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 text-center text-xs text-slate-400">
                            Not enough data in selected range for a chart.
                        </div>
                    );
                    const s = indices[0], e = indices[indices.length - 1] + 1;
                    const allPhases = acwrResult.phases || [];
                    return (
                        <ACWRLineChart
                            dates={allDates.slice(s, e)}
                            ratioHistory={allRatios.slice(s, e)}
                            acuteHistory={allAcute.slice(s, e)}
                            chronicHistory={allChronic.slice(s, e)}
                            phases={allPhases.slice(s, e)}
                            restDays={acwrResult.restDays}
                            height={200}
                            showAcuteChronic={true}
                            title={`ACWR Trend — ${playerData.name}`}
                        />
                    );
                })()}

                {/* Daily breakdown table */}
                <div className={`bg-white rounded-xl border shadow-sm overflow-hidden ${editMode ? 'border-amber-300' : 'border-slate-200'}`}>
                    {/* Column headers */}
                    <div className={`flex items-center gap-4 px-5 py-2.5 border-b ${editMode ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100'}`}>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide flex-1">Date</span>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide w-24">Load</span>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide w-16">ACWR</span>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide w-20">Status</span>
                        <button
                            onClick={() => { setEditMode(m => !m); setDeleteConfirm(null); }}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors ${editMode ? 'bg-amber-100 text-amber-700 border border-amber-300' : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'}`}
                        >
                            {editMode ? <><CheckIcon size={10} /> Done</> : <><PencilIcon size={10} /> Edit</>}
                        </button>
                    </div>
                    {editMode && (
                        <div className="px-5 py-2 bg-amber-50 border-b border-amber-100 text-[10px] text-amber-700 font-medium">
                            Edit mode — click 🗑 to delete a day's record. Two-step confirmation required.
                        </div>
                    )}
                    {dailyData.length === 0 ? (
                        <div className="px-5 py-8 text-center text-sm text-slate-400">No data in selected range.</div>
                    ) : (
                        <div className="divide-y divide-slate-50">
                            {dailyData.map((day, i) => (
                                <div key={i} className={`flex items-center gap-4 px-5 py-2.5 text-sm ${day.isRestDay ? 'bg-slate-50/40 text-slate-400' : 'hover:bg-slate-50/60'}`}>
                                    <span className="font-medium text-slate-700 flex-1">
                                        {new Date(day.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: '2-digit' })}
                                    </span>
                                    <span className={`w-24 ${day.isRestDay ? 'italic text-xs' : 'font-medium text-slate-900'}`}>
                                        {day.isRestDay ? 'Rest' : `${day.load} ${ACWR_METRIC_TYPES[playerSettings.metricType]?.unit || 'AU'}`}
                                    </span>
                                    <span className={`w-16 font-bold ${day.status.color}`}>{day.ratio > 0 ? day.ratio.toFixed(2) : '—'}</span>
                                    <span className={`w-20 text-xs font-medium ${day.status.color}`}>{day.ratio > 0 ? day.status.label : '—'}</span>
                                    {editMode && (
                                        <div className="w-24 flex justify-end">
                                            {!day.isRestDay && day.recordId ? (
                                                <button
                                                    onClick={e => { e.stopPropagation(); setDeleteConfirm({ id: day.recordId, playerName: uniquePlayers.find(p => p.id === selectedAthleteId)?.name || 'Athlete', date: day.date }); }}
                                                    className="p-1 rounded hover:bg-rose-50 text-slate-300 hover:text-rose-500 transition-colors"
                                                    title="Delete this day's record"
                                                >
                                                    <Trash2Icon size={13} />
                                                </button>
                                            ) : <span className="w-6" />}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

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
            {deleteModal}
            </>
        );
    }

    // ── Load History View ───────────────────────────────────────────────
    if (acwrView === 'history') {
        const fmtShort = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        const metricUnit = ACWR_METRIC_TYPES[teamSettings?.method]?.unit || 'AU';

        return (
            <>
            <div className="space-y-4 animate-in fade-in duration-200">
                <button onClick={() => setAcwrView('roster')} className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
                    <ArrowLeftIcon size={14} /> Back to Roster
                </button>

                {/* Team ACWR chart with date range picker */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center gap-3 justify-between">
                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Team ACWR — Custom Range</h4>
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                            <span className="text-slate-400">From</span>
                            <input
                                type="date" value={historyChartFrom}
                                onChange={e => setHistoryChartFrom(e.target.value)}
                                className="border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 outline-none focus:border-indigo-400"
                            />
                            <span className="text-slate-400">to</span>
                            <input
                                type="date" value={historyChartTo}
                                onChange={e => setHistoryChartTo(e.target.value)}
                                className="border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 outline-none focus:border-indigo-400"
                            />
                        </div>
                    </div>
                    {historyChartData ? (
                        <ACWRLineChart
                            dates={historyChartData.dates}
                            ratioHistory={historyChartData.ratioHistory}
                            acuteHistory={historyChartData.acuteHistory}
                            chronicHistory={historyChartData.chronicHistory}
                            phases={historyChartData.phases}
                            restDays={teamTrendline?.restDays}
                            height={220}
                            showAcuteChronic={true}
                            title={`${selectedTeam?.name || 'Team'} — ACWR ${historyChartFrom} → ${historyChartTo}`}
                        />
                    ) : (
                        <div className="p-10 text-center text-sm text-slate-400">No team ACWR data in selected range.</div>
                    )}
                </div>

                {/* Weekly load table */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* Week nav header */}
                    <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center gap-3 justify-between">
                        <div className="flex items-center gap-2">
                            <button onClick={goWeekBack} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors">
                                <ChevronLeftIcon size={14} />
                            </button>
                            <span className="text-xs font-semibold text-slate-700 min-w-[160px] text-center">
                                {fmtShort(weekDays[0])} — {fmtShort(weekDays[6])}
                            </span>
                            <button onClick={goWeekForward} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors">
                                <ChevronRightIcon size={14} />
                            </button>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span>Jump to week:</span>
                            <input
                                type="date"
                                onChange={e => {
                                    if (!e.target.value) return;
                                    const d = new Date(e.target.value + 'T00:00:00');
                                    const dow = d.getDay();
                                    const diff = d.getDate() - dow + (dow === 0 ? -6 : 1);
                                    d.setDate(diff);
                                    setHistoryWeekStart(new Date(d));
                                }}
                                className="border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 outline-none focus:border-indigo-400"
                            />
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-slate-400 ml-auto">
                            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-emerald-100" /> Low</span>
                            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-emerald-300" /> Medium</span>
                            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-amber-300" /> High</span>
                            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-rose-300" /> Peak</span>
                            <button
                                onClick={() => { setEditMode(m => !m); setDeleteConfirm(null); }}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-colors ${editMode ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'}`}
                            >
                                {editMode ? <><CheckIcon size={10} /> Done</> : <><PencilIcon size={10} /> Edit</>}
                            </button>
                        </div>
                    </div>

                    {/* Edit mode banner */}
                    {editMode && (
                        <div className="px-5 py-2 bg-amber-50 border-b border-amber-200 text-[10px] text-amber-700 font-medium">
                            Edit mode — click 🗑 on any cell to delete that day's record. Two-step confirmation required.
                        </div>
                    )}
                    {/* Column headers */}
                    <div className="overflow-x-auto">
                        <table className={`w-full text-xs ${editMode ? 'min-w-[800px]' : 'min-w-[720px]'}`}>
                            <thead>
                                <tr className={`border-b ${editMode ? 'bg-amber-50 border-amber-100' : 'bg-slate-50 border-slate-100'}`}>
                                    <th className="text-left px-4 py-2.5 font-semibold text-slate-500 w-36">Athlete</th>
                                    {weekDays.map(d => (
                                        <th key={d} className="text-center px-1 py-2.5 font-medium text-slate-400 w-20">
                                            <div>{new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short' })}</div>
                                            <div className="text-[10px] text-slate-300">{new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
                                        </th>
                                    ))}
                                    <th className="text-center px-2 py-2.5 font-semibold text-slate-500 w-16">Total</th>
                                    <th className="text-center px-2 py-2.5 font-semibold text-slate-500 w-16">ACWR</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {uniquePlayers.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="px-4 py-8 text-center text-slate-400 text-sm">No athletes in this team.</td>
                                    </tr>
                                ) : uniquePlayers.map(player => {
                                    const playerRoster = rosterData.find(r => r.id === player.id);
                                    const acwrResult = playerRoster?.acwrResult;

                                    const dayLoads = weekDays.map(day => {
                                        const rec = (loadRecords || []).find((r: any) =>
                                            (r.athlete_id === player.id || r.athleteId === player.id) &&
                                            r.date === day && r.metric_type === teamMetricType
                                        );
                                        return rec != null ? { value: Number(rec.value), id: rec.id, isRest: rec.session_type === 'rest' } : null;
                                    });

                                    const weekTotal = dayLoads.reduce((sum: number, v) => sum + (v?.value || 0), 0);

                                    // ACWR as of last day of the week that has ratio data
                                    let weekAcwr = 0;
                                    if (acwrResult?.dates?.length) {
                                        for (let i = weekDays.length - 1; i >= 0; i--) {
                                            const idx = acwrResult.dates.indexOf(weekDays[i]);
                                            if (idx !== -1 && acwrResult.ratioHistory?.[idx] > 0) {
                                                weekAcwr = acwrResult.ratioHistory[idx];
                                                break;
                                            }
                                        }
                                    }

                                    const acwrStatus = weekAcwr > 0 ? ACWR_UTILS.getRatioStatus(weekAcwr) : null;

                                    return (
                                        <tr key={player.id}
                                            className="hover:bg-slate-50 cursor-pointer transition-colors"
                                            onClick={() => { setSelectedAthleteId(player.id); setAcwrView('athlete'); }}
                                        >
                                            <td className="px-4 py-2">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                                        playerRoster?.excluded ? 'bg-indigo-100 text-indigo-600'
                                                        : weekAcwr > 1.5 ? 'bg-rose-100 text-rose-700'
                                                        : weekAcwr > 1.3 ? 'bg-amber-100 text-amber-700'
                                                        : weekAcwr > 0 ? 'bg-emerald-100 text-emerald-700'
                                                        : 'bg-slate-100 text-slate-500'
                                                    }`}>{getInitials(player.name)}</div>
                                                    <span className="font-medium text-slate-800 text-xs truncate max-w-[90px]">{player.name}</span>
                                                </div>
                                            </td>
                                            {dayLoads.map((load, i) => {
                                                const v = load?.value ?? null;
                                                const intensity = (v || 0) / weekMaxLoad;
                                                const bg = v === null ? '' :
                                                    load?.isRest ? 'bg-slate-100 text-slate-400' :
                                                    intensity > 0.8 ? 'bg-rose-200 text-rose-800' :
                                                    intensity > 0.6 ? 'bg-amber-200 text-amber-800' :
                                                    intensity > 0.3 ? 'bg-emerald-200 text-emerald-800' :
                                                    'bg-emerald-100 text-emerald-700';
                                                return (
                                                    <td key={i} className="px-1 py-2 text-center">
                                                        {v === null ? (
                                                            <span className="text-slate-200">—</span>
                                                        ) : editMode && load?.id && !load?.isRest ? (
                                                            <button
                                                                onClick={e => { e.stopPropagation(); setDeleteConfirm({ id: load.id, playerName: player.name, date: weekDays[i] }); }}
                                                                className={`inline-flex items-center gap-0.5 w-full justify-center rounded px-1 py-0.5 font-medium text-[11px] ${bg} hover:ring-1 hover:ring-rose-400 group transition-all`}
                                                                title="Click to delete this record"
                                                            >
                                                                <span>{v}</span>
                                                                <Trash2Icon size={9} className="opacity-0 group-hover:opacity-100 text-rose-500 transition-opacity" />
                                                            </button>
                                                        ) : (
                                                            <span className={`inline-block w-full rounded px-1 py-0.5 font-medium text-[11px] ${bg}`}>
                                                                {load?.isRest ? 'Rest' : v}
                                                            </span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                            <td className="px-2 py-2 text-center">
                                                <span className="font-bold text-slate-700 text-xs">{weekTotal > 0 ? weekTotal : '—'}</span>
                                                {weekTotal > 0 && <div className="text-[9px] text-slate-400">{metricUnit}</div>}
                                            </td>
                                            <td className="px-2 py-2 text-center">
                                                {acwrStatus ? (
                                                    <>
                                                        <div className={`font-bold text-xs ${acwrStatus.color}`}>{weekAcwr.toFixed(2)}</div>
                                                        <div className={`text-[9px] ${acwrStatus.color}`}>{acwrStatus.label}</div>
                                                    </>
                                                ) : (
                                                    <span className="text-slate-300 text-xs">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            {deleteModal}
            </>
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
                        <button onClick={() => setAcwrView('history')} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:border-indigo-300 text-slate-700 text-sm font-medium rounded-xl transition-colors shadow-sm">
                            <TableIcon size={14} /> Load History
                        </button>
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
                                dates={(teamTrendline.dates || []).slice(-30)}
                                ratioHistory={(teamTrendline.ratioHistory || []).slice(-30)}
                                acuteHistory={(teamTrendline.acuteHistory || []).slice(-30)}
                                chronicHistory={(teamTrendline.chronicHistory || []).slice(-30)}
                                phases={(teamTrendline.phases || []).slice(-30)}
                                restDays={teamTrendline.restDays}
                                height={230}
                                title={isPrivateClientSelected
                                    ? `ACWR — ${enabledPrivateClients.find(p => p.id === privateClientId)?.name || 'Client'} (${ACWR_METRIC_TYPES[acwrSettings[selectedTeamId]?.method]?.label || 'sRPE'})`
                                    : `Team Average ACWR — ${selectedTeam?.name} (${ACWR_METRIC_TYPES[teamSettings?.method]?.label || 'sRPE'})`
                                }
                            />
                        </div>
                    )}

                    {/* Gap warning banner */}
                    {teamTrendline?.gapStatus === 'prompt' && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
                            <AlertTriangleIcon size={16} className="text-amber-500 mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-amber-800">No team data for {teamTrendline.gapDays} days — ACWR frozen at last known values.</p>
                                <p className="text-[11px] text-amber-600 mt-0.5">When new data arrives you'll be prompted to reset or continue from here. After 14 days the formula resets automatically.</p>
                            </div>
                        </div>
                    )}
                    {teamTrendline?.gapStatus === 'auto_reset' && (
                        <div className="bg-slate-100 border border-slate-300 rounded-xl px-4 py-3 flex items-start gap-3">
                            <AlertTriangleIcon size={16} className="text-slate-500 mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-slate-700">ACWR reset — no data for {teamTrendline.gapDays} days.</p>
                                <p className="text-[11px] text-slate-500 mt-0.5">Formula restarted automatically. Log new training data to begin building ACWR again.</p>
                            </div>
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
                                <div className="hidden sm:flex items-center gap-3 text-[10px] text-slate-400">
                                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-sky-500" /> &lt;0.8 Underexposed</span>
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
                                            <div className="w-16 text-center shrink-0">
                                                {player.excluded ? (
                                                    <>
                                                        <div className="text-lg font-bold text-indigo-400">—</div>
                                                        <div className="text-[9px] font-semibold text-indigo-500">
                                                            {player.exclusion?.excludeType === 'non_injury' ? 'Excluded' : 'Injured'}
                                                        </div>
                                                    </>
                                                ) : player.acwrResult?.gapStatus === 'auto_reset' ? (
                                                    <>
                                                        <div className="text-lg font-bold text-slate-300">—</div>
                                                        <div className="text-[9px] font-semibold text-slate-400">Stale</div>
                                                    </>
                                                ) : player.acwrResult?.gatheringPhase ? (
                                                    <>
                                                        <div className="text-lg font-bold text-slate-400">...</div>
                                                        <div className="text-[9px] font-semibold text-slate-400">Gathering</div>
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
                                            {/* Right side: date/indicator + buttons */}
                                            <div className="flex items-center gap-2 shrink-0">
                                                {/* Date / status indicator */}
                                                <div className="hidden xl:block text-right w-20">
                                                    {player.excluded ? (
                                                        // Time since excluded — amber after 7 days
                                                        <div className={`text-[10px] font-semibold ${player.daysSinceExcluded > 7 ? 'text-amber-500' : 'text-slate-400'}`}>
                                                            {player.exclusion?.excludeType === 'injured' ? 'Injured' : 'Excluded'}
                                                            {' · '}{player.daysSinceExcluded}d
                                                        </div>
                                                    ) : player.returning ? (
                                                        <div className="text-[10px] font-semibold text-violet-500">
                                                            Return · Day {daysSinceReturn(player.id)}
                                                        </div>
                                                    ) : player.noDataDays >= 3 ? (
                                                        // Passive "no data" nudge
                                                        <div className={`text-[10px] font-semibold ${player.noDataDays >= 7 ? 'text-amber-400' : 'text-slate-300'}`}>
                                                            No data {player.noDataDays}d
                                                        </div>
                                                    ) : (
                                                        <div className="text-[10px] text-slate-400">
                                                            {player.lastSession
                                                                ? new Date(player.lastSession + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
                                                                : '—'}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Exclude controls */}
                                                <div className="relative flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                                    {player.excluded ? (
                                                        // Excluded state: Return from Injury (injured only) + Remove
                                                        <>
                                                            {player.exclusion?.excludeType === 'injured' && (
                                                                <button
                                                                    onClick={() => handleExclude(player.id, 'return', player.name)}
                                                                    className="flex items-center gap-1 px-2 py-1.5 text-[10px] font-medium rounded-full border bg-violet-600 text-white border-violet-600 hover:bg-violet-700 transition-colors"
                                                                    title="Reset ACWR and start gathering phase"
                                                                >
                                                                    <RotateCcwIcon size={9} /> Return
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => handleExclude(player.id, 'remove', player.name)}
                                                                className="flex items-center gap-1 px-2 py-1.5 text-[10px] font-medium rounded-full border bg-slate-100 text-slate-500 border-slate-200 hover:bg-rose-50 hover:text-rose-500 hover:border-rose-200 transition-colors"
                                                                title="Remove exclusion entirely"
                                                            >
                                                                <XCircleIcon size={9} /> Remove
                                                            </button>
                                                        </>
                                                    ) : (
                                                        // Active state: Exclude dropdown (Injured / Non-Injury)
                                                        <>
                                                            <button
                                                                onClick={() => setExcludeMenuOpenId(prev => prev === player.id ? null : player.id)}
                                                                className="px-2.5 py-1.5 text-[10px] font-medium rounded-full transition-colors border bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100 hover:text-slate-600"
                                                            >Exclude ▾</button>
                                                            {excludeMenuOpenId === player.id && (
                                                                <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-lg py-1 w-52">
                                                                    <button
                                                                        onClick={() => handleExclude(player.id, 'injured', player.name)}
                                                                        className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-rose-50 hover:text-rose-700 flex flex-col gap-0.5"
                                                                    >
                                                                        <span className="font-semibold">Injured</span>
                                                                        <span className="text-[10px] text-slate-400">Freeze EWMA — use Return to reset ACWR on comeback</span>
                                                                    </button>
                                                                    <div className="border-t border-slate-100 my-0.5" />
                                                                    <button
                                                                        onClick={() => handleExclude(player.id, 'non_injury', player.name)}
                                                                        className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-sky-50 hover:text-sky-700 flex flex-col gap-0.5"
                                                                    >
                                                                        <span className="font-semibold">Exclude (Non-Injury)</span>
                                                                        <span className="text-[10px] text-slate-400">Travel, suspension, personal leave</span>
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                </div>

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
