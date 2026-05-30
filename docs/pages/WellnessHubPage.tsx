// @ts-nocheck
import React, { useState, useMemo, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import {
    ClipboardListIcon, StethoscopeIcon, ShieldAlertIcon, ArrowLeftIcon, ActivityIcon,
    UsersIcon, AlertTriangleIcon, TrendingUpIcon,
    UploadIcon, PlusIcon, ChevronRightIcon, ChevronLeftIcon, ShieldIcon, TableIcon,
    RotateCcwIcon, XCircleIcon, Trash2Icon, PencilIcon, CheckIcon, ChevronDownIcon,
    HeartPulseIcon,
} from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import WellnessHub from '../components/performance/WellnessHub';
import MedicalReports from '../components/wellness/MedicalReports';
import InjuryReport from '../components/wellness/InjuryReport';
import TrainingLoadEntry from '../components/analytics/TrainingLoadEntry';
import InterventionModal from '../components/analytics/InterventionModal';
import { AthleteAvatar } from '../components/roster/AthleteAvatar';
import HeartRateMetricsReport from '../components/wellness/HeartRateMetricsReport';
import { ACWR_UTILS, ACWR_METRIC_TYPES } from '../utils/constants';
import { DatabaseService } from '../services/databaseService';
import ACWRLineChart from '../components/analytics/ACWRLineChart';
import IndividualizedThresholds from '../components/analytics/IndividualizedThresholds';
import SmartCsvMapper from '../components/ui/SmartCsvMapper';
import { getAcwrSchema, normaliseDate } from '../utils/csvSchemas';
import { processAthleteMatching } from '../utils/athleteMatcher';
import UnmatchedAthleteResolver from '../components/ui/UnmatchedAthleteResolver';
import { CustomSelect } from '../components/ui/CustomSelect';
import type { ResolvedEntry } from '../components/ui/UnmatchedAthleteResolver';

const SECTIONS = [
    { title: 'Questionnaire Data', desc: 'Wellness check-in responses, readiness scores & team trends', icon: ClipboardListIcon },
    { title: 'Medical Reports',    desc: 'Athlete opt-outs, medical status and strategic notes',       icon: StethoscopeIcon },
    { title: 'Injury Report',      desc: 'Injury tracking, body map analysis & return-to-play',        icon: ShieldAlertIcon },
    { title: 'ACWR Monitoring',    desc: 'Track acute:chronic workload ratios to prevent overtraining and optimise load', icon: ActivityIcon },
    { title: 'Load Thresholds',   desc: 'Individualized ACWR thresholds — personal safe training bands per athlete', icon: ShieldIcon },
    { title: 'Heart Rate Metrics', desc: 'Session intensity, peaks & zone distribution from HR monitor imports', icon: HeartPulseIcon },
];

// Helper: get initials from a name
const getInitials = (name: string) => name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??';

// ── ACWR Monitoring Hub ─────────────────────────────────────────────────
const ACWRMonitoringHub: React.FC = () => {
    const { teams, loadRecords, setLoadRecords, wellnessData, bodyHeatmapData, acwrSettings, acwrExclusions, setAcwrExclusions, acwrRecalcAnchors, setAcwrRecalcAnchors, showToast, isLoading } = useAppState();
    const [selectedTeamId, setSelectedTeamId] = useState<string>('');
    const [acwrView, setAcwrView] = useState<'roster' | 'log' | 'athlete' | 'history' | 'full_table'>('roster');
    const [reportOpen, setReportOpen] = useState<null | 'squad_summary' | 'at_risk' | 'risk_report'>(null);
    const [reportPeriodDays, setReportPeriodDays] = useState<7 | 14 | 28 | 90>(28);
    const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);
    const [interventionAthlete, setInterventionAthlete] = useState<any>(null);
    const [isInterventionOpen, setIsInterventionOpen] = useState(false);
    // Exclude dropdown: tracks which player's exclude menu is open
    const [excludeMenuOpenId, setExcludeMenuOpenId] = useState<string | null>(null);
    const [excludeMenuPos, setExcludeMenuPos] = useState<{top: number; left: number} | null>(null);
    useEffect(() => {
        if (!excludeMenuOpenId) return;
        const close = () => { setExcludeMenuOpenId(null); setExcludeMenuPos(null); };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [excludeMenuOpenId]);
    const [drilldownFilter, setDrilldownFilter] = useState<'7d' | '28d' | '90d' | 'all' | 'custom'>('28d');
    const [rosterTab, setRosterTab] = useState<'all' | 'at_risk' | 'underloaded' | 'optimal'>('all');
    const [viewDate, setViewDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
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
    const [acwrImportDateOverride, setAcwrImportDateOverride] = useState<string>('');

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

    const realTodayStr = new Date().toISOString().split('T')[0];
    const isHistoricalView = viewDate !== realTodayStr;

    // Records filtered to viewDate — everything downstream uses this so historical snapshots work correctly
    const viewFilteredRecords = useMemo(() =>
        (loadRecords || []).filter(r => (r.date || '').split('T')[0] <= viewDate),
    [loadRecords, viewDate]);

    // Calculate ACWR + risk for every player
    const rosterData = useMemo(() => {
        const todayStr = viewDate;
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
                referenceDate: viewDate,
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
                acwrResult = ACWR_UTILS.calculateAthleteACWR(viewFilteredRecords, player.id, options);
            }

            const status = excluded
                ? { label: 'Excluded', color: 'text-slate-400 dark:text-[#CBD5E1]', bg: 'bg-slate-100 dark:bg-[#1A2D48]', status: 'excluded' }
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

            const athleteRecords = viewFilteredRecords.filter(r =>
                (r.athleteId === player.id || r.athlete_id === player.id) && r.metric_type === teamMetricType
            );
            const lastSession = athleteRecords.length > 0
                ? [...athleteRecords].sort((a, b) => new Date(b.date) - new Date(a.date))[0]?.date
                : null;

            // Days without load data (for non-excluded players only)
            const noDataDays = (!excluded && lastSession)
                ? Math.floor((new Date(todayStr + 'T00:00:00').getTime() - new Date(lastSession + 'T00:00:00').getTime()) / 86400000)
                : 0;

            // Monotony + Strain from last 7 days of loads
            const last7: number[] = [];
            for (let i = 6; i >= 0; i--) {
                const d = new Date(todayStr + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - i);
                const dayStr = d.toISOString().split('T')[0];
                const rec = athleteRecords.find((r: any) => r.date === dayStr);
                last7.push(rec ? Number(rec.value) : 0);
            }
            const weekLoad = last7.reduce((s, v) => s + v, 0);
            const meanLoad = weekLoad / 7;
            const sd = Math.sqrt(last7.reduce((s, v) => s + Math.pow(v - meanLoad, 2), 0) / 7);
            const monotony = sd > 0 ? parseFloat((meanLoad / sd).toFixed(1)) : 0;
            const strain = Math.round(weekLoad * monotony);

            return {
                ...player,
                acwrResult, ratio: acwrResult.ratio, acute: acwrResult.acute, chronic: acwrResult.chronic,
                status, reasons, riskLevel, riskScore: score, flags, spark, lastSession,
                teamName: player.teamName || selectedTeam?.name || '',
                settings: options,
                excluded, returning, exclusion, daysSinceExcluded, noDataDays,
                monotony, strain,
            };
        }).sort((a, b) => {
            if (a.excluded && !b.excluded) return 1;
            if (!a.excluded && b.excluded) return -1;
            const toTier = (r: number) => r > 1.5 ? 3 : r > 1.3 ? 2 : r < 0.8 && r > 0 ? 1 : 0;
            const tA = toTier(a.ratio);
            const tB = toTier(b.ratio);
            if (tB !== tA) return tB - tA;
            const dA = a.lastSession || '';
            const dB = b.lastSession || '';
            if (dB !== dA) return dB.localeCompare(dA);
            return b.ratio - a.ratio;
        });
    }, [uniquePlayers, viewFilteredRecords, viewDate, loadRecords, wellnessData, bodyHeatmapData, acwrSettings, acwrExclusions, acwrRecalcAnchors, selectedTeam, teamMetricType]);

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
            return ACWR_UTILS.calculateAthleteACWR(viewFilteredRecords, privateClientId, { ...options, referenceDate: viewDate });
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
            referenceDate: viewDate,
        };
        return ACWR_UTILS.calculateTeamACWR(viewFilteredRecords, playerIds, options);
    }, [selectedTeamId, selectedTeam, viewFilteredRecords, viewDate, loadRecords, teamSettings, acwrExclusions, isPrivateClientSelected, privateClientId, acwrSettings, teamMetricType]);

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

    // Filtered roster by tab
    const filteredRoster = useMemo(() => {
        if (rosterTab === 'at_risk') return rosterData.filter(p => !p.excluded && p.ratio > 1.0);
        if (rosterTab === 'underloaded') return rosterData.filter(p => !p.excluded && p.ratio > 0 && p.ratio < 0.70);
        if (rosterTab === 'optimal') return rosterData.filter(p => !p.excluded && p.ratio >= 0.70 && p.ratio <= 1.0);
        return rosterData;
    }, [rosterData, rosterTab]);

    // ACWR zone distribution counts
    const distributionCounts = useMemo(() => {
        const active = rosterData.filter(r => !r.excluded && r.ratio > 0);
        return {
            highRisk: active.filter(r => r.ratio > 1.30).length,
            elevated: active.filter(r => r.ratio > 1.00 && r.ratio <= 1.30).length,
            optimal: active.filter(r => r.ratio >= 0.70 && r.ratio <= 1.00).length,
            underloaded: active.filter(r => r.ratio < 0.70).length,
            total: active.length,
        };
    }, [rosterData]);

    const loadUnit = (ACWR_METRIC_TYPES as any)[teamMetricType]?.unit || 'AU';

    // Data compliance: % of active athletes with load recorded in last 7 days of viewDate window
    const dataCompliance = useMemo(() => {
        const cutoff = new Date(viewDate + 'T00:00:00'); cutoff.setDate(cutoff.getDate() - 7);
        const cutoffStr = cutoff.toISOString().split('T')[0];
        const active = rosterData.filter(r => !r.excluded);
        if (active.length === 0) return 0;
        const hasData = active.filter(p => p.lastSession && p.lastSession >= cutoffStr).length;
        return Math.round((hasData / active.length) * 100);
    }, [rosterData, viewDate]);


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

    const doAcwrImport = async (rows: any[], mapping: Record<string, string>) => {
        const lockedMethod = teamSettings?.method || 'srpe';
        const allPlayers = teams.flatMap(t => (t.players || []).map(p => ({ ...p, teamId: t.id })));
        const batch: any[] = [];
        let skippedExcluded = 0;

        for (const row of rows) {
            const athleteId = row._athleteId;
            const player = allPlayers.find(p => p.id === athleteId);
            if (!player) continue;

            // Skip GPS data for excluded/injured players — sport scientist must manually clear exclusion first
            if (acwrExclusions[athleteId]?.excluded === true) { skippedExcluded++; continue; }

            const getVal = (fieldId: string) => mapping[fieldId] ? row[mapping[fieldId]] : '';

            const date = acwrImportDateOverride || normaliseDate(getVal('date'));
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
                batch.push({
                    athlete_id: player.id, team_id: player.teamId, date,
                    metric_type: lockedMethod, value,
                    session_type: sessionType,
                    rpe: Number(getVal('rpe')) || null,
                    duration_minutes: Number(getVal('duration')) || null,
                });
            }
        }

        if (batch.length > 0) {
            try {
                await DatabaseService.saveTrainingLoadsBatch(batch);
            } catch (err) {
                console.warn('ACWR import batch save failed:', err);
            }
        }

        const skipMsg = skippedExcluded > 0 ? ` · ${skippedExcluded} excluded player${skippedExcluded > 1 ? 's' : ''} skipped` : '';
        showToast?.(`Imported ${batch.length} training load records${skipMsg}`);
    };

    // Last-4-days mini bar chart with load values
    const MiniBars = ({ athleteId }: { athleteId: string }) => {
        const refDate = new Date(viewDate + 'T12:00:00Z');
        const days: string[] = [];
        for (let i = 3; i >= 0; i--) {
            const d = new Date(refDate); d.setUTCDate(d.getUTCDate() - i);
            days.push(d.toISOString().split('T')[0]);
        }
        const values = days.map(day => {
            const rec = viewFilteredRecords.find((r: any) =>
                (r.athlete_id === athleteId || r.athleteId === athleteId) &&
                r.date === day && r.metric_type === teamMetricType
            );
            return rec ? Number(rec.value) : 0;
        });
        const max = Math.max(...values, 1);
        const hasAny = values.some(v => v > 0);
        if (!hasAny) return <span className="text-[9px] text-slate-300 dark:text-[#475569] italic">No data</span>;
        return (
            <div className="flex items-end gap-1" style={{ height: '36px' }}>
                {values.map((val, i) => {
                    const barH = val > 0 ? Math.max((val / max) * 24, 6) : 3;
                    const bg = val === 0 ? 'bg-slate-100 dark:bg-[#243A58]'
                        : val > 600 ? 'bg-rose-400' : val > 400 ? 'bg-amber-400' : 'bg-emerald-400';
                    return (
                        <div key={i} className="flex flex-col items-center justify-end gap-0.5 flex-1" style={{ height: '36px' }}>
                            {val > 0 && <span className="text-[8px] font-bold text-slate-500 dark:text-[#CBD5E1] leading-none">{val}</span>}
                            <div className={`w-full rounded-sm ${bg}`} style={{ height: `${barH}px` }} />
                        </div>
                    );
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
            <div className="bg-white dark:bg-[#132338] rounded-xl shadow-2xl p-6 w-80 max-w-[90vw]" onClick={e => e.stopPropagation()}>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0] mb-1">Delete load record?</h3>
                <p className="text-xs text-slate-500 dark:text-[#CBD5E1] mb-3">
                    <span className="font-medium text-slate-700 dark:text-[#E2E8F0]">{deleteConfirm.playerName}</span>
                    {' · '}
                    {new Date(deleteConfirm.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg px-3 py-2 mb-4">
                    This will permanently remove this day's load. The day will be left blank with no recorded load.
                </p>
                <div className="flex gap-2">
                    <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-[#243A58] text-slate-600 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-[#1A2D48] font-medium transition-colors">
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
                <button onClick={() => setAcwrView('roster')} className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-[#CBD5E1] hover:text-slate-900 dark:hover:text-[#E2E8F0] transition-colors">
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
                <button onClick={() => { setAcwrView('roster'); setSelectedAthleteId(null); }} className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-[#CBD5E1] hover:text-slate-900 dark:hover:text-[#E2E8F0] transition-colors">
                    <ArrowLeftIcon size={14} /> Back to Roster
                </button>

                {/* Athlete header */}
                <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-5">
                    <div className="flex items-center gap-4">
                        <AthleteAvatar
                            player={playerData}
                            size="md"
                            shape="rounded-xl"
                            className="w-12 h-12"
                            fallbackClass="bg-slate-200 dark:bg-[#243A58] text-slate-600 dark:text-[#CBD5E1]"
                            fallbackTextSize="text-lg"
                        />
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-[#E2E8F0]">{playerData.name}</h3>
                            <p className="text-xs text-slate-500 dark:text-[#CBD5E1]">{playerData.position || 'Athlete'} · {playerData.teamName} · {methodLabel}</p>
                        </div>
                        <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${status.bg} ${status.color}`}>
                            {status.label} — {acwrResult.ratio.toFixed(2)}
                        </div>
                    </div>
                </div>

                {/* ACWR Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-4 space-y-1">
                        <div className="text-[10px] font-semibold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide">ACWR Ratio</div>
                        <div className={`text-3xl font-bold ${status.color}`}>{acwrResult.ratio.toFixed(2)}</div>
                    </div>
                    <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-4 space-y-1">
                        <div className="text-[10px] font-semibold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide">Acute ({playerSettings.acuteN}d)</div>
                        <div className="text-3xl font-bold text-slate-900 dark:text-[#E2E8F0]">{acwrResult.acute}</div>
                    </div>
                    <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-4 space-y-1">
                        <div className="text-[10px] font-semibold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide">Chronic ({playerSettings.chronicN}d)</div>
                        <div className="text-3xl font-bold text-slate-900 dark:text-[#E2E8F0]">{acwrResult.chronic}</div>
                    </div>
                    <div className="bg-slate-900 rounded-xl shadow-sm p-4 space-y-1">
                        <div className="text-[10px] font-semibold text-indigo-300 uppercase tracking-wide">Sessions</div>
                        <div className="text-3xl font-bold text-white">{athleteLoad.length}</div>
                    </div>
                </div>

                {/* Date range controls */}
                <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm px-4 py-3 flex flex-wrap items-center gap-3">
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
                                drilldownFilter === key ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-[#1A2D48] text-slate-500 dark:text-[#CBD5E1] hover:bg-slate-200'
                            }`}>{label}</button>
                        ))}
                    </div>
                    <div className="w-px h-5 bg-slate-200 dark:bg-[#243A58]" />
                    {/* Custom date pickers */}
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-[#CBD5E1]">
                        <span className="text-slate-400 dark:text-[#CBD5E1]">From</span>
                        <input type="date" value={drilldownFrom}
                            onChange={e => { setDrilldownFrom(e.target.value); setDrilldownFilter('custom'); }}
                            className="border border-slate-200 dark:border-[#243A58] rounded-lg px-2 py-1 text-xs text-slate-700 dark:text-[#E2E8F0] outline-none focus:border-indigo-400 transition-colors"
                        />
                        <span className="text-slate-400 dark:text-[#CBD5E1]">to</span>
                        <input type="date" value={drilldownTo}
                            onChange={e => { setDrilldownTo(e.target.value); setDrilldownFilter('custom'); }}
                            className="border border-slate-200 dark:border-[#243A58] rounded-lg px-2 py-1 text-xs text-slate-700 dark:text-[#E2E8F0] outline-none focus:border-indigo-400 transition-colors"
                        />
                    </div>
                    <div className="ml-auto text-[10px] text-slate-400 dark:text-[#CBD5E1]">
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
                        <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-6 text-center text-xs text-slate-400 dark:text-[#CBD5E1]">
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
                <div className={`bg-white dark:bg-[#132338] rounded-xl border shadow-sm overflow-hidden ${editMode ? 'border-amber-300' : 'border-slate-200 dark:border-[#243A58]'}`}>
                    {/* Column headers */}
                    <div className={`flex items-center gap-4 px-5 py-2.5 border-b ${editMode ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50' : 'bg-slate-50 dark:bg-[#0F1C30] border-slate-100 dark:border-[#1A2D48]'}`}>
                        <span className="text-[10px] font-semibold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide flex-1">Date</span>
                        <span className="text-[10px] font-semibold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide w-24">Load</span>
                        <span className="text-[10px] font-semibold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide w-16">ACWR</span>
                        <span className="text-[10px] font-semibold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide w-20">Status</span>
                        <button
                            onClick={() => { setEditMode(m => !m); setDeleteConfirm(null); }}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors ${editMode ? 'bg-amber-100 text-amber-700 dark:text-amber-400 border border-amber-300' : 'bg-slate-100 dark:bg-[#1A2D48] text-slate-500 dark:text-[#CBD5E1] border border-slate-200 dark:border-[#243A58] hover:bg-slate-200'}`}
                        >
                            {editMode ? <><CheckIcon size={10} /> Done</> : <><PencilIcon size={10} /> Edit</>}
                        </button>
                    </div>
                    {editMode && (
                        <div className="px-5 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-800/40 text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                            Edit mode — click 🗑 to delete a day's record. Two-step confirmation required.
                        </div>
                    )}
                    {dailyData.length === 0 ? (
                        <div className="px-5 py-8 text-center text-sm text-slate-400 dark:text-[#CBD5E1]">No data in selected range.</div>
                    ) : (
                        <div className="divide-y divide-slate-50">
                            {dailyData.map((day, i) => (
                                <div key={i} className={`flex items-center gap-4 px-5 py-2.5 text-sm ${day.isRestDay ? 'bg-slate-50/40 dark:bg-[#0F1C30]/40 text-slate-400 dark:text-[#CBD5E1]' : 'hover:bg-slate-50/60 dark:bg-[#132338]/40'}`}>
                                    <span className="font-medium text-slate-700 dark:text-[#E2E8F0] flex-1">
                                        {new Date(day.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: '2-digit' })}
                                    </span>
                                    <span className={`w-24 ${day.isRestDay ? 'italic text-xs' : 'font-medium text-slate-900 dark:text-[#E2E8F0]'}`}>
                                        {day.isRestDay ? 'Rest' : `${day.load} ${ACWR_METRIC_TYPES[playerSettings.metricType]?.unit || 'AU'}`}
                                    </span>
                                    <span className={`w-16 font-bold ${day.status.color}`}>{day.ratio > 0 ? day.ratio.toFixed(2) : '—'}</span>
                                    <span className={`w-20 text-xs font-medium ${day.status.color}`}>{day.ratio > 0 ? day.status.label : '—'}</span>
                                    {editMode && (
                                        <div className="w-24 flex justify-end">
                                            {!day.isRestDay && day.recordId ? (
                                                <button
                                                    onClick={e => { e.stopPropagation(); setDeleteConfirm({ id: day.recordId, playerName: uniquePlayers.find(p => p.id === selectedAthleteId)?.name || 'Athlete', date: day.date }); }}
                                                    className="p-1 rounded hover:bg-rose-50 dark:hover:bg-[#1A2D48] text-slate-300 dark:text-[#475569] hover:text-rose-500 transition-colors"
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
                    <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-5 space-y-3">
                        <h4 className="text-xs font-semibold text-slate-900 dark:text-[#E2E8F0] uppercase tracking-wide">Risk Analysis</h4>
                        {reasons.map((reason, idx) => {
                            const sev = reason.severity === 'critical' ? { bg: 'bg-rose-50 dark:bg-rose-900/20', border: 'border-rose-200 dark:border-rose-900/50', text: 'text-rose-700 dark:text-rose-400', badge: 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400' }
                                      : reason.severity === 'warning' ? { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800/50', text: 'text-amber-700 dark:text-amber-400', badge: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' }
                                      : { bg: 'bg-sky-50 dark:bg-sky-900/20', border: 'border-sky-200 dark:border-sky-900/50', text: 'text-sky-700 dark:text-sky-400', badge: 'bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400' };
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
                <button onClick={() => setAcwrView('roster')} className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-[#CBD5E1] hover:text-slate-900 dark:hover:text-[#E2E8F0] transition-colors">
                    <ArrowLeftIcon size={14} /> Back to Roster
                </button>

                {/* Team ACWR chart with date range picker */}
                <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-100 dark:border-[#1A2D48] flex flex-wrap items-center gap-3 justify-between">
                        <h4 className="text-xs font-semibold text-slate-900 dark:text-[#E2E8F0] uppercase tracking-wide">Team ACWR — Custom Range</h4>
                        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-[#CBD5E1]">
                            <span className="text-slate-400 dark:text-[#CBD5E1]">From</span>
                            <input
                                type="date" value={historyChartFrom}
                                onChange={e => setHistoryChartFrom(e.target.value)}
                                className="border border-slate-200 dark:border-[#243A58] rounded-lg px-2 py-1 text-xs text-slate-700 dark:text-[#E2E8F0] outline-none focus:border-indigo-400"
                            />
                            <span className="text-slate-400 dark:text-[#CBD5E1]">to</span>
                            <input
                                type="date" value={historyChartTo}
                                onChange={e => setHistoryChartTo(e.target.value)}
                                className="border border-slate-200 dark:border-[#243A58] rounded-lg px-2 py-1 text-xs text-slate-700 dark:text-[#E2E8F0] outline-none focus:border-indigo-400"
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
                        <div className="p-10 text-center text-sm text-slate-400 dark:text-[#CBD5E1]">No team ACWR data in selected range.</div>
                    )}
                </div>

                {/* Weekly load table */}
                <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm overflow-hidden">
                    {/* Week nav header */}
                    <div className="px-5 py-3 border-b border-slate-100 dark:border-[#1A2D48] flex flex-wrap items-center gap-3 justify-between">
                        <div className="flex items-center gap-2">
                            <button onClick={goWeekBack} className="p-1.5 rounded-lg border border-slate-200 dark:border-[#243A58] hover:bg-slate-50 dark:hover:bg-[#1A2D48] text-slate-500 dark:text-[#CBD5E1] transition-colors">
                                <ChevronLeftIcon size={14} />
                            </button>
                            <span className="text-xs font-semibold text-slate-700 dark:text-[#E2E8F0] min-w-[160px] text-center">
                                {fmtShort(weekDays[0])} — {fmtShort(weekDays[6])}
                            </span>
                            <button onClick={goWeekForward} className="p-1.5 rounded-lg border border-slate-200 dark:border-[#243A58] hover:bg-slate-50 dark:hover:bg-[#1A2D48] text-slate-500 dark:text-[#CBD5E1] transition-colors">
                                <ChevronRightIcon size={14} />
                            </button>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-[#CBD5E1]">
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
                                className="border border-slate-200 dark:border-[#243A58] rounded-lg px-2 py-1 text-xs text-slate-700 dark:text-[#E2E8F0] outline-none focus:border-indigo-400"
                            />
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-slate-400 dark:text-[#CBD5E1] ml-auto">
                            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-emerald-100 dark:bg-emerald-900/35" /> Low</span>
                            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-emerald-300" /> Medium</span>
                            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-amber-300" /> High</span>
                            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-rose-300" /> Peak</span>
                            <button
                                onClick={() => { setEditMode(m => !m); setDeleteConfirm(null); }}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-colors ${editMode ? 'bg-amber-100 text-amber-700 dark:text-amber-400 border-amber-300' : 'bg-slate-100 dark:bg-[#1A2D48] text-slate-500 dark:text-[#CBD5E1] border-slate-200 dark:border-[#243A58] hover:bg-slate-200'}`}
                            >
                                {editMode ? <><CheckIcon size={10} /> Done</> : <><PencilIcon size={10} /> Edit</>}
                            </button>
                        </div>
                    </div>

                    {/* Edit mode banner */}
                    {editMode && (
                        <div className="px-5 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800/50 text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                            Edit mode — click 🗑 on any cell to delete that day's record. Two-step confirmation required.
                        </div>
                    )}
                    {/* Column headers */}
                    <div className="overflow-x-auto">
                        <table className={`w-full text-xs ${editMode ? 'min-w-[800px]' : 'min-w-[720px]'}`}>
                            <thead>
                                <tr className={`border-b ${editMode ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800/40' : 'bg-slate-50 dark:bg-[#0F1C30] border-slate-100 dark:border-[#1A2D48]'}`}>
                                    <th className="text-left px-4 py-2.5 font-semibold text-slate-500 dark:text-[#CBD5E1] w-36">Athlete</th>
                                    {weekDays.map(d => (
                                        <th key={d} className="text-center px-1 py-2.5 font-medium text-slate-400 dark:text-[#CBD5E1] w-20">
                                            <div>{new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short' })}</div>
                                            <div className="text-[10px] text-slate-300 dark:text-[#475569]">{new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
                                        </th>
                                    ))}
                                    <th className="text-center px-2 py-2.5 font-semibold text-slate-500 dark:text-[#CBD5E1] w-16">Total</th>
                                    <th className="text-center px-2 py-2.5 font-semibold text-slate-500 dark:text-[#CBD5E1] w-16">ACWR</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {uniquePlayers.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="px-4 py-8 text-center text-slate-400 dark:text-[#CBD5E1] text-sm">No athletes in this team.</td>
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
                                            className="hover:bg-slate-50 dark:hover:bg-[#1A2D48] cursor-pointer transition-colors"
                                            onClick={() => { setSelectedAthleteId(player.id); setAcwrView('athlete'); }}
                                        >
                                            <td className="px-4 py-2">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                                        playerRoster?.excluded ? 'bg-indigo-100 dark:bg-indigo-600 text-indigo-600'
                                                        : weekAcwr > 1.5 ? 'bg-rose-100 text-rose-700'
                                                        : weekAcwr > 1.3 ? 'bg-amber-100 text-amber-700'
                                                        : weekAcwr > 0 ? 'bg-emerald-100 dark:bg-emerald-900/35 text-emerald-700'
                                                        : 'bg-slate-100 dark:bg-[#1A2D48] text-slate-500 dark:text-[#CBD5E1]'
                                                    }`}>{getInitials(player.name)}</div>
                                                    <span className="font-medium text-slate-800 dark:text-[#E2E8F0] text-xs truncate max-w-[90px]">{player.name}</span>
                                                </div>
                                            </td>
                                            {dayLoads.map((load, i) => {
                                                const v = load?.value ?? null;
                                                const intensity = (v || 0) / weekMaxLoad;
                                                const bg = v === null ? '' :
                                                    load?.isRest ? 'bg-slate-100 dark:bg-[#1A2D48] text-slate-400 dark:text-[#CBD5E1]' :
                                                    intensity > 0.8 ? 'bg-rose-200 text-rose-800' :
                                                    intensity > 0.6 ? 'bg-amber-200 text-amber-800' :
                                                    intensity > 0.3 ? 'bg-emerald-200 text-emerald-800' :
                                                    'bg-emerald-100 dark:bg-emerald-900/35 text-emerald-700';
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
                                                <span className="font-bold text-slate-700 dark:text-[#E2E8F0] text-xs">{weekTotal > 0 ? weekTotal : '—'}</span>
                                                {weekTotal > 0 && <div className="text-[9px] text-slate-400 dark:text-[#CBD5E1]">{metricUnit}</div>}
                                            </td>
                                            <td className="px-2 py-2 text-center">
                                                {acwrStatus ? (
                                                    <>
                                                        <div className={`font-bold text-xs ${acwrStatus.color}`}>{weekAcwr.toFixed(2)}</div>
                                                        <div className={`text-[9px] ${acwrStatus.color}`}>{acwrStatus.label}</div>
                                                    </>
                                                ) : (
                                                    <span className="text-slate-300 dark:text-[#475569] text-xs">—</span>
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

    // SVG Donut for ACWR distribution
    const ACWRDonut = () => {
        const R = 42; const cx = 56; const cy = 56; const stroke = 14;
        const circ = 2 * Math.PI * R;
        const { highRisk, elevated, optimal, underloaded, total } = distributionCounts;
        const segments = [
            { count: highRisk, color: '#f87171' },
            { count: elevated, color: '#fbbf24' },
            { count: optimal, color: '#34d399' },
            { count: underloaded, color: '#38bdf8' },
        ];
        let offset = 0;
        const arcs = segments.map(seg => {
            const frac = total > 0 ? seg.count / total : 0;
            const dash = frac * circ;
            const arc = { dash, offset, color: seg.color };
            offset += dash;
            return arc;
        });
        return (
            <svg width="112" height="112" viewBox="0 0 112 112">
                <circle cx={cx} cy={cy} r={R} fill="none" stroke="#e2e8f0" strokeWidth={stroke} className="dark:stroke-[#243A58]" />
                {total === 0 ? (
                    <circle cx={cx} cy={cy} r={R} fill="none" stroke="#e2e8f0" strokeWidth={stroke} className="dark:stroke-[#243A58]" />
                ) : arcs.map((arc, i) => arc.dash > 0 && (
                    <circle key={i} cx={cx} cy={cy} r={R} fill="none"
                        stroke={arc.color} strokeWidth={stroke}
                        strokeDasharray={`${arc.dash} ${circ - arc.dash}`}
                        strokeDashoffset={-arc.offset + circ / 4}
                        strokeLinecap="butt"
                        style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px` }}
                    />
                ))}
                <text x={cx} y={cy - 4} textAnchor="middle" className="fill-slate-900 dark:fill-[#E2E8F0]" style={{ fontSize: 18, fontWeight: 700, fill: 'currentColor' }}>{total}</text>
                <text x={cx} y={cy + 12} textAnchor="middle" style={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active</text>
            </svg>
        );
    };

    // ── Report Modal ───────────────────────────────────────────────────
    const ReportModal = () => {
        if (!reportOpen) return null;
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - reportPeriodDays);
        const cutoffStr = cutoff.toISOString().split('T')[0];
        const todayStr = new Date().toISOString().split('T')[0];

        const atRisk = rosterData.filter(p => !p.excluded && p.ratio > 1.0);
        const underloaded = rosterData.filter(p => !p.excluded && p.ratio > 0 && p.ratio < 0.70);

        return (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-8 px-4" onClick={() => setReportOpen(null)}>
                <div className="bg-white dark:bg-[#132338] rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-slate-200 dark:border-[#243A58] flex items-center justify-between shrink-0">
                        <div>
                            <h2 className="text-base font-bold text-slate-900 dark:text-[#E2E8F0]">
                                {reportOpen === 'squad_summary' ? 'Squad Load Summary' : reportOpen === 'at_risk' ? 'At-Risk Athletes' : 'Risk Report'}
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-[#CBD5E1] mt-0.5">{selectedTeam?.name || 'Team'} · Last {reportPeriodDays} days</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex gap-1 bg-slate-100 dark:bg-[#1A2D48] rounded-lg p-0.5">
                                {([7, 14, 28, 90] as const).map(d => (
                                    <button key={d} onClick={() => setReportPeriodDays(d)}
                                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${reportPeriodDays === d ? 'bg-white dark:bg-[#132338] text-slate-900 dark:text-[#E2E8F0] shadow-sm' : 'text-slate-500 dark:text-[#CBD5E1]'}`}>
                                        {d}D
                                    </button>
                                ))}
                            </div>
                            <button onClick={() => setReportOpen(null)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1A2D48] text-slate-400 dark:text-[#CBD5E1] transition-colors">✕</button>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="overflow-y-auto flex-1 p-6 space-y-4">
                        {reportOpen === 'squad_summary' && (
                            <>
                                {/* Team ACWR trend in period */}
                                {teamTrendline && teamTrendline.ratioHistory?.length > 2 && (() => {
                                    const allDates = teamTrendline.dates || [];
                                    const indices = allDates.map((d: string, i: number) => i).filter((i: number) => allDates[i] >= cutoffStr && allDates[i] <= todayStr);
                                    if (indices.length < 2) return null;
                                    const s = indices[0], e = indices[indices.length - 1] + 1;
                                    return (
                                        <ACWRLineChart
                                            dates={allDates.slice(s, e)}
                                            ratioHistory={(teamTrendline.ratioHistory || []).slice(s, e)}
                                            acuteHistory={(teamTrendline.acuteHistory || []).slice(s, e)}
                                            chronicHistory={(teamTrendline.chronicHistory || []).slice(s, e)}
                                            phases={(teamTrendline.phases || []).slice(s, e)}
                                            restDays={teamTrendline.restDays}
                                            height={160}
                                            title={`Team Average ACWR — Last ${reportPeriodDays} days`}
                                        />
                                    );
                                })()}
                                {/* Per-athlete summary table */}
                                <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] overflow-hidden">
                                    <table className="w-full text-xs">
                                        <thead className="bg-slate-50 dark:bg-[#0F1C30] border-b border-slate-100 dark:border-[#1A2D48]">
                                            <tr>
                                                <th className="text-left px-4 py-2.5 font-semibold text-slate-500 dark:text-[#CBD5E1]">Athlete</th>
                                                <th className="text-center px-3 py-2.5 font-semibold text-slate-500 dark:text-[#CBD5E1]">ACWR</th>
                                                <th className="text-center px-3 py-2.5 font-semibold text-slate-500 dark:text-[#CBD5E1]">Acute (AU)</th>
                                                <th className="text-center px-3 py-2.5 font-semibold text-slate-500 dark:text-[#CBD5E1]">Chronic (AU)</th>
                                                <th className="text-center px-3 py-2.5 font-semibold text-slate-500 dark:text-[#CBD5E1]">Monotony</th>
                                                <th className="text-center px-3 py-2.5 font-semibold text-slate-500 dark:text-[#CBD5E1]">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 dark:divide-[#1A2D48]">
                                            {rosterData.filter(p => !p.excluded).map(p => (
                                                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-[#1A2D48]">
                                                    <td className="px-4 py-2.5">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold ${p.ratio > 1.30 ? 'bg-rose-100 text-rose-700' : p.ratio > 1.00 ? 'bg-amber-100 text-amber-700' : p.ratio >= 0.70 ? 'bg-emerald-100 text-emerald-700' : p.ratio > 0 ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 dark:bg-[#243A58] text-slate-500 dark:text-[#CBD5E1]'}`}>{getInitials(p.name)}</div>
                                                            <span className="font-medium text-slate-800 dark:text-[#E2E8F0]">{p.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className={`px-3 py-2.5 text-center font-bold ${p.status.color}`}>{p.ratio > 0 ? p.ratio.toFixed(2) : '—'}</td>
                                                    <td className="px-3 py-2.5 text-center text-slate-700 dark:text-[#E2E8F0]">{p.acute > 0 ? `${Math.round(p.acute)} ${loadUnit}` : '—'}</td>
                                                    <td className="px-3 py-2.5 text-center text-slate-700 dark:text-[#E2E8F0]">{p.chronic > 0 ? `${Math.round(p.chronic)} ${loadUnit}` : '—'}</td>
                                                    <td className="px-3 py-2.5 text-center text-slate-600 dark:text-[#CBD5E1]">{p.monotony > 0 ? p.monotony : '—'}</td>
                                                    <td className="px-3 py-2.5 text-center">
                                                        {p.ratio > 0 ? <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${p.status.bg} ${p.status.color}`}>{p.status.label}</span> : <span className="text-slate-300 dark:text-[#475569]">—</span>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}

                        {(reportOpen === 'at_risk' || reportOpen === 'risk_report') && (
                            <>
                                {atRisk.length === 0 && (reportOpen === 'at_risk') && (
                                    <div className="text-center py-8 text-sm text-slate-400 dark:text-[#CBD5E1]">No athletes currently at risk (ACWR &gt; 1.00).</div>
                                )}
                                {atRisk.length > 0 && (
                                    <div className="space-y-2">
                                        <h3 className="text-xs font-semibold text-rose-500 uppercase tracking-wide">At Risk (ACWR &gt; 1.00) — {atRisk.length} athletes</h3>
                                        <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] overflow-hidden">
                                            <table className="w-full text-xs">
                                                <thead className="bg-rose-50 dark:bg-rose-900/20 border-b border-rose-100 dark:border-rose-800/40">
                                                    <tr>
                                                        <th className="text-left px-4 py-2.5 font-semibold text-rose-600">Athlete</th>
                                                        <th className="text-center px-3 py-2.5 font-semibold text-rose-600">ACWR</th>
                                                        <th className="text-center px-3 py-2.5 font-semibold text-rose-600">Acute AU</th>
                                                        <th className="text-center px-3 py-2.5 font-semibold text-rose-600">Chronic AU</th>
                                                        <th className="text-center px-3 py-2.5 font-semibold text-rose-600">Strain</th>
                                                        <th className="text-left px-3 py-2.5 font-semibold text-rose-600">Recommendation</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50 dark:divide-[#1A2D48]">
                                                    {atRisk.map(p => (
                                                        <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-[#1A2D48]">
                                                            <td className="px-4 py-2.5">
                                                                <div className="flex items-center gap-2">
                                                                    <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold ${p.ratio > 1.30 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>{getInitials(p.name)}</div>
                                                                    <span className="font-medium text-slate-800 dark:text-[#E2E8F0]">{p.name}</span>
                                                                </div>
                                                            </td>
                                                            <td className={`px-3 py-2.5 text-center font-bold ${p.status.color}`}>{p.ratio.toFixed(2)}</td>
                                                            <td className="px-3 py-2.5 text-center text-slate-700 dark:text-[#E2E8F0]">{Math.round(p.acute)} {loadUnit}</td>
                                                            <td className="px-3 py-2.5 text-center text-slate-700 dark:text-[#E2E8F0]">{Math.round(p.chronic)} {loadUnit}</td>
                                                            <td className="px-3 py-2.5 text-center text-slate-600 dark:text-[#CBD5E1]">{p.strain || '—'}</td>
                                                            <td className="px-3 py-2.5 text-slate-600 dark:text-[#CBD5E1]">{p.ratio > 1.30 ? 'Reduce volume 30–50%, prioritise recovery' : 'Monitor closely, reduce high-intensity sessions'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                                {reportOpen === 'risk_report' && underloaded.length > 0 && (
                                    <div className="space-y-2 mt-4">
                                        <h3 className="text-xs font-semibold text-sky-500 uppercase tracking-wide">Underloaded (ACWR &lt; 0.70) — {underloaded.length} athletes</h3>
                                        <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] overflow-hidden">
                                            <table className="w-full text-xs">
                                                <thead className="bg-sky-50 dark:bg-sky-900/20 border-b border-sky-100 dark:border-sky-900/40">
                                                    <tr>
                                                        <th className="text-left px-4 py-2.5 font-semibold text-sky-600">Athlete</th>
                                                        <th className="text-center px-3 py-2.5 font-semibold text-sky-600">ACWR</th>
                                                        <th className="text-center px-3 py-2.5 font-semibold text-sky-600">Acute AU</th>
                                                        <th className="text-center px-3 py-2.5 font-semibold text-sky-600">Chronic AU</th>
                                                        <th className="text-left px-3 py-2.5 font-semibold text-sky-600">Recommendation</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50 dark:divide-[#1A2D48]">
                                                    {underloaded.map(p => (
                                                        <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-[#1A2D48]">
                                                            <td className="px-4 py-2.5">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-6 h-6 rounded-md bg-sky-100 text-sky-700 flex items-center justify-center text-[9px] font-bold">{getInitials(p.name)}</div>
                                                                    <span className="font-medium text-slate-800 dark:text-[#E2E8F0]">{p.name}</span>
                                                                </div>
                                                            </td>
                                                            <td className={`px-3 py-2.5 text-center font-bold ${p.status.color}`}>{p.ratio.toFixed(2)}</td>
                                                            <td className="px-3 py-2.5 text-center text-slate-700 dark:text-[#E2E8F0]">{Math.round(p.acute)} {loadUnit}</td>
                                                            <td className="px-3 py-2.5 text-center text-slate-700 dark:text-[#E2E8F0]">{Math.round(p.chronic)} {loadUnit}</td>
                                                            <td className="px-3 py-2.5 text-slate-600 dark:text-[#CBD5E1]">Gradually increase weekly volume toward optimal zone (0.70–1.00)</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // ── Full Table View ────────────────────────────────────────────────
    if (acwrView === 'full_table') {
        return (
            <>
            <div className="space-y-4 animate-in fade-in duration-200">
                <button onClick={() => setAcwrView('roster')} className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-[#CBD5E1] hover:text-slate-900 dark:hover:text-[#E2E8F0] transition-colors">
                    <ArrowLeftIcon size={14} /> Back to Overview
                </button>
                <h3 className="text-sm font-bold text-slate-900 dark:text-[#E2E8F0]">Full Squad ACWR Table — {selectedTeam?.name || 'Team'}{isHistoricalView ? ` · Snapshot: ${viewDate}` : ''}</h3>

                {/* Top two cards: distribution + trend */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-5">
                        <h4 className="text-xs font-semibold text-slate-900 dark:text-[#E2E8F0] uppercase tracking-wide mb-4">ACWR Distribution</h4>
                        <div className="flex items-center gap-6">
                            <ACWRDonut />
                            <div className="flex-1 space-y-2">
                                {[
                                    { label: 'High Risk', count: distributionCounts.highRisk, range: '> 1.30', color: 'bg-rose-400', text: 'text-rose-600' },
                                    { label: 'Elevated', count: distributionCounts.elevated, range: '1.00–1.30', color: 'bg-amber-400', text: 'text-amber-600' },
                                    { label: 'Optimal', count: distributionCounts.optimal, range: '0.70–1.00', color: 'bg-emerald-400', text: 'text-emerald-600' },
                                    { label: 'Underloaded', count: distributionCounts.underloaded, range: '< 0.70', color: 'bg-sky-400', text: 'text-sky-600' },
                                ].map(z => (
                                    <div key={z.label} className="flex items-center gap-2">
                                        <div className={`w-2.5 h-2.5 rounded-full ${z.color}`} />
                                        <span className="text-xs text-slate-600 dark:text-[#CBD5E1] flex-1">{z.label}</span>
                                        <span className="text-[10px] text-slate-400 dark:text-[#CBD5E1]">{z.range}</span>
                                        <span className={`text-sm font-bold ${z.text} w-6 text-right`}>{z.count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    {teamTrendline && teamTrendline.ratioHistory?.length > 2 ? (
                        <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm overflow-hidden">
                            <div className="px-4 py-2.5 border-b border-slate-100 dark:border-[#1A2D48] flex items-center justify-between">
                                <h4 className="text-xs font-semibold text-slate-900 dark:text-[#E2E8F0] uppercase tracking-wide">ACWR Trend — Team Average</h4>
                                <div className={`text-sm font-bold ${ACWR_UTILS.getRatioStatus(teamTrendline.ratio).color}`}>{teamTrendline.ratio.toFixed(2)}</div>
                            </div>
                            <ACWRLineChart
                                dates={(teamTrendline.dates || []).slice(-28)}
                                ratioHistory={(teamTrendline.ratioHistory || []).slice(-28)}
                                acuteHistory={(teamTrendline.acuteHistory || []).slice(-28)}
                                chronicHistory={(teamTrendline.chronicHistory || []).slice(-28)}
                                phases={(teamTrendline.phases || []).slice(-28)}
                                restDays={teamTrendline.restDays}
                                height={170}
                                title=""
                            />
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-8 text-center text-sm text-slate-400 dark:text-[#CBD5E1]">No trend data yet.</div>
                    )}
                </div>

                {/* Full scrollable athlete table */}
                <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs min-w-[900px]">
                            <thead className="bg-slate-50 dark:bg-[#0F1C30] border-b border-slate-100 dark:border-[#1A2D48] sticky top-0">
                                <tr>
                                    <th className="text-left px-4 py-3 font-semibold text-slate-500 dark:text-[#CBD5E1] w-40">Athlete</th>
                                    <th className="text-left px-3 py-3 font-semibold text-slate-500 dark:text-[#CBD5E1] w-16">Pos</th>
                                    <th className="text-center px-3 py-3 font-semibold text-slate-500 dark:text-[#CBD5E1] w-20">ACWR</th>
                                    <th className="text-center px-3 py-3 font-semibold text-slate-500 dark:text-[#CBD5E1] w-24">Status</th>
                                    <th className="text-center px-3 py-3 font-semibold text-slate-500 dark:text-[#CBD5E1] w-24">Trend (4d)</th>
                                    <th className="text-center px-3 py-3 font-semibold text-slate-500 dark:text-[#CBD5E1] w-28">Chronic (28D)</th>
                                    <th className="text-center px-3 py-3 font-semibold text-slate-500 dark:text-[#CBD5E1] w-28">Acute (7D)</th>
                                    <th className="text-center px-3 py-3 font-semibold text-slate-500 dark:text-[#CBD5E1] w-28">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-[#1A2D48]">
                                {rosterData.map(player => (
                                    <tr key={player.id}
                                        className="hover:bg-slate-50 dark:hover:bg-[#1A2D48] cursor-pointer transition-colors"
                                        onClick={() => { setSelectedAthleteId(player.id); setAcwrView('athlete'); }}
                                    >
                                        <td className="px-4 py-2.5">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 ${player.excluded ? 'bg-indigo-100 dark:bg-indigo-600 text-indigo-600' : player.ratio > 1.30 ? 'bg-rose-100 text-rose-700' : player.ratio > 1.00 ? 'bg-amber-100 text-amber-700' : player.ratio >= 0.70 ? 'bg-emerald-100 dark:bg-emerald-900/35 text-emerald-700' : player.ratio > 0 ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 dark:bg-[#1A2D48] text-slate-500 dark:text-[#CBD5E1]'}`}>{getInitials(player.name)}</div>
                                                <span className="font-medium text-slate-800 dark:text-[#E2E8F0] truncate max-w-[90px]">{player.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-3 py-2.5 text-slate-500 dark:text-[#CBD5E1]">{player.position || '—'}</td>
                                        <td className={`px-3 py-2.5 text-center font-bold ${player.status.color}`}>
                                            {player.excluded ? '—' : player.ratio > 0 ? player.ratio.toFixed(2) : '—'}
                                        </td>
                                        <td className="px-3 py-2.5 text-center">
                                            {player.ratio > 0 && !player.excluded ? (
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${player.status.bg} ${player.status.color}`}>{player.status.label}</span>
                                            ) : <span className="text-slate-300 dark:text-[#475569] text-[10px]">{player.excluded ? (player.exclusion?.excludeType === 'injured' ? 'Injured' : 'Excluded') : '—'}</span>}
                                        </td>
                                        <td className="px-3 py-2.5"><MiniBars athleteId={player.id} /></td>
                                        <td className="px-3 py-2.5 text-center text-slate-700 dark:text-[#E2E8F0]">{player.chronic > 0 ? `${Math.round(player.chronic)} ${loadUnit}` : '—'}</td>
                                        <td className="px-3 py-2.5 text-center text-slate-700 dark:text-[#E2E8F0]">{player.acute > 0 ? `${Math.round(player.acute)} ${loadUnit}` : '—'}</td>
                                        <td className="px-3 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                                            <div className="flex items-center justify-center gap-1">
                                                {player.excluded ? (
                                                    <>
                                                        <button title="Return from Injury — resets ACWR to gathering phase" onClick={() => handleExclude(player.id, 'return', player.name)} className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 transition-colors">
                                                            <RotateCcwIcon size={10} /> Return
                                                        </button>
                                                        <button title="Remove exclusion entirely" onClick={() => handleExclude(player.id, 'remove', player.name)} className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#243A58] transition-colors">
                                                            <XCircleIcon size={13} />
                                                        </button>
                                                    </>
                                                ) : player.returning ? (
                                                    <>
                                                        <span className="text-[9px] font-medium text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 px-1.5 py-0.5 rounded-full">↩ Returning</span>
                                                        <button title="Clear return status" onClick={() => handleExclude(player.id, 'remove', player.name)} className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#243A58] transition-colors">
                                                            <XCircleIcon size={13} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button title="Mark as Injured — freezes EWMA" onClick={() => handleExclude(player.id, 'injured', player.name)} className="p-1 rounded-md text-slate-300 dark:text-[#475569] hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-[#1A2D48] transition-colors opacity-0 group-hover:opacity-100">
                                                            <AlertTriangleIcon size={13} />
                                                        </button>
                                                        <button title="Non-injury exclusion (travel, suspension)" onClick={() => handleExclude(player.id, 'non_injury', player.name)} className="p-1 rounded-md text-slate-300 dark:text-[#475569] hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors opacity-0 group-hover:opacity-100">
                                                            <XCircleIcon size={13} />
                                                        </button>
                                                        <button title="Open Intervention plan" onClick={() => { setInterventionAthlete(player); setIsInterventionOpen(true); }} className="p-1 rounded-md text-slate-300 dark:text-[#475569] hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors opacity-0 group-hover:opacity-100">
                                                            <ActivityIcon size={13} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            <ReportModal />
            </>
        );
    }

    return (
        <div className="space-y-4 animate-in fade-in duration-200">
            {/* Loading state */}
            {isLoading && (
                <div className="bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-xl p-8 text-center">
                    <ActivityIcon size={28} className="mx-auto text-slate-300 dark:text-[#475569] animate-pulse mb-2" />
                    <p className="text-sm text-slate-500 dark:text-[#CBD5E1]">Loading ACWR data...</p>
                </div>
            )}

            {/* No ACWR enabled anywhere (only show after loading completes) */}
            {!isLoading && enabledTeams.length === 0 && enabledPrivateClients.length === 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-6 text-center space-y-2">
                    <ActivityIcon size={28} className="mx-auto text-amber-400" />
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-400">No teams or athletes have ACWR monitoring enabled.</p>
                    <p className="text-xs text-amber-500">Go to Settings → ACWR Monitoring to enable it for your teams.</p>
                </div>
            )}

            {/* Controls bar */}
            {(enabledTeams.length > 0 || enabledPrivateClients.length > 0) && (
                <>
                    <div data-tour="acwr-controls" className="flex flex-wrap items-center gap-3">
                        <div data-tour="acwr-team-selector">
                            <CustomSelect
                                value={selectedTeamId}
                                onChange={e => setSelectedTeamId(e.target.value)}
                                variant="filter"
                                size="sm"
                                prefixIcon={<UsersIcon size={14} />}
                            >
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
                            </CustomSelect>
                        </div>
                        <div className="flex-1" />
                        <button onClick={() => setAcwrView('history')} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] hover:border-indigo-300 text-slate-700 dark:text-[#E2E8F0] text-sm font-medium rounded-xl transition-colors shadow-sm">
                            <TableIcon size={14} /> Load History
                        </button>
                        <button data-tour="acwr-log-button" onClick={() => setAcwrView('log')} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors shadow-sm">
                            <PlusIcon size={14} /> Log Training Load
                        </button>
                        <div className="flex items-center gap-2 bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-xl shadow-sm px-3 py-1.5">
                            <label className="text-[10px] font-semibold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide whitespace-nowrap">Import Date</label>
                            <input
                                type="date"
                                value={acwrImportDateOverride}
                                onChange={e => setAcwrImportDateOverride(e.target.value)}
                                className="text-xs text-slate-700 dark:text-[#E2E8F0] border-none outline-none bg-transparent cursor-pointer"
                                title="Override date for all imported rows (leave blank to use dates from CSV)"
                            />
                        </div>
                        <button data-tour="acwr-csv-import" onClick={() => csvRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] hover:border-indigo-300 text-slate-700 dark:text-[#E2E8F0] text-sm font-medium rounded-xl transition-colors shadow-sm">
                            <UploadIcon size={14} /> Import CSV
                        </button>
                        <input ref={csvRef} type="file" accept=".csv" className="hidden" onChange={handleCsvFileSelect} />
                    </div>

                    {/* ── 6 Summary Cards ── */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        {/* Team ACWR */}
                        <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm px-4 py-3 flex flex-col gap-1">
                            <div className="text-[10px] font-semibold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide">Team ACWR</div>
                            {teamTrendline && teamTrendline.ratio > 0 ? (
                                <>
                                    <div className={`text-2xl font-bold ${ACWR_UTILS.getRatioStatus(teamTrendline.ratio).color}`}>{teamTrendline.ratio.toFixed(2)}</div>
                                    <div className={`text-[10px] font-semibold ${ACWR_UTILS.getRatioStatus(teamTrendline.ratio).color}`}>{ACWR_UTILS.getRatioStatus(teamTrendline.ratio).label}</div>
                                </>
                            ) : (
                                <div className="text-2xl font-bold text-slate-300 dark:text-[#475569]">—</div>
                            )}
                        </div>
                        {/* Chronic Load */}
                        <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm px-4 py-3 flex flex-col gap-1">
                            <div className="text-[10px] font-semibold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide">Chronic Load</div>
                            <div className="text-2xl font-bold text-slate-900 dark:text-[#E2E8F0]">{teamTrendline && teamTrendline.chronic > 0 ? Math.round(teamTrendline.chronic) : '—'}</div>
                            {teamTrendline && teamTrendline.chronic > 0 && <div className="text-[10px] text-slate-400 dark:text-[#CBD5E1]">AU (28d EWMA)</div>}
                        </div>
                        {/* Acute Load */}
                        <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm px-4 py-3 flex flex-col gap-1">
                            <div className="text-[10px] font-semibold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide">Acute Load</div>
                            <div className="text-2xl font-bold text-slate-900 dark:text-[#E2E8F0]">{teamTrendline && teamTrendline.acute > 0 ? Math.round(teamTrendline.acute) : '—'}</div>
                            {teamTrendline && teamTrendline.acute > 0 && <div className="text-[10px] text-slate-400 dark:text-[#CBD5E1]">AU (7d EWMA)</div>}
                        </div>
                        {/* At Risk */}
                        <div className={`rounded-xl border shadow-sm px-4 py-3 flex flex-col gap-1 ${distributionCounts.highRisk > 0 ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800/50' : 'bg-white dark:bg-[#132338] border-slate-200 dark:border-[#243A58]'}`}>
                            <div className={`text-[10px] font-semibold uppercase tracking-wide ${distributionCounts.highRisk > 0 ? 'text-rose-400' : 'text-slate-400 dark:text-[#CBD5E1]'}`}>At Risk</div>
                            <div className={`text-2xl font-bold ${distributionCounts.highRisk > 0 ? 'text-rose-600' : 'text-slate-400 dark:text-[#CBD5E1]'}`}>{distributionCounts.highRisk + distributionCounts.elevated}</div>
                            <div className="text-[10px] text-slate-400 dark:text-[#CBD5E1]">ACWR &gt; 1.00</div>
                        </div>
                        {/* Underloaded */}
                        <div className={`rounded-xl border shadow-sm px-4 py-3 flex flex-col gap-1 ${distributionCounts.underloaded > 0 ? 'bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-900/50' : 'bg-white dark:bg-[#132338] border-slate-200 dark:border-[#243A58]'}`}>
                            <div className={`text-[10px] font-semibold uppercase tracking-wide ${distributionCounts.underloaded > 0 ? 'text-sky-500' : 'text-slate-400 dark:text-[#CBD5E1]'}`}>Underloaded</div>
                            <div className={`text-2xl font-bold ${distributionCounts.underloaded > 0 ? 'text-sky-600' : 'text-slate-400 dark:text-[#CBD5E1]'}`}>{distributionCounts.underloaded}</div>
                            <div className="text-[10px] text-slate-400 dark:text-[#CBD5E1]">ACWR &lt; 0.70</div>
                        </div>
                        {/* Data Compliance */}
                        <div className={`rounded-xl border shadow-sm px-4 py-3 flex flex-col gap-1 ${dataCompliance < 70 ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50' : 'bg-white dark:bg-[#132338] border-slate-200 dark:border-[#243A58]'}`}>
                            <div className={`text-[10px] font-semibold uppercase tracking-wide ${dataCompliance < 70 ? 'text-amber-500' : 'text-slate-400 dark:text-[#CBD5E1]'}`}>Data Compliance</div>
                            <div className={`text-2xl font-bold ${dataCompliance < 70 ? 'text-amber-600' : 'text-emerald-600'}`}>{dataCompliance}%</div>
                            <div className="text-[10px] text-slate-400 dark:text-[#CBD5E1]">Logged last 7d</div>
                        </div>
                    </div>

                    {/* Gap warning banner — hidden when viewing historical snapshots */}
                    {!isHistoricalView && teamTrendline?.gapStatus === 'prompt' && (
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl px-4 py-3 flex items-start gap-3">
                            <AlertTriangleIcon size={16} className="text-amber-500 mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-amber-800">No team data for {teamTrendline.gapDays} days — ACWR frozen at last known values.</p>
                                <p className="text-[11px] text-amber-600 mt-0.5">When new data arrives you'll be prompted to reset or continue from here. After 14 days the formula resets automatically.</p>
                            </div>
                        </div>
                    )}
                    {!isHistoricalView && teamTrendline?.gapStatus === 'auto_reset' && (
                        <div className="bg-slate-100 dark:bg-[#1A2D48] border border-slate-300 dark:border-[#243A58] rounded-xl px-4 py-3 flex items-start gap-3">
                            <AlertTriangleIcon size={16} className="text-slate-500 dark:text-[#CBD5E1] mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-slate-700 dark:text-[#E2E8F0]">ACWR reset — no data for {teamTrendline.gapDays} days.</p>
                                <p className="text-[11px] text-slate-500 dark:text-[#CBD5E1] mt-0.5">Formula restarted automatically. Log new training data to begin building ACWR again.</p>
                            </div>
                        </div>
                    )}

                    {/* ── Two-column: Left (table + bottom) + Right sidebar ── */}
                    <div className="flex gap-4 items-start">

                        {/* LEFT — Squad table + bottom section */}
                        <div className="flex-1 min-w-0 space-y-3">

                            {/* Tabs + date picker */}
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="flex gap-1 bg-slate-100 dark:bg-[#1A2D48] rounded-lg p-0.5">
                                    {([['all', 'All Status'], ['at_risk', 'At Risk'], ['underloaded', 'Underloaded'], ['optimal', 'Optimal']] as const).map(([key, label]) => (
                                        <button key={key} onClick={() => setRosterTab(key)}
                                            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${rosterTab === key ? 'bg-white dark:bg-[#132338] text-slate-900 dark:text-[#E2E8F0] shadow-sm' : 'text-slate-500 dark:text-[#CBD5E1] hover:text-slate-700'}`}>
                                            {label}
                                            {key !== 'all' && (
                                                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                                                    key === 'at_risk' ? (distributionCounts.highRisk + distributionCounts.elevated > 0 ? 'bg-rose-100 text-rose-600' : 'bg-slate-200 text-slate-500 dark:bg-[#243A58] dark:text-[#CBD5E1]')
                                                    : key === 'underloaded' ? (distributionCounts.underloaded > 0 ? 'bg-sky-100 text-sky-600' : 'bg-slate-200 text-slate-500 dark:bg-[#243A58] dark:text-[#CBD5E1]')
                                                    : 'bg-emerald-100 text-emerald-600'
                                                }`}>
                                                    {key === 'at_risk' ? distributionCounts.highRisk + distributionCounts.elevated
                                                     : key === 'underloaded' ? distributionCounts.underloaded
                                                     : distributionCounts.optimal}
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                                {/* Date picker — snapshot view */}
                                <div className="ml-auto flex items-center gap-1.5">
                                    {isHistoricalView && (
                                        <button onClick={() => setViewDate(realTodayStr)} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200 transition-colors">
                                            <RotateCcwIcon size={9} /> Today
                                        </button>
                                    )}
                                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${isHistoricalView ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400' : 'bg-white dark:bg-[#132338] border-slate-200 dark:border-[#243A58] text-slate-600 dark:text-[#CBD5E1]'}`}>
                                        <ChevronLeftIcon size={11} className="text-slate-400 cursor-pointer hover:text-slate-700 dark:text-[#CBD5E1]" onClick={() => { const d = new Date(viewDate + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - 1); setViewDate(d.toISOString().split('T')[0]); }} />
                                        <input type="date" value={viewDate} max={realTodayStr}
                                            onChange={e => e.target.value && setViewDate(e.target.value)}
                                            className="bg-transparent border-none outline-none text-xs cursor-pointer w-[88px]" />
                                        <ChevronRightIcon size={11} className={`cursor-pointer transition-colors ${viewDate >= realTodayStr ? 'text-slate-200 dark:text-[#243A58] cursor-not-allowed' : 'text-slate-400 hover:text-slate-700'}`}
                                            onClick={() => { if (viewDate < realTodayStr) { const d = new Date(viewDate + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + 1); setViewDate(d.toISOString().split('T')[0]); } }} />
                                    </div>
                                </div>
                            </div>

                            {/* Squad ACWR table — compact, scrollable */}
                            <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm overflow-hidden">
                                <div className="overflow-x-auto">
                                    <div className="max-h-[420px] overflow-y-auto">
                                    <table className="w-full text-xs min-w-[480px]">
                                        <thead className="bg-slate-50 dark:bg-[#0F1C30] border-b border-slate-100 dark:border-[#1A2D48] sticky top-0 z-10">
                                            <tr>
                                                <th className="text-left px-2 py-2 font-semibold text-slate-500 dark:text-[#CBD5E1] w-24">Athlete</th>
                                                <th className="text-left px-1 py-2 font-semibold text-slate-500 dark:text-[#CBD5E1] w-8">Pos</th>
                                                <th className="text-center px-1 py-2 font-semibold text-slate-500 dark:text-[#CBD5E1] w-12">ACWR</th>
                                                <th className="text-center px-1 py-2 font-semibold text-slate-500 dark:text-[#CBD5E1] w-16">Status</th>
                                                <th className="text-center px-1 py-2 font-semibold text-slate-500 dark:text-[#CBD5E1] w-16">Trend</th>
                                                <th className="text-center px-1 py-2 font-semibold text-slate-500 dark:text-[#CBD5E1] w-16">Chronic</th>
                                                <th className="text-center px-1 py-2 font-semibold text-slate-500 dark:text-[#CBD5E1] w-16">Acute</th>
                                                <th className="text-center px-1 py-2 font-semibold text-slate-500 dark:text-[#CBD5E1] w-24">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 dark:divide-[#1A2D48]">
                                    {filteredRoster.length === 0 ? (
                                        <tr><td colSpan={8} className="px-4 py-8 text-center">
                                            <UsersIcon size={24} className="mx-auto text-slate-300 dark:text-[#475569] mb-2" />
                                            <p className="text-sm text-slate-500 dark:text-[#CBD5E1]">{rosterTab === 'all' ? 'No athletes with ACWR monitoring enabled.' : `No athletes in ${rosterTab.replace('_', ' ')} zone.`}</p>
                                        </td></tr>
                                    ) : (
                                        filteredRoster.map(player => {
                                    const initialsStyle = player.excluded ? 'bg-indigo-100 dark:bg-indigo-600 text-indigo-600'
                                                        : player.ratio > 1.30 ? 'bg-rose-100 text-rose-700'
                                                        : player.ratio > 1.00 ? 'bg-amber-100 text-amber-700'
                                                        : player.ratio >= 0.70 ? 'bg-emerald-100 dark:bg-emerald-900/35 text-emerald-700'
                                                        : player.ratio > 0 ? 'bg-sky-100 text-sky-700'
                                                        : 'bg-slate-200 dark:bg-[#243A58] text-slate-600 dark:text-[#CBD5E1]';
                                    return (
                                        <tr key={player.id}
                                            className="hover:bg-slate-50 dark:hover:bg-[#1A2D48]/70 cursor-pointer transition-colors group"
                                            onClick={() => { setSelectedAthleteId(player.id); setAcwrView('athlete'); }}
                                        >
                                            {/* Athlete */}
                                            <td className="px-2 py-1.5">
                                                <div className="flex items-center gap-1">
                                                    <div className={`relative w-5 h-5 rounded flex items-center justify-center text-[8px] font-bold shrink-0 ${initialsStyle}`}>
                                                        {getInitials(player.name)}
                                                        {player.riskLevel === 'Critical' && <div className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border border-white bg-rose-500" />}
                                                        {player.riskLevel === 'Warning' && <div className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border border-white bg-amber-400" />}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <span className="font-medium text-slate-800 dark:text-[#E2E8F0] group-hover:text-indigo-600 transition-colors truncate max-w-[68px] block text-[11px]">{player.name}</span>
                                                        {!player.excluded && player.noDataDays > 1 && (
                                                            <span className="text-[8px] text-slate-400 dark:text-[#CBD5E1] leading-none">Last: {player.noDataDays}d ago</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            {/* Position */}
                                            <td className="px-1 py-1.5 text-[11px] text-slate-500 dark:text-[#CBD5E1]">{player.position || '—'}</td>
                                            {/* ACWR */}
                                            <td className={`px-1 py-1.5 text-center font-bold ${player.status.color}`}>
                                                {player.excluded ? '—' : player.acwrResult?.gatheringPhase ? '...' : player.ratio > 0 ? player.ratio.toFixed(2) : '—'}
                                            </td>
                                            {/* Status badge */}
                                            <td className="px-1 py-1.5 text-center">
                                                {player.excluded ? (
                                                    <span className="px-1 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 dark:bg-[#1A2D48] text-slate-500 dark:text-[#CBD5E1]">{player.exclusion?.excludeType === 'injured' ? 'Injured' : 'Excluded'}</span>
                                                ) : player.acwrResult?.gatheringPhase ? (
                                                    <span className="px-1 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 dark:bg-[#1A2D48] text-slate-400">Gathering</span>
                                                ) : player.ratio > 0 ? (
                                                    <span className={`px-1 py-0.5 rounded-full text-[9px] font-bold ${player.status.bg} ${player.status.color}`}>{player.status.label}</span>
                                                ) : <span className="text-slate-300 dark:text-[#475569]">—</span>}
                                            </td>
                                            {/* Trend mini bars */}
                                            <td className="px-1 py-1.5"><MiniBars athleteId={player.id} /></td>
                                            {/* Chronic */}
                                            <td className="px-1 py-1.5 text-center text-[11px] text-slate-700 dark:text-[#E2E8F0]">{player.chronic > 0 ? `${Math.round(player.chronic)} ${loadUnit}` : '—'}</td>
                                            {/* Acute */}
                                            <td className="px-1 py-1.5 text-center text-[11px] text-slate-700 dark:text-[#E2E8F0]">{player.acute > 0 ? `${Math.round(player.acute)} ${loadUnit}` : '—'}</td>
                                            {/* Actions — status dropdown pill + action buttons */}
                                            <td className="px-2 py-1.5" onClick={e => e.stopPropagation()}>
                                                <div className="flex items-center justify-center gap-1">
                                                    {/* Status dropdown pill — dropdown rendered via portal to escape overflow containers */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (excludeMenuOpenId === player.id) {
                                                                setExcludeMenuOpenId(null); setExcludeMenuPos(null);
                                                            } else {
                                                                const rect = e.currentTarget.getBoundingClientRect();
                                                                setExcludeMenuPos({ top: rect.bottom + 4, left: rect.left });
                                                                setExcludeMenuOpenId(player.id);
                                                            }
                                                        }}
                                                        className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold border transition-colors cursor-pointer shrink-0 ${
                                                            player.excluded && player.exclusion?.excludeType === 'injured'
                                                                ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/50 hover:bg-rose-200 dark:hover:bg-rose-900/50'
                                                                : player.excluded
                                                                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/50 hover:bg-amber-200 dark:hover:bg-amber-900/50'
                                                                : player.returning
                                                                ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800/50 hover:bg-violet-200 dark:hover:bg-violet-900/50'
                                                                : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
                                                        }`}
                                                    >
                                                        {player.excluded && player.exclusion?.excludeType === 'injured'
                                                            ? '🏥 Injured'
                                                            : player.excluded
                                                            ? '⛔ Excluded'
                                                            : player.returning
                                                            ? '↩ Returning'
                                                            : '● Active'}
                                                        <ChevronDownIcon size={8} className="ml-0.5 opacity-60" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                                        </tbody>
                                    </table>
                                    </div>{/* end scrollable */}
                                </div>{/* end overflow-x */}

                                {/* View full table footer */}
                                <div className="px-4 py-2.5 border-t border-slate-100 dark:border-[#1A2D48] flex justify-end">
                                    <button onClick={() => setAcwrView('full_table')}
                                        className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors">
                                        View full ACWR report <ChevronRightIcon size={12} />
                                    </button>
                                </div>
                            </div>{/* end squad table card */}

                            {/* ── Bottom row: Load Suggestions + Reports side by side ── */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

                                {/* Load Management Suggestions — always 3 fixed categories */}
                                <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm overflow-hidden">
                                    <div className="px-4 py-2.5 border-b border-slate-100 dark:border-[#1A2D48] bg-slate-50/50 dark:bg-[#132338]/40 flex items-center justify-between">
                                        <h4 className="text-xs font-semibold text-slate-900 dark:text-[#E2E8F0] uppercase tracking-wide">Load Management Suggestions</h4>
                                        <button onClick={() => { setRosterTab('all'); }} className="text-[10px] text-indigo-500 hover:text-indigo-700 font-medium">View all recommendations →</button>
                                    </div>
                                    <div className="p-3 space-y-2">
                                        {/* Always-visible: Reduce High Intensity */}
                                        <div className={`rounded-lg border p-3 ${distributionCounts.highRisk > 0 ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800/50' : 'bg-slate-50 dark:bg-[#0F1C30] border-slate-100 dark:border-[#1A2D48]'}`}>
                                            <div className="flex items-start gap-2">
                                                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${distributionCounts.highRisk > 0 ? 'bg-rose-500' : 'bg-slate-300 dark:bg-[#475569]'}`} />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-2 mb-0.5">
                                                        <p className={`text-xs font-semibold ${distributionCounts.highRisk > 0 ? 'text-rose-700 dark:text-rose-400' : 'text-slate-400 dark:text-[#CBD5E1]'}`}>Reduce High Intensity</p>
                                                        {distributionCounts.highRisk > 0 && <button onClick={e => { e.stopPropagation(); setRosterTab('at_risk'); }} className="text-[10px] text-rose-500 hover:text-rose-700 font-medium whitespace-nowrap">View athletes →</button>}
                                                    </div>
                                                    <p className="text-[10px] text-slate-500 dark:text-[#CBD5E1]">
                                                        {distributionCounts.highRisk > 0 ? `Consider reducing sprint volume by 15–20% for ${distributionCounts.highRisk} athlete${distributionCounts.highRisk > 1 ? 's' : ''}.` : 'No athletes currently in High Risk zone.'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Always-visible: Monitor Closely */}
                                        <div className={`rounded-lg border p-3 ${distributionCounts.elevated > 0 ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50' : 'bg-slate-50 dark:bg-[#0F1C30] border-slate-100 dark:border-[#1A2D48]'}`}>
                                            <div className="flex items-start gap-2">
                                                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${distributionCounts.elevated > 0 ? 'bg-amber-500' : 'bg-slate-300 dark:bg-[#475569]'}`} />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-2 mb-0.5">
                                                        <p className={`text-xs font-semibold ${distributionCounts.elevated > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-slate-400 dark:text-[#CBD5E1]'}`}>Monitor Closely</p>
                                                        {distributionCounts.elevated > 0 && <button onClick={e => { e.stopPropagation(); setRosterTab('at_risk'); }} className="text-[10px] text-amber-500 hover:text-amber-700 font-medium whitespace-nowrap">View athletes →</button>}
                                                    </div>
                                                    <p className="text-[10px] text-slate-500 dark:text-[#CBD5E1]">
                                                        {distributionCounts.elevated > 0 ? `${distributionCounts.elevated} athlete${distributionCounts.elevated > 1 ? 's' : ''} in elevated range — monitor response to load.` : 'No athletes in Elevated zone.'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Always-visible: Potential to Increase */}
                                        <div className={`rounded-lg border p-3 ${distributionCounts.underloaded > 0 ? 'bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-900/50' : 'bg-slate-50 dark:bg-[#0F1C30] border-slate-100 dark:border-[#1A2D48]'}`}>
                                            <div className="flex items-start gap-2">
                                                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${distributionCounts.underloaded > 0 ? 'bg-sky-500' : 'bg-slate-300 dark:bg-[#475569]'}`} />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-2 mb-0.5">
                                                        <p className={`text-xs font-semibold ${distributionCounts.underloaded > 0 ? 'text-sky-700 dark:text-sky-400' : 'text-slate-400 dark:text-[#CBD5E1]'}`}>Potential to Increase</p>
                                                        {distributionCounts.underloaded > 0 && <button onClick={e => { e.stopPropagation(); setRosterTab('underloaded'); }} className="text-[10px] text-sky-500 hover:text-sky-700 font-medium whitespace-nowrap">View athletes →</button>}
                                                    </div>
                                                    <p className="text-[10px] text-slate-500 dark:text-[#CBD5E1]">
                                                        {distributionCounts.underloaded > 0 ? `${distributionCounts.underloaded} underloaded athlete${distributionCounts.underloaded > 1 ? 's' : ''} may tolerate increased load.` : 'No athletes currently underloaded.'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Reports */}
                                <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm overflow-hidden">
                                    <div className="px-4 py-2.5 border-b border-slate-100 dark:border-[#1A2D48] bg-slate-50/50 dark:bg-[#132338]/40 flex items-center justify-between">
                                        <h4 className="text-xs font-semibold text-slate-900 dark:text-[#E2E8F0] uppercase tracking-wide">Reporting</h4>
                                        <button onClick={() => setAcwrView('full_table')} className="text-[10px] text-indigo-500 hover:text-indigo-700 font-medium">View all reports →</button>
                                    </div>
                                    <div className="p-3 grid grid-cols-2 gap-2">
                                        {[
                                            { key: 'squad_summary', title: 'Load Summary', desc: 'Team & individual summary', icon: ActivityIcon, color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-500' },
                                            { key: 'at_risk', title: 'ACWR Report', desc: 'Detailed ACWR analysis', icon: TrendingUpIcon, color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-500' },
                                            { key: 'risk_report', title: 'Risk Report', desc: 'At risk & underloaded', icon: AlertTriangleIcon, color: 'bg-rose-100 dark:bg-rose-900/30 text-rose-500' },
                                            { key: null, title: 'Custom Report', desc: 'Build your own report', icon: TableIcon, color: 'bg-slate-100 dark:bg-[#1A2D48] text-slate-400' },
                                        ].map((r, i) => (
                                            <button key={i}
                                                onClick={() => r.key ? setReportOpen(r.key as any) : setAcwrView('full_table')}
                                                className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 dark:border-[#243A58] hover:border-indigo-300 dark:hover:border-indigo-700 bg-slate-50 dark:bg-[#0F1C30] hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-left transition-all group">
                                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${r.color} group-hover:bg-indigo-600 group-hover:text-white transition-all`}>
                                                    <r.icon size={12} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[11px] font-semibold text-slate-800 dark:text-[#E2E8F0] leading-tight">{r.title}</p>
                                                    <p className="text-[9px] text-slate-400 dark:text-[#CBD5E1] leading-tight">{r.desc}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                            </div>{/* end bottom row */}

                        </div>{/* end left column */}

                        {/* RIGHT — Distribution + Trend (wider) */}
                        <div className="w-[460px] shrink-0 space-y-3 hidden lg:block">

                            {/* ACWR Distribution donut */}
                            <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-4">
                                <h4 className="text-xs font-semibold text-slate-900 dark:text-[#E2E8F0] uppercase tracking-wide mb-3">ACWR Distribution</h4>
                                <div className="flex items-center gap-3">
                                    <ACWRDonut />
                                    <div className="flex-1 space-y-1.5">
                                        {[
                                            { label: 'High Risk', count: distributionCounts.highRisk, range: '> 1.30', color: 'bg-rose-400', text: 'text-rose-600' },
                                            { label: 'Elevated', count: distributionCounts.elevated, range: '1.00–1.30', color: 'bg-amber-400', text: 'text-amber-600' },
                                            { label: 'Optimal', count: distributionCounts.optimal, range: '0.70–1.00', color: 'bg-emerald-400', text: 'text-emerald-600' },
                                            { label: 'Underloaded', count: distributionCounts.underloaded, range: '< 0.70', color: 'bg-sky-400', text: 'text-sky-600' },
                                        ].map(z => (
                                            <div key={z.label} className="flex items-center gap-1.5">
                                                <div className={`w-2 h-2 rounded-full shrink-0 ${z.color}`} />
                                                <span className="text-[10px] text-slate-600 dark:text-[#CBD5E1] flex-1 leading-none">{z.label} <span className="text-slate-400 dark:text-[#CBD5E1]">({z.range})</span></span>
                                                <span className={`text-xs font-bold ${z.text}`}>{z.count}</span>
                                            </div>
                                        ))}
                                        {summary.excluded > 0 && (
                                            <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100 dark:border-[#1A2D48]">
                                                <div className="w-2 h-2 rounded-full shrink-0 bg-slate-400" />
                                                <span className="text-[10px] text-slate-500 dark:text-[#CBD5E1] flex-1">Excluded</span>
                                                <span className="text-xs font-bold text-slate-500 dark:text-[#CBD5E1]">{summary.excluded}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {/* Alert summary */}
                                {(distributionCounts.highRisk + distributionCounts.elevated) > 0 && (
                                    <div className="mt-3 bg-rose-50 dark:bg-rose-900/15 rounded-lg px-3 py-2 text-[10px] text-rose-700 dark:text-rose-400">
                                        {distributionCounts.highRisk + distributionCounts.elevated} athlete{distributionCounts.highRisk + distributionCounts.elevated > 1 ? 's' : ''} at risk of overload — consider load management strategies this week.
                                    </div>
                                )}
                            </div>

                            {/* ACWR Trend — always shown, uses periodDays for window */}
                            <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm overflow-hidden">
                                <div className="px-4 py-2.5 border-b border-slate-100 dark:border-[#1A2D48] flex items-center justify-between">
                                    <h4 className="text-xs font-semibold text-slate-900 dark:text-[#E2E8F0] uppercase tracking-wide">ACWR Trend (Team Average)</h4>
                                    {teamTrendline && teamTrendline.ratio > 0 && (
                                        <div className={`text-xs font-bold ${ACWR_UTILS.getRatioStatus(teamTrendline.ratio).color}`}>{teamTrendline.ratio.toFixed(2)}</div>
                                    )}
                                </div>
                                {teamTrendline && teamTrendline.ratioHistory?.length > 2 ? (
                                    <ACWRLineChart
                                        dates={(teamTrendline.dates || []).slice(-28)}
                                        ratioHistory={(teamTrendline.ratioHistory || []).slice(-28)}
                                        acuteHistory={(teamTrendline.acuteHistory || []).slice(-28)}
                                        chronicHistory={(teamTrendline.chronicHistory || []).slice(-28)}
                                        phases={(teamTrendline.phases || []).slice(-28)}
                                        restDays={teamTrendline.restDays}
                                        height={240}
                                        title=""
                                    />
                                ) : (
                                    <div className="p-6 text-center text-xs text-slate-400 dark:text-[#CBD5E1]">Log at least 7 days of training data to see the team trend.</div>
                                )}
                                <div className="px-4 py-2 border-t border-slate-100 dark:border-[#1A2D48] flex justify-end">
                                    <button onClick={() => setAcwrView('history')} className="text-[10px] text-indigo-500 hover:text-indigo-700 font-medium">View trend analysis →</button>
                                </div>
                            </div>

                        </div>{/* end right column */}

                    </div>{/* end two-column layout */}

                </>
            )}
            <ReportModal />

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

            {/* Status dropdown portal — escapes overflow-hidden/auto table containers */}
            {excludeMenuOpenId && excludeMenuPos && (() => {
                const menuPlayer = rosterData.find(p => p.id === excludeMenuOpenId);
                if (!menuPlayer) return null;
                return ReactDOM.createPortal(
                    <div
                        onMouseDown={e => e.stopPropagation()}
                        onClick={e => e.stopPropagation()}
                        style={{ position: 'fixed', top: excludeMenuPos.top, left: excludeMenuPos.left, zIndex: 9999 }}
                        className="bg-white dark:bg-[#1A2D48] border border-slate-200 dark:border-[#243A58] rounded-lg shadow-xl py-1 min-w-[160px]"
                    >
                        {menuPlayer.excluded ? (
                            <>
                                <button onClick={() => { handleExclude(menuPlayer.id, 'return', menuPlayer.name); setExcludeMenuOpenId(null); setExcludeMenuPos(null); }} className="w-full text-left px-3 py-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 flex items-center gap-2">
                                    <RotateCcwIcon size={11} /> Return from Injury
                                </button>
                                <button onClick={() => { handleExclude(menuPlayer.id, 'remove', menuPlayer.name); setExcludeMenuOpenId(null); setExcludeMenuPos(null); }} className="w-full text-left px-3 py-1.5 text-[11px] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#243A58] flex items-center gap-2">
                                    <XCircleIcon size={11} /> Remove Exclusion
                                </button>
                            </>
                        ) : menuPlayer.returning ? (
                            <>
                                <button onClick={() => { handleExclude(menuPlayer.id, 'remove', menuPlayer.name); setExcludeMenuOpenId(null); setExcludeMenuPos(null); }} className="w-full text-left px-3 py-1.5 text-[11px] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#243A58] flex items-center gap-2">
                                    <XCircleIcon size={11} /> Clear Return Status
                                </button>
                                <button onClick={() => { handleExclude(menuPlayer.id, 'injured', menuPlayer.name); setExcludeMenuOpenId(null); setExcludeMenuPos(null); }} className="w-full text-left px-3 py-1.5 text-[11px] text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-[#1A2D48] flex items-center gap-2">
                                    <AlertTriangleIcon size={11} /> Mark Injured
                                </button>
                            </>
                        ) : (
                            <>
                                <button onClick={() => { handleExclude(menuPlayer.id, 'injured', menuPlayer.name); setExcludeMenuOpenId(null); setExcludeMenuPos(null); }} className="w-full text-left px-3 py-1.5 text-[11px] text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-[#1A2D48] flex items-center gap-2">
                                    <AlertTriangleIcon size={11} /> Mark Injured
                                </button>
                                <button onClick={() => { handleExclude(menuPlayer.id, 'non_injury', menuPlayer.name); setExcludeMenuOpenId(null); setExcludeMenuPos(null); }} className="w-full text-left px-3 py-1.5 text-[11px] text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 flex items-center gap-2">
                                    <XCircleIcon size={11} /> Non-Injury Exclusion
                                </button>
                                <button onClick={() => { handleExclude(menuPlayer.id, 'rest', menuPlayer.name); setExcludeMenuOpenId(null); setExcludeMenuPos(null); }} className="w-full text-left px-3 py-1.5 text-[11px] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#243A58] flex items-center gap-2">
                                    <ActivityIcon size={11} /> Mark Rest Day
                                </button>
                            </>
                        )}
                    </div>,
                    document.body
                );
            })()}
        </div>
    );
};

// ── Main Page Component ─────────────────────────────────────────────────
export const WellnessHubPage: React.FC = () => {
    const [activeSection, setActiveSection] = useState<string | null>(null);
    const { isLoading } = useAppState();
    const [searchParams] = useSearchParams();

    const urlTeamId = searchParams.get('teamId') || undefined;

    useEffect(() => {
        const section = searchParams.get('section');
        if (section) setActiveSection(section);
    }, []);

    if (activeSection) {
        // Questionnaire Data owns its own consolidated breadcrumb (Wellness Hub >
        // Questionnaire Data > Team) inside WellnessHub's dashboard banner, so we
        // suppress the parent banner here to avoid a double-bar header.
        const ownsBreadcrumb = activeSection === 'Questionnaire Data';
        return (
            <div className="space-y-5 animate-in fade-in duration-300">
                {!ownsBreadcrumb && (
                    <div className="flex items-center justify-between bg-white dark:bg-[#132338] px-5 py-3.5 rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm">
                        <div className="flex items-center gap-3">
                            <button onClick={() => setActiveSection(null)} className="p-2 bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-lg flex items-center justify-center text-slate-500 dark:text-[#CBD5E1] hover:text-slate-900 hover:border-slate-300 transition-all">
                                <ArrowLeftIcon size={16} />
                            </button>
                            <div>
                                <div className="text-[10px] font-medium text-slate-700 dark:text-[#E2E8F0] uppercase tracking-wide">Wellness Hub</div>
                                <h2 className="text-base font-semibold text-slate-900 dark:text-[#E2E8F0]">{activeSection}</h2>
                            </div>
                        </div>
                    </div>
                )}
                <div className="min-h-[600px] relative">
                    {isLoading && (
                        <div className="absolute inset-0 z-10 bg-white/80 dark:bg-[#132338]/80 backdrop-blur-[1px] flex flex-col items-center justify-center gap-3 rounded-xl">
                            <div className="w-6 h-6 border-2 border-indigo-200 dark:border-indigo-800/50 border-t-indigo-600 rounded-full animate-spin" />
                            <span className="text-xs font-medium text-slate-400 dark:text-[#CBD5E1]">Loading {activeSection.toLowerCase()}...</span>
                        </div>
                    )}
                    {activeSection === 'Questionnaire Data' && <WellnessHub initialTeamId={urlTeamId} onBackToSections={() => setActiveSection(null)} />}
                    {activeSection === 'Medical Reports' && <MedicalReports />}
                    {activeSection === 'Injury Report' && <InjuryReport />}
                    {activeSection === 'ACWR Monitoring' && <ACWRMonitoringHub />}
                    {activeSection === 'Load Thresholds' && <IndividualizedThresholds />}
                    {activeSection === 'Heart Rate Metrics' && <HeartRateMetricsReport />}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-[#132338] px-5 py-4 rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-[#E2E8F0]">Wellness Hub</h2>
                <p className="text-sm text-slate-500 dark:text-[#CBD5E1] mt-0.5">Athlete wellness monitoring, medical records & injury tracking.</p>
            </div>
            {isLoading ? (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="bg-white dark:bg-[#132338] p-5 rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm h-[150px] flex items-start gap-4">
                                <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-[#1A2D48] animate-pulse shrink-0" />
                                <div className="flex-1 space-y-2 py-1">
                                    <div className="h-4 w-32 bg-slate-100 dark:bg-[#1A2D48] rounded animate-pulse" />
                                    <div className="h-3 w-full bg-slate-50 dark:bg-[#0F1C30] rounded animate-pulse" />
                                    <div className="h-3 w-2/3 bg-slate-50 dark:bg-[#0F1C30] rounded animate-pulse" />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex flex-col items-center py-3">
                        <div className="w-6 h-6 border-2 border-indigo-200 dark:border-indigo-800/50 border-t-indigo-600 rounded-full animate-spin mb-2" />
                        <span className="text-xs font-medium text-slate-400 dark:text-[#CBD5E1]">Loading wellness data...</span>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {SECTIONS.map((section, i) => (
                        <button key={i} onClick={() => setActiveSection(section.title)}
                            className="bg-white dark:bg-[#132338] p-5 rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800/50 transition-all group flex flex-col text-left h-[150px]"
                        >
                            <div className="flex items-start gap-4 h-full">
                                <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-500 dark:text-indigo-300 group-hover:bg-indigo-600 group-hover:text-white dark:group-hover:bg-indigo-500 dark:group-hover:text-white flex items-center justify-center transition-all shrink-0">
                                    <section.icon size={20} />
                                </div>
                                <div className="flex flex-col justify-center h-full">
                                    <h3 className="text-base font-semibold text-slate-900 dark:text-[#E2E8F0] mb-1 leading-tight">{section.title}</h3>
                                    <p className="text-xs text-slate-500 dark:text-[#CBD5E1] leading-relaxed">{section.desc}</p>
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
