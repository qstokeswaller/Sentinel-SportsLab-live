// @ts-nocheck
import React from 'react';
import { Link } from 'react-router-dom';
import { useAppState } from '../context/AppStateContext';
import {
    AlertTriangleIcon, CalendarIcon, FilterIcon,
    ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, UserIcon, UsersIcon, PlusIcon, CheckCircle2Icon,
    MapPinIcon, PencilIcon, Trash2Icon, XIcon, ClockIcon, CheckIcon,
    Activity as ActivityIcon, Timer as TimerIcon, Dumbbell as DumbbellIcon, Link2 as Link2Icon, EyeIcon,
    ExternalLinkIcon,
} from 'lucide-react';
import InterventionModal from '../components/analytics/InterventionModal';
import { CustomSelect } from '../components/ui/CustomSelect';
import { DatabaseService } from '../services/databaseService';
import { ConfirmDeleteModal } from '../components/ui/ConfirmDeleteModal';
import { computeComposite, computeAthleteBaseline, scoreToHex } from '../utils/wellnessScoring';

// ── Constants for Edit Event Modal ────────────────────────────────────
const DEFAULT_EVENT_TYPES = [
    { label: 'Appointment', color: '#3b82f6' },
    { label: 'Meeting', color: '#6366f1' },
    { label: 'Note', color: '#64748b' },
];
const PRESET_COLORS = [
    '#6366f1', '#3b82f6', '#10b981', '#f59e0b',
    '#ec4899', '#8b5cf6', '#ef4444', '#64748b',
];

export const DashboardPage = () => {
    const {
        teams, scheduledSessions, setScheduledSessions, wellnessData, wellnessResponses, bodyHeatmapData, isLoading,
        dashboardFilterTarget, setDashboardFilterTarget,
        calendarFilterCategory, setCalendarFilterCategory,
        calendarFilterTeamId, setCalendarFilterTeamId,
        calendarFilterAthleteId, setCalendarFilterAthleteId,
        heatmapTeamFilter, setHeatmapTeamFilter,
        dashboardCalendarDate, setDashboardCalendarDate, dashboardCalendarDays,
        setIsAddEventModalOpen,
        calendarEvents,
        handleUpdateCalendarEvent,
        handleDeleteCalendarEvent,
        customEventTypes,
        setViewingDate, setViewingSession,
        setSelectedInterventionAthlete, setIsInterventionModalOpen,
        isInterventionModalOpen, selectedInterventionAthlete,
        loadRecords, acwrSettings, acwrExclusions, getAthleteAcwrOptions,
        calculateACWR, resolveTargetName, getSessionTypeColor,
        handleUpdateSession, handleDeleteSession, handleAddCalendarEvent, showToast,
    } = useAppState();

    // Check if any ACWR monitoring is enabled
    const hasAnyAcwrEnabled = Object.values(acwrSettings || {}).some((s: any) => s?.enabled);

    // Build set of ACWR-enabled athlete IDs
    const acwrEnabledAthleteIds = React.useMemo(() => {
        const ids = new Set<string>();
        if (!acwrSettings) return ids;
        teams.forEach(t => {
            if (t.id === 't_private') {
                // Private clients: check individual settings
                (t.players || []).forEach(p => {
                    if (acwrSettings[`ind_${p.id}`]?.enabled) ids.add(p.id);
                });
            } else if (acwrSettings[t.id]?.enabled) {
                (t.players || []).forEach(p => ids.add(p.id));
            }
        });
        return ids;
    }, [acwrSettings, teams]);

    // ── Wellness Summary data ─────────────────────────────────────────────
    const wellnessSummary = React.useMemo(() => {
        const empty = { latest: [], mostRecentDate: '', daysSince: null, metricAvgs: [], flagged: [], total: 0, responseCount: 0, availableCount: 0, modifiedCount: 0, unavailableCount: 0 };

        const resolveAvail = (r) => {
            const top = r.availability;
            if (top === 'available' || top === 'modified' || top === 'unavailable') return top;
            const raw = (typeof top === 'string' && top) || r.responses?.availability;
            if (!raw) return undefined;
            const s = String(raw).toLowerCase();
            if (s.includes('fully available') || s === 'available') return 'available';
            if (s.includes('modified')) return 'modified';
            if (s.includes('unavailable')) return 'unavailable';
        };

        if (heatmapTeamFilter === 'prompt') return empty;

        const dailyResponses = (wellnessResponses || []).filter(r => !r.tier || r.tier === 'daily');
        const teamPlayers = heatmapTeamFilter === 'All Teams'
            ? teams.flatMap(t => t.players || [])
            : (teams.find(t => t.name === heatmapTeamFilter)?.players || []);
        const playerIds = new Set(teamPlayers.map(p => p.id));

        const latestByAthlete = new Map();
        for (const r of [...dailyResponses].sort((a, b) =>
            (a.session_date || a.date || '').localeCompare(b.session_date || b.date || ''))) {
            const aid = r.athlete_id || r.athleteId;
            if (aid && playerIds.has(aid)) latestByAthlete.set(aid, r);
        }
        const allLatest = [...latestByAthlete.values()];

        // Find the team's most recent response date, then restrict to that date only
        const mostRecentDate = allLatest.reduce((max, r) => {
            const d = (r.session_date || r.date || '').split('T')[0];
            return d > max ? d : max;
        }, '');
        const latest = mostRecentDate
            ? allLatest.filter(r => (r.session_date || r.date || '').split('T')[0] === mostRecentDate)
            : allLatest;
        const daysSince = mostRecentDate
            ? Math.floor((Date.now() - new Date(mostRecentDate).getTime()) / 86400000)
            : null;

        const METRICS = [
            { key: 'fatigue',       label: 'Fatigue',       max: 10, color: '#f59e0b' },
            { key: 'soreness',      label: 'Soreness',      max: 10, color: '#ef4444' },
            { key: 'sleep_quality', label: 'Sleep Quality', max: 10, color: '#06b6d4' },
            { key: 'stress',        label: 'Stress',        max: 10, color: '#ec4899' },
            { key: 'mood',          label: 'Mood',          max: 10, color: '#8b5cf6' },
            { key: 'sleep_hours',   label: 'Sleep (hrs)',   max: 12, color: '#0ea5e9' },
        ];
        const metricAvgs = METRICS.map(m => {
            const vals = latest.map(r => r.responses?.[m.key]).filter(v => typeof v === 'number');
            const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
            return { ...m, avg };
        });

        const flagged = latest.filter(r => {
            const resp = r.responses || {};
            return (r.injury_report?.areas?.length > 0)
                || resolveAvail(r) === 'unavailable'
                || resp.fatigue >= 8 || resp.soreness >= 8 || resp.stress >= 8
                || (resp.sleep_hours != null && resp.sleep_hours <= 5);
        }).map(r => {
            const aid = r.athlete_id || r.athleteId;
            const player = teamPlayers.find(p => p.id === aid);
            const resp = r.responses || {};
            const isCritical = (r.injury_report?.areas?.length > 0) || resolveAvail(r) === 'unavailable';
            let reason = r.injury_report?.areas?.length > 0 ? 'INJURY REPORTED'
                : resolveAvail(r) === 'unavailable' ? 'UNAVAILABLE'
                : resp.fatigue >= 8 ? `FATIGUE ${resp.fatigue}/10`
                : resp.soreness >= 8 ? `SORENESS ${resp.soreness}/10`
                : resp.stress >= 8 ? `STRESS ${resp.stress}/10`
                : `SLEEP ${resp.sleep_hours}H`;
            return { r, player, reason, isCritical, aid };
        }).sort((a, b) => (b.isCritical ? 1 : 0) - (a.isCritical ? 1 : 0));

        const total = teamPlayers.length;
        const responseCount = latest.length;
        const availableCount = latest.filter(r => resolveAvail(r) === 'available').length;
        const modifiedCount  = latest.filter(r => resolveAvail(r) === 'modified').length;
        const unavailableCount = latest.filter(r => resolveAvail(r) === 'unavailable').length;

        return { latest, mostRecentDate, daysSince, metricAvgs, flagged, total, responseCount, availableCount, modifiedCount, unavailableCount };
    }, [wellnessResponses, teams, heatmapTeamFilter]);

    // Dashboard stat cards — computed at component level so they're available for the header row
    const dashboardStats = React.useMemo(() => {
        const sevenDaysAgoStr = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
        const athleteLastLoadDate = new Map<string, string>();
        for (const r of (loadRecords || [])) {
            const aid = r.athlete_id || r.athleteId;
            const d = r.date || '';
            if (aid && d && (!athleteLastLoadDate.has(aid) || d > athleteLastLoadDate.get(aid)!)) athleteLastLoadDate.set(aid, d);
        }
        const acwrHighRisk = teams.flatMap(t => t.players)
            .filter(p => acwrEnabledAthleteIds.has(p.id) && !acwrExclusions?.[p.id]?.excluded)
            .filter(p => { const l = athleteLastLoadDate.get(p.id); return l && l >= sevenDaysAgoStr; })
            .filter(p => parseFloat(calculateACWR(p.id)) > 1.5).length;
        const sleepRiskCount = wellnessSummary.latest.filter(r => {
            const h = r.responses?.sleep_hours;
            return h != null && h < 6;
        }).length;
        const { flagged, responseCount } = wellnessSummary;
        let readinessLabel = 'No data';
        let readinessSubLabel = 'No wellness responses yet';
        let readinessColor: 'slate' | 'rose' | 'amber' | 'emerald' = 'slate';
        let readinessPct: number | null = null;
        if (responseCount > 0) {
            const pctFlagged = flagged.length / responseCount;
            const hasCritical = flagged.some(f => f.isCritical);
            readinessPct = Math.round((1 - pctFlagged) * 100);
            if (hasCritical || pctFlagged >= 0.4) {
                readinessLabel = 'Poor'; readinessColor = 'rose';
                readinessSubLabel = hasCritical ? 'Critical flags raised' : `${Math.round(pctFlagged * 100)}% of squad flagged`;
            } else if (pctFlagged >= 0.25) {
                readinessLabel = 'Moderate'; readinessColor = 'amber';
                readinessSubLabel = `${Math.round(pctFlagged * 100)}% of squad flagged`;
            } else if (pctFlagged >= 0.1) {
                readinessLabel = 'Good'; readinessColor = 'amber';
                readinessSubLabel = `${Math.round(pctFlagged * 100)}% of squad flagged`;
            } else {
                readinessLabel = 'Ready'; readinessColor = 'emerald';
                readinessSubLabel = flagged.length === 0 ? 'No flags raised' : `< 10% of squad flagged`;
            }
        }
        return { acwrHighRisk, sleepRiskCount, readinessLabel, readinessSubLabel, readinessColor, readinessPct };
    }, [loadRecords, teams, acwrEnabledAthleteIds, acwrExclusions, calculateACWR, wellnessSummary]);

    const [activePopover, setActivePopover] = React.useState(null);
    const [isMorningReportExpanded, setIsMorningReportExpanded] = React.useState(false);
    const [isReportCollapsed, setIsReportCollapsed] = React.useState(() => localStorage.getItem('dash_report_collapsed') === '1');
    const [isHeatmapCollapsed, setIsHeatmapCollapsed] = React.useState(() => localStorage.getItem('dash_heatmap_collapsed') === '1');
    const [calendarViewMode, setCalendarViewMode] = React.useState<'month' | 'week'>(() => (localStorage.getItem('dash_calendar_view') as 'month' | 'week') || 'week');
    const toggleReportCollapsed = () => setIsReportCollapsed(v => { const next = !v; localStorage.setItem('dash_report_collapsed', next ? '1' : '0'); return next; });
    const toggleHeatmapCollapsed = () => setIsHeatmapCollapsed(v => { const next = !v; localStorage.setItem('dash_heatmap_collapsed', next ? '1' : '0'); return next; });
    const [activeSessionPopover, setActiveSessionPopover] = React.useState(null); // { id, session }
    const [confirmDeleteItem, setConfirmDeleteItem] = React.useState<{ type: 'session' | 'event'; id: string; name: string } | null>(null);
    // Note: the "Complete Session" inline popover + handler used to live here.
    // Removed when we migrated to plan-time tonnage tracking (no more post-session
    // completion flow). Tonnage is now captured at packet/program schedule time.

    const resolveSessionAthletes = (session) => {
        if (session?.targetType === 'Individual') {
            const player = teams.flatMap(t => t.players || []).find(p => p.id === session.targetId);
            return player ? [player] : [];
        }
        const team = teams.find(t => t.id === session?.targetId);
        return team?.players || [];
    };
    const [editingSession, setEditingSession] = React.useState(null);
    const [editingEvent, setEditingEvent] = React.useState(null);
    const [overflowDay, setOverflowDay] = React.useState(null); // dateStr of day showing overflow popover
    const [dragOverDate, setDragOverDate] = React.useState(null); // highlight drop target
    const [isDark, setIsDark] = React.useState(() => document.documentElement.classList.contains('dark'));
    React.useEffect(() => {
        const obs = new MutationObserver(() => setIsDark(document.documentElement.classList.contains('dark')));
        obs.observe(document.documentElement, { attributeFilter: ['class'] });
        return () => obs.disconnect();
    }, []);
    const popoverRef = React.useRef(null);
    const sessionPopoverRef = React.useRef(null);
    const overflowRef = React.useRef(null);
    const dragDataRef = React.useRef(null); // { type: 'session'|'event', item, sourceDate }

    // ── Drag & Drop handlers ──────────────────────────────────────────
    const handleDragStart = (e, type, item, sourceDate) => {
        dragDataRef.current = { type, item, sourceDate };
        e.dataTransfer.effectAllowed = 'copyMove';
        e.dataTransfer.setData('text/plain', ''); // required for Firefox
    };
    const handleDragOver = (e, dateStr) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = e.ctrlKey ? 'copy' : 'move';
        if (dragOverDate !== dateStr) setDragOverDate(dateStr);
    };
    const handleDragLeave = () => setDragOverDate(null);
    const handleDrop = async (e, targetDate) => {
        e.preventDefault();
        setDragOverDate(null);
        const drag = dragDataRef.current;
        if (!drag || drag.sourceDate === targetDate) return;
        dragDataRef.current = null;

        if (e.ctrlKey && drag.type === 'event') {
            // Ctrl+drop = copy event
            const ev = drag.item;
            await handleAddCalendarEvent({
                title: ev.title,
                event_type: ev.event_type,
                color: ev.color,
                description: ev.description || null,
                location: ev.location || null,
                all_day: ev.all_day,
                start_time: ev.start_time || null,
                end_time: ev.end_time || null,
                start_date: targetDate,
                end_date: targetDate,
            });
            showToast('Event copied', 'success');
        } else if (drag.type === 'event') {
            handleUpdateCalendarEvent(drag.item.id, { start_date: targetDate, end_date: targetDate });
        } else if (drag.type === 'session') {
            handleUpdateSession(drag.item.id, { date: targetDate });
        }
    };
    const handleDragEnd = () => { dragDataRef.current = null; setDragOverDate(null); };

    // Deterministic color palette for targets (athletes/teams)
    // darkBg uses the vibrant dot color at ~42% opacity — gives a rich filled tile like reference calendar apps
    const TARGET_COLORS = [
        { bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-700',     pillBg: 'bg-red-100',     dot: '#ef4444', darkBg: 'rgba(239,68,68,0.42)',   darkBorder: 'rgba(239,68,68,0.65)',  darkText: '#ffffff', darkPillBg: 'rgba(239,68,68,0.55)' },
        { bg: 'bg-blue-50',    border: 'border-blue-200',    text: 'text-blue-700',    pillBg: 'bg-blue-100',    dot: '#3b82f6', darkBg: 'rgba(59,130,246,0.42)',  darkBorder: 'rgba(59,130,246,0.65)', darkText: '#ffffff', darkPillBg: 'rgba(59,130,246,0.55)' },
        { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', pillBg: 'bg-emerald-100', dot: '#10b981', darkBg: 'rgba(16,185,129,0.42)', darkBorder: 'rgba(16,185,129,0.65)', darkText: '#ffffff', darkPillBg: 'rgba(16,185,129,0.55)' },
        { bg: 'bg-orange-50',  border: 'border-orange-200',  text: 'text-orange-700',  pillBg: 'bg-orange-100',  dot: '#f97316', darkBg: 'rgba(249,115,22,0.42)', darkBorder: 'rgba(249,115,22,0.65)', darkText: '#ffffff', darkPillBg: 'rgba(249,115,22,0.55)' },
        { bg: 'bg-violet-50',  border: 'border-violet-200',  text: 'text-violet-700',  pillBg: 'bg-violet-100',  dot: '#8b5cf6', darkBg: 'rgba(139,92,246,0.42)', darkBorder: 'rgba(139,92,246,0.65)', darkText: '#ffffff', darkPillBg: 'rgba(139,92,246,0.55)' },
        { bg: 'bg-pink-50',    border: 'border-pink-200',    text: 'text-pink-700',    pillBg: 'bg-pink-100',    dot: '#ec4899', darkBg: 'rgba(236,72,153,0.42)', darkBorder: 'rgba(236,72,153,0.65)', darkText: '#ffffff', darkPillBg: 'rgba(236,72,153,0.55)' },
        { bg: 'bg-cyan-50',    border: 'border-cyan-200',    text: 'text-cyan-700',    pillBg: 'bg-cyan-100',    dot: '#06b6d4', darkBg: 'rgba(6,182,212,0.42)',  darkBorder: 'rgba(6,182,212,0.65)',  darkText: '#ffffff', darkPillBg: 'rgba(6,182,212,0.55)' },
        { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   pillBg: 'bg-amber-100',   dot: '#f59e0b', darkBg: 'rgba(245,158,11,0.42)', darkBorder: 'rgba(245,158,11,0.65)', darkText: '#ffffff', darkPillBg: 'rgba(245,158,11,0.55)' },
        { bg: 'bg-lime-50',    border: 'border-lime-200',    text: 'text-lime-700',    pillBg: 'bg-lime-100',    dot: '#84cc16', darkBg: 'rgba(132,204,22,0.42)', darkBorder: 'rgba(132,204,22,0.65)', darkText: '#ffffff', darkPillBg: 'rgba(132,204,22,0.55)' },
        { bg: 'bg-rose-50',    border: 'border-rose-200',    text: 'text-rose-700',    pillBg: 'bg-rose-100',    dot: '#f43f5e', darkBg: 'rgba(244,63,94,0.42)',  darkBorder: 'rgba(244,63,94,0.65)',  darkText: '#ffffff', darkPillBg: 'rgba(244,63,94,0.55)' },
    ];

    // Derive a darkened color (700-level equivalent) from a hex for light mode event text
    const darkenHex = (hex: string) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgb(${Math.round(r * 0.55)}, ${Math.round(g * 0.55)}, ${Math.round(b * 0.55)})`;
    };
    // Derive a lightened color (300-level equivalent) from a hex for dark mode event text
    const lightenHex = (hex: string) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgb(${Math.round(r * 0.35 + 255 * 0.65)}, ${Math.round(g * 0.35 + 255 * 0.65)}, ${Math.round(b * 0.35 + 255 * 0.65)})`;
    };

    // Build stable targetId → color index mapping from all sessions
    const targetColorMap = React.useMemo(() => {
        const map = new Map();
        const uniqueTargets = [...new Set(scheduledSessions.map(s => s.targetId))];
        uniqueTargets.forEach((id, i) => { map.set(id, TARGET_COLORS[i % TARGET_COLORS.length]); });
        return map;
    }, [scheduledSessions]);

    const getTargetColor = (targetId) => targetColorMap.get(targetId) || TARGET_COLORS[0];

    // Close popover on click outside
    React.useEffect(() => {
        if (!activePopover && !activeSessionPopover && !overflowDay) return;
        const handler = (e) => {
            if (activePopover && popoverRef.current && !popoverRef.current.contains(e.target)) {
                setActivePopover(null);
                setEditingEvent(null);
            }
            if (activeSessionPopover && sessionPopoverRef.current && !sessionPopoverRef.current.contains(e.target)) {
                setActiveSessionPopover(null);
            }
            if (overflowDay && overflowRef.current && !overflowRef.current.contains(e.target)) {
                setOverflowDay(null);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [activePopover, activeSessionPopover, overflowDay]);

    const renderMorningReport = () => {
        // Show prompt state when no squad is selected
        if (heatmapTeamFilter === 'prompt') return (
            <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm overflow-hidden flex flex-col h-full">
                <button
                    onClick={toggleReportCollapsed}
                    className="px-4 py-3 border-b border-slate-100 dark:border-[#1A2D48] bg-slate-50/60 dark:bg-[#132338]/40 flex items-center justify-between w-full text-left hover:bg-slate-100/60 dark:hover:bg-[#1A2D48] transition-colors"
                >
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-slate-100 dark:bg-[#1A2D48] rounded-lg flex items-center justify-center text-slate-400 shrink-0">
                            <ActivityIcon size={14} />
                        </div>
                        <div>
                            <h3 className="text-[13px] font-semibold text-slate-900 dark:text-[#E2E8F0]">Performance Report</h3>
                            <p className="text-[10px] text-slate-500 dark:text-[#CBD5E1]">ACWR readiness</p>
                        </div>
                    </div>
                    <ChevronDownIcon size={14} className={`text-slate-400 dark:text-[#CBD5E1] transition-transform duration-200 shrink-0 ${isReportCollapsed ? '-rotate-90' : ''}`} />
                </button>
                {!isReportCollapsed && (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                        <UsersIcon size={20} className="text-slate-300 dark:text-[#475569] mb-2" />
                        <p className="text-xs text-slate-400 dark:text-[#CBD5E1]">Select a squad to view the performance report.</p>
                    </div>
                )}
            </div>
        );

        // Show empty state when ACWR is not enabled
        if (!hasAnyAcwrEnabled) return (
            <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm overflow-hidden flex flex-col h-full">
                <button
                    onClick={toggleReportCollapsed}
                    className="px-4 py-3 border-b border-slate-100 dark:border-[#1A2D48] bg-slate-50/60 dark:bg-[#132338]/40 flex items-center justify-between w-full text-left hover:bg-slate-100/60 dark:hover:bg-[#1A2D48] transition-colors"
                >
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-slate-200 dark:bg-[#1A2D48] rounded-lg flex items-center justify-center text-slate-400 shrink-0">
                            <AlertTriangleIcon size={14} />
                        </div>
                        <div>
                            <h3 className="text-[13px] font-semibold text-slate-900 dark:text-[#E2E8F0]">Performance Report</h3>
                            <p className="text-[10px] text-slate-500 dark:text-[#CBD5E1]">ACWR readiness</p>
                        </div>
                    </div>
                    <ChevronDownIcon size={14} className={`text-slate-400 dark:text-[#CBD5E1] transition-transform duration-200 shrink-0 ${isReportCollapsed ? '-rotate-90' : ''}`} />
                </button>
                {!isReportCollapsed && (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                        <p className="text-xs text-slate-400 dark:text-[#CBD5E1]">No ACWR monitoring enabled.</p>
                        <p className="text-[10px] text-slate-300 dark:text-[#475569] mt-1">Enable ACWR for your teams in Settings → Feature Settings to see the performance report.</p>
                    </div>
                )}
            </div>
        );

        // Staleness check — only show athletes with load data in the last 7 days
        const sevenDaysAgoStr = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
        const athleteLastLoadDate = new Map<string, string>();
        for (const r of (loadRecords || [])) {
            const aid = r.athlete_id || r.athleteId;
            const d = r.date || '';
            if (aid && d && (!athleteLastLoadDate.has(aid) || d > athleteLastLoadDate.get(aid)!)) {
                athleteLastLoadDate.set(aid, d);
            }
        }
        // Most recent load date overall (for "as of" label)
        const loadDateValues = [...athleteLastLoadDate.values()];
        const mostRecentLoadDate = loadDateValues.length > 0 ? loadDateValues.sort().reverse()[0] : null;
        const hasRecentData = mostRecentLoadDate && mostRecentLoadDate >= sevenDaysAgoStr;

        // Active at-risk athletes — only those with data within the last 7 days
        const activeAtRisk = teams.flatMap(t => t.players)
            .filter(player => acwrEnabledAthleteIds.has(player.id))
            .filter(player => !acwrExclusions?.[player.id]?.excluded)
            .filter(player => {
                const last = athleteLastLoadDate.get(player.id);
                return last && last >= sevenDaysAgoStr;
            })
            .map(player => {
                const acwr = parseFloat(calculateACWR(player.id));
                let riskLevel = 'Stable';
                const ex = acwrExclusions?.[player.id];
                const isReturning = ex?.returnDate && !ex.excluded && ((Date.now() - new Date(ex.returnDate + 'T00:00:00').getTime()) / 86400000) <= 7;
                if (acwr > 1.5) riskLevel = 'Critical';
                else if (acwr > 1.3) riskLevel = 'Warning';
                else if (acwr < 0.8 && acwr > 0) riskLevel = 'Warning';
                else if (isReturning) riskLevel = 'Warning';
                const lastDate = athleteLastLoadDate.get(player.id) || '';
                return { ...player, riskLevel, acwr, isReturning, isInjured: false, lastDate };
            }).filter(p => p.riskLevel !== 'Stable').sort((a, b) => {
                const tierRank = { Critical: 2, Warning: 1 };
                const tA = tierRank[a.riskLevel] ?? 0;
                const tB = tierRank[b.riskLevel] ?? 0;
                if (tB !== tA) return tB - tA;
                if (b.lastDate !== a.lastDate) return b.lastDate.localeCompare(a.lastDate);
                return b.acwr - a.acwr;
            });

        // Injured/excluded athletes (at the bottom)
        const injuredAthletes = teams.flatMap(t => t.players)
            .filter(player => acwrEnabledAthleteIds.has(player.id))
            .filter(player => acwrExclusions?.[player.id]?.excluded)
            .map(player => ({ ...player, riskLevel: 'Injured', acwr: 0, isReturning: false, isInjured: true }));

        const atRiskAthletes = [...activeAtRisk, ...injuredAthletes];
        const totalCount = atRiskAthletes.length;

        const visible = atRiskAthletes.slice(0, 5);
        const remaining = atRiskAthletes.length - 5;

        const renderCompactRow = (player, onClick) => {
            const initials = player.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
            const isInjured = player.isInjured;
            const acwrColor = isInjured ? 'text-slate-400' : player.acwr > 1.5 ? 'text-rose-600' : player.acwr > 1.3 ? 'text-amber-600' : 'text-sky-600';
            const bgColor = isInjured ? 'bg-slate-200 text-slate-500' : player.acwr > 1.5 ? 'bg-rose-100 text-rose-700' : player.acwr > 1.3 ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700';
            const borderColor = isInjured ? 'border-l-slate-400' : player.acwr > 1.5 ? 'border-l-rose-500' : player.acwr > 1.3 ? 'border-l-amber-400' : 'border-l-sky-400';
            return (
                <div key={player.id}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border-l-[3px] ${borderColor} ${isInjured ? 'bg-slate-50/80 dark:bg-[#1A2D48]/60 opacity-70' : 'bg-slate-50/50 dark:bg-[#1A2D48]/30'} hover:bg-white dark:hover:bg-[#1A2D48] hover:shadow-sm transition-all cursor-pointer`}
                    onClick={onClick}
                >
                    <div className={`w-7 h-7 rounded-md flex items-center justify-center text-[9px] font-bold shrink-0 ${bgColor}`}>
                        {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="text-[12px] font-medium text-slate-900 dark:text-[#E2E8F0] truncate">{player.name}</h4>
                    </div>
                    {isInjured ? (
                        <span className="text-[10px] font-semibold text-slate-400 italic shrink-0">Injured</span>
                    ) : (
                        <div className="flex flex-col items-end shrink-0">
                            <div className={`text-sm font-bold ${acwrColor}`}>{player.acwr.toFixed(2)}</div>
                            {player.lastDate && (
                                <div className="text-[9px] text-slate-400">
                                    {player.lastDate === new Date().toISOString().split('T')[0]
                                        ? 'today'
                                        : player.lastDate === new Date(Date.now() - 86400000).toISOString().split('T')[0]
                                        ? 'yesterday'
                                        : new Date(player.lastDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            );
        };

        return (
            <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm overflow-hidden flex flex-col">
                <button
                    onClick={toggleReportCollapsed}
                    className="px-4 py-3 border-b border-slate-100 dark:border-[#243A58] bg-rose-50/60 dark:bg-rose-900/10 flex items-center justify-between w-full text-left hover:bg-rose-50/80 dark:hover:bg-[#1A2D48] transition-colors"
                >
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-rose-600 rounded-lg flex items-center justify-center text-white shrink-0">
                            <AlertTriangleIcon size={14} />
                        </div>
                        <div>
                            <h3 className="text-[13px] font-semibold text-slate-900 dark:text-[#E2E8F0]">Performance Report</h3>
                            <p className="text-[10px] text-slate-500">
                                {mostRecentLoadDate ? (() => {
                                    const today = new Date().toISOString().split('T')[0];
                                    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
                                    const label = mostRecentLoadDate === today ? 'today'
                                        : mostRecentLoadDate === yesterday ? 'yesterday'
                                        : new Date(mostRecentLoadDate + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
                                    return `ACWR from last session — ${label}`;
                                })() : 'ACWR readiness'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2 py-0.5 bg-white dark:bg-[#1A2D48] border border-rose-200 dark:border-rose-800/50 rounded-full text-[10px] font-medium text-rose-600 dark:text-rose-400">{atRiskAthletes.length}</span>
                        <ChevronDownIcon size={14} className={`text-slate-400 dark:text-[#CBD5E1] transition-transform duration-200 ${isReportCollapsed ? '-rotate-90' : ''}`} />
                    </div>
                </button>
                {!isReportCollapsed && <div className="p-2.5 space-y-1.5 flex-1 overflow-y-auto">
                    {!hasRecentData ? (
                        <div className="py-8 flex flex-col items-center justify-center gap-2">
                            <ClockIcon size={22} className="text-slate-400" />
                            <p className="text-[11px] text-slate-600 dark:text-[#CBD5E1] text-center font-medium">No recent data</p>
                            <p className="text-[10px] text-slate-500 text-center">
                                {mostRecentLoadDate
                                    ? `Last entry was ${mostRecentLoadDate} — more than 7 days ago.`
                                    : 'No training load recorded yet.'}
                            </p>
                            <p className="text-[10px] text-slate-500 text-center">Log sessions or import CSV to see readiness.</p>
                        </div>
                    ) : atRiskAthletes.length > 0 ? (
                        <>
                            {visible.map(player => renderCompactRow(player, () => {
                                setSelectedInterventionAthlete(player);
                                setIsInterventionModalOpen(true);
                            }))}
                            {remaining > 0 && (
                                <button
                                    onClick={() => setIsMorningReportExpanded(true)}
                                    className="w-full py-2 text-[11px] font-medium text-indigo-600 dark:text-indigo-300 hover:text-indigo-700 dark:hover:text-indigo-200 hover:bg-indigo-50 dark:hover:bg-[#1A2D48] rounded-lg transition-colors"
                                >
                                    +{remaining} more athlete{remaining > 1 ? 's' : ''}
                                </button>
                            )}
                        </>
                    ) : (
                        <div className="py-8 flex flex-col items-center justify-center text-slate-300 gap-2">
                            <CheckCircle2Icon size={28} className="text-emerald-400/40" />
                            <p className="text-[11px] text-slate-400">All monitored athletes within safe range</p>
                        </div>
                    )}
                </div>}

                {/* Expanded popup showing all at-risk athletes */}
                {isMorningReportExpanded && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsMorningReportExpanded(false)} />
                        <div className="relative bg-white dark:bg-[#1A2D48] rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                            <div className="px-5 py-4 border-b border-slate-100 dark:border-[#243A58] bg-rose-50/60 dark:bg-rose-900/10 flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0]">All At-Risk Athletes</h3>
                                    <p className="text-[10px] text-slate-500">Click an athlete to see their risk analysis</p>
                                </div>
                                <button onClick={() => setIsMorningReportExpanded(false)} className="p-1.5 hover:bg-white/60 rounded-lg">
                                    <XIcon size={16} className="text-slate-400" />
                                </button>
                            </div>
                            <div className="p-3 space-y-1.5 flex-1 overflow-y-auto">
                                {atRiskAthletes.map(player => renderCompactRow(player, () => {
                                    setSelectedInterventionAthlete(player);
                                    setIsInterventionModalOpen(true);
                                    setIsMorningReportExpanded(false);
                                }))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // Build list of athlete IDs in selected team for filtering
    const selectedTeamPlayerIds = React.useMemo(() => {
        if (!calendarFilterTeamId) return [];
        const team = teams.find(t => t.id === calendarFilterTeamId);
        return team ? team.players.map(p => p.id) : [];
    }, [calendarFilterTeamId, teams]);

    const filteredSessionsForCalendar = scheduledSessions.filter(s => {
        if (calendarFilterCategory === 'all') return true;
        if (calendarFilterCategory === 'trainer') return false; // trainer events only, no sessions
        if (calendarFilterCategory === 'teams') {
            if (s.targetType !== 'Team') return false;
            return !calendarFilterTeamId || s.targetId === calendarFilterTeamId;
        }
        if (calendarFilterCategory === 'athletes') {
            if (calendarFilterAthleteId) {
                return s.targetId === calendarFilterAthleteId;
            }
            if (calendarFilterTeamId) {
                return s.targetId === calendarFilterTeamId || selectedTeamPlayerIds.includes(s.targetId);
            }
            return true;
        }
        return true;
    });

    // Determine which general (trainer) events to show alongside sessions.
    // In 'all' or 'trainer' mode: show all. In 'teams'/'athletes' mode: show only events
    // assigned to the currently selected team/athlete so they surface in context.
    const filteredCalendarEventsForView = React.useMemo(() => {
        if (!calendarEvents) return [];
        if (calendarFilterCategory === 'all' || calendarFilterCategory === 'trainer') {
            return calendarEvents;
        }
        if (calendarFilterCategory === 'teams') {
            if (calendarFilterTeamId) {
                return calendarEvents.filter(e =>
                    (e.assigned_to_type === 'team' && e.assigned_to_id === calendarFilterTeamId) ||
                    (e.assigned_to_type === 'individual' && selectedTeamPlayerIds.includes(e.assigned_to_id))
                );
            }
            // All teams selected — show all team-assigned events
            return calendarEvents.filter(e => e.assigned_to_type === 'team');
        }
        if (calendarFilterCategory === 'athletes') {
            if (calendarFilterAthleteId) {
                return calendarEvents.filter(e =>
                    e.assigned_to_type === 'individual' && e.assigned_to_id === calendarFilterAthleteId
                );
            }
            if (calendarFilterTeamId) {
                return calendarEvents.filter(e =>
                    (e.assigned_to_type === 'team' && e.assigned_to_id === calendarFilterTeamId) ||
                    (e.assigned_to_type === 'individual' && selectedTeamPlayerIds.includes(e.assigned_to_id))
                );
            }
            return calendarEvents.filter(e => e.assigned_to_type === 'individual');
        }
        return calendarEvents;
    }, [calendarEvents, calendarFilterCategory, calendarFilterTeamId, calendarFilterAthleteId, selectedTeamPlayerIds]);

    // Filter label for display
    const calendarFilterLabel = React.useMemo(() => {
        if (calendarFilterCategory === 'all') return 'All';
        if (calendarFilterCategory === 'trainer') return 'Trainer Events';
        if (calendarFilterCategory === 'teams') {
            if (calendarFilterTeamId) {
                const t = teams.find(t => t.id === calendarFilterTeamId);
                return t ? t.name : 'All Teams';
            }
            return 'All Teams';
        }
        if (calendarFilterCategory === 'athletes') {
            if (calendarFilterAthleteId) {
                const team = teams.find(t => t.players.some(p => p.id === calendarFilterAthleteId));
                const player = team?.players.find(p => p.id === calendarFilterAthleteId);
                return player ? player.name : 'All Athletes';
            }
            if (calendarFilterTeamId) {
                const t = teams.find(t => t.id === calendarFilterTeamId);
                return t ? `${t.name} Athletes` : 'All Athletes';
            }
            return 'All Athletes';
        }
        return 'All';
    }, [calendarFilterCategory, calendarFilterTeamId, calendarFilterAthleteId, teams]);

    // Week view — 7 days of the week containing dashboardCalendarDate
    const weekDays = React.useMemo(() => {
        const d = new Date(dashboardCalendarDate);
        const start = new Date(d);
        start.setDate(d.getDate() - d.getDay()); // Sunday
        return Array.from({ length: 7 }, (_, i) => {
            const day = new Date(start);
            day.setDate(start.getDate() + i);
            return {
                dateStr: day.toLocaleDateString('en-CA'),
                day: day.getDate(),
                month: day.getMonth(),
                dayName: day.toLocaleString('default', { weekday: 'short' }),
            };
        });
    }, [dashboardCalendarDate]);

                const noSquadSelected = heatmapTeamFilter === 'prompt';

                return (<>
                    <div className="space-y-6 animate-in fade-in duration-700">

                        {/* ── Dashboard Stat Cards ── */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                            {/* Players Flagged */}
                            <div className="bg-white dark:bg-gradient-to-br dark:from-rose-950/90 dark:to-[#132338] rounded-xl border border-slate-200 dark:border-rose-800/50 shadow-sm p-4 flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-slate-900 dark:text-[#E2E8F0] uppercase tracking-wider">Flagged</span>
                                    <div className="w-7 h-7 bg-rose-50 dark:bg-rose-900/20 rounded-lg flex items-center justify-center">
                                        <AlertTriangleIcon size={13} className="text-rose-500" />
                                    </div>
                                </div>
                                {noSquadSelected ? (
                                    <p className="text-[10px] text-slate-700 dark:text-[#CBD5E1] leading-snug mt-1">
                                        <span className="dark:text-[#E2E8F0]">Athletes with wellness flags from their latest daily check-in — fatigue, injury, or availability concerns.</span>
                                    </p>
                                ) : (
                                    <>
                                        <div className="flex items-end gap-1.5">
                                            <span className={`text-2xl font-bold leading-none ${wellnessSummary.flagged.length > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-[#E2E8F0]'}`}>
                                                {wellnessSummary.flagged.length}
                                            </span>
                                            <span className="text-[10px] text-slate-700 dark:text-[#E2E8F0] mb-0.5">athletes</span>
                                        </div>
                                        <p className="text-[10px] text-slate-700 dark:text-[#E2E8F0] leading-tight">From latest wellness check-in</p>
                                    </>
                                )}
                            </div>

                            {/* High Risk ACWR */}
                            <div className="bg-white dark:bg-gradient-to-br dark:from-amber-950/90 dark:to-[#132338] rounded-xl border border-slate-200 dark:border-amber-800/50 shadow-sm p-4 flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-slate-900 dark:text-[#E2E8F0] uppercase tracking-wider">ACWR Risk</span>
                                    <div className="w-7 h-7 bg-amber-50 dark:bg-amber-900/20 rounded-lg flex items-center justify-center">
                                        <ActivityIcon size={13} className="text-amber-500" />
                                    </div>
                                </div>
                                {noSquadSelected ? (
                                    <p className="text-[10px] text-slate-700 dark:text-[#CBD5E1] leading-snug mt-1">
                                        <span className="dark:text-[#E2E8F0]">Athletes with an acute:chronic workload ratio above 1.5 — elevated injury risk from excessive load spike.</span>
                                    </p>
                                ) : (
                                    <>
                                        <div className="flex items-end gap-1.5">
                                            <span className={`text-2xl font-bold leading-none ${dashboardStats.acwrHighRisk > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-[#E2E8F0]'}`}>
                                                {dashboardStats.acwrHighRisk}
                                            </span>
                                            <span className="text-[10px] text-slate-700 dark:text-[#E2E8F0] mb-0.5">{'>'} 1.5</span>
                                        </div>
                                        <p className="text-[10px] text-slate-700 dark:text-[#E2E8F0] leading-tight">High ACWR in last 7 days</p>
                                    </>
                                )}
                            </div>

                            {/* Sleep Risk */}
                            <div className="bg-white dark:bg-gradient-to-br dark:from-sky-950/90 dark:to-[#132338] rounded-xl border border-slate-200 dark:border-sky-800/50 shadow-sm p-4 flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-slate-900 dark:text-[#E2E8F0] uppercase tracking-wider">Sleep Risk</span>
                                    <div className="w-7 h-7 bg-sky-50 dark:bg-sky-900/20 rounded-lg flex items-center justify-center">
                                        <ClockIcon size={13} className="text-sky-500" />
                                    </div>
                                </div>
                                {noSquadSelected ? (
                                    <p className="text-[10px] text-slate-700 dark:text-[#E2E8F0] leading-snug mt-1">
                                        Athletes reporting under 6 hours of sleep — a key recovery and performance risk indicator.
                                    </p>
                                ) : (
                                    <>
                                        <div className="flex items-end gap-1.5">
                                            <span className={`text-2xl font-bold leading-none ${dashboardStats.sleepRiskCount > 0 ? 'text-sky-600 dark:text-sky-400' : 'text-slate-800 dark:text-[#E2E8F0]'}`}>
                                                {dashboardStats.sleepRiskCount}
                                            </span>
                                            <span className="text-[10px] text-slate-700 dark:text-[#E2E8F0] mb-0.5">{'<'} 6 hrs</span>
                                        </div>
                                        <p className="text-[10px] text-slate-700 dark:text-[#E2E8F0] leading-tight">Poor sleep from last check-in</p>
                                    </>
                                )}
                            </div>

                            {/* Squad Readiness */}
                            <div className={`bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-4 flex flex-col gap-2 ${
                                !noSquadSelected && dashboardStats.readinessColor === 'emerald'
                                    ? 'dark:bg-gradient-to-br dark:from-emerald-950/90 dark:to-[#132338] dark:border-emerald-800/50'
                                    : !noSquadSelected && dashboardStats.readinessColor === 'amber'
                                    ? 'dark:bg-gradient-to-br dark:from-amber-950/90 dark:to-[#132338] dark:border-amber-800/50'
                                    : !noSquadSelected && dashboardStats.readinessColor === 'rose'
                                    ? 'dark:bg-gradient-to-br dark:from-rose-950/90 dark:to-[#132338] dark:border-rose-800/50'
                                    : 'dark:bg-[#132338] dark:border-[#243A58]'
                            }`}>
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-slate-900 dark:text-[#E2E8F0] uppercase tracking-wider">Squad Readiness</span>
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                                        !noSquadSelected && dashboardStats.readinessColor === 'emerald' ? 'bg-emerald-50 dark:bg-emerald-900/20' :
                                        !noSquadSelected && dashboardStats.readinessColor === 'amber'   ? 'bg-amber-50 dark:bg-amber-900/20' :
                                        !noSquadSelected && dashboardStats.readinessColor === 'rose'    ? 'bg-rose-50 dark:bg-rose-900/20' :
                                        'bg-slate-50 dark:bg-[#1A2D48]'
                                    }`}>
                                        <CheckCircle2Icon size={13} className={
                                            !noSquadSelected && dashboardStats.readinessColor === 'emerald' ? 'text-emerald-500' :
                                            !noSquadSelected && dashboardStats.readinessColor === 'amber'   ? 'text-amber-500' :
                                            !noSquadSelected && dashboardStats.readinessColor === 'rose'    ? 'text-rose-500' :
                                            'text-slate-400'
                                        } />
                                    </div>
                                </div>
                                {noSquadSelected ? (
                                    <p className="text-[10px] text-slate-700 dark:text-[#E2E8F0] leading-snug mt-1">
                                        Overall squad wellness readiness based on flagged responses — from fully ready to concerns requiring action.
                                    </p>
                                ) : (
                                    <>
                                        <div className="flex items-end gap-1.5">
                                            <span className={`text-xl font-bold leading-none ${
                                                dashboardStats.readinessColor === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' :
                                                dashboardStats.readinessColor === 'amber'   ? 'text-amber-600 dark:text-amber-400' :
                                                dashboardStats.readinessColor === 'rose'    ? 'text-rose-600 dark:text-rose-400' :
                                                'text-slate-700 dark:text-[#E2E8F0]'
                                            }`}>{dashboardStats.readinessLabel}</span>
                                            {dashboardStats.readinessPct !== null && (
                                                <span className="text-[10px] text-slate-700 dark:text-[#E2E8F0] mb-0.5">{dashboardStats.readinessPct}%</span>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-slate-700 dark:text-[#E2E8F0] leading-tight">{dashboardStats.readinessSubLabel}</p>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                            {/* Performance Report Column */}
                            <div data-tour="morning-report" className="lg:col-span-1 relative">
                                {isLoading && (
                                    <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm overflow-hidden flex flex-col h-full">
                                        <div className="px-4 py-3 border-b border-slate-100 bg-rose-50/60 flex items-center gap-2.5">
                                            <div className="w-8 h-8 bg-rose-200 rounded-lg animate-pulse" />
                                            <div className="space-y-1">
                                                <div className="h-3 w-24 bg-rose-100 rounded animate-pulse" />
                                                <div className="h-2 w-16 bg-rose-50 rounded animate-pulse" />
                                            </div>
                                        </div>
                                        <div className="p-2.5 space-y-1.5 flex-1">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-slate-50/50 dark:bg-[#132338]/40">
                                                    <div className="w-7 h-7 rounded-md bg-slate-100 dark:bg-[#1A2D48] animate-pulse" />
                                                    <div className="flex-1 h-3 bg-slate-100 rounded animate-pulse" />
                                                    <div className="w-8 h-4 bg-slate-100 rounded animate-pulse" />
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex flex-col items-center py-4">
                                            <div className="w-5 h-5 border-2 border-rose-200 dark:border-rose-900/50 dark:border-rose-800/50 border-t-rose-500 rounded-full animate-spin mb-1.5" />
                                            <span className="text-[10px] font-medium text-slate-400">Loading performance report...</span>
                                        </div>
                                    </div>
                                )}
                                {!isLoading && renderMorningReport()}
                            </div>

                            {/* Main Dashboard Actions Column */}
                            <div className="lg:col-span-2">
                                {/* Wellness Summary */}
                                <div data-tour="heatmap" className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm flex flex-col overflow-hidden">
                                    <button
                                        onClick={toggleHeatmapCollapsed}
                                        className="px-5 py-4 flex items-center justify-between w-full text-left hover:bg-slate-50/60 dark:bg-[#132338]/40 dark:hover:bg-[#1A2D48]/60 transition-colors shrink-0"
                                    >
                                        <div>
                                            <h4 className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0]">Wellness Summary</h4>
                                            <p className="text-xs text-slate-500 dark:text-[#CBD5E1] mt-0.5">
                                                {heatmapTeamFilter === 'prompt' ? 'Select a team to view latest questionnaire responses'
                                                    : heatmapTeamFilter === 'All Teams' ? 'Most recent daily check-in responses — all teams'
                                                    : `Most recent daily check-in responses — ${heatmapTeamFilter}`}
                                            </p>
                                        </div>
                                        <ChevronDownIcon size={14} className={`text-slate-400 transition-transform duration-200 shrink-0 ${isHeatmapCollapsed ? '-rotate-90' : ''}`} />
                                    </button>

                                    {!isHeatmapCollapsed && (
                                    <div className="px-5 pb-4 space-y-2">
                                        {/* Team selector + link row */}
                                        <div className="flex items-center justify-between border-t border-slate-100 dark:border-[#243A58] pt-3">
                                            <CustomSelect
                                                value={heatmapTeamFilter}
                                                onChange={(e) => setHeatmapTeamFilter(e.target.value)}
                                                variant="filter"
                                                size="xs"
                                                placeholder="— select team —"
                                            >
                                                <option value="prompt">— select team —</option>
                                                <option value="All Teams">All Teams</option>
                                                {teams.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                                            </CustomSelect>
                                            {heatmapTeamFilter !== 'prompt' && (() => {
                                                const tid = heatmapTeamFilter !== 'All Teams' ? (teams.find(t => t.name === heatmapTeamFilter)?.id || '') : '';
                                                const href = `/wellness?section=Questionnaire+Data${tid ? `&teamId=${tid}` : ''}`;
                                                return (
                                                    <Link to={href} className="text-xs font-medium text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1 transition-colors">
                                                        Open Questionnaire Data <ExternalLinkIcon size={11} />
                                                    </Link>
                                                );
                                            })()}
                                        </div>

                                        {heatmapTeamFilter === 'prompt' ? (
                                            <div className="py-10 text-center">
                                                <div className="w-9 h-9 bg-slate-100 dark:bg-[#1A2D48] rounded-xl flex items-center justify-center mx-auto mb-2.5">
                                                    <UsersIcon size={16} className="text-slate-400 dark:text-[#94A3B8]" />
                                                </div>
                                                <p className="text-sm font-medium text-slate-500 dark:text-[#CBD5E1]">Select a team to display</p>
                                                <p className="text-xs text-slate-400 dark:text-[#94A3B8] mt-0.5">Use the dropdown above to load wellness data</p>
                                            </div>
                                        ) : (() => {
                                            const { mostRecentDate, daysSince, metricAvgs, flagged, total, responseCount, availableCount, modifiedCount, unavailableCount } = wellnessSummary;
                                            const pctAvail   = total ? (availableCount   / total) * 100 : 0;
                                            const pctMod     = total ? (modifiedCount    / total) * 100 : 0;
                                            const pctUnavail = total ? (unavailableCount / total) * 100 : 0;
                                            const PREVIEW = 5;
                                            const visible = flagged.slice(0, PREVIEW);
                                            const hiddenCount = flagged.length - PREVIEW;
                                            const isStale = daysSince !== null && daysSince > 3;
                                            const formattedDate = mostRecentDate
                                                ? new Date(mostRecentDate + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                                                : '';
                                            const selectedTeamId = heatmapTeamFilter !== 'All Teams'
                                                ? (teams.find(t => t.name === heatmapTeamFilter)?.id || '')
                                                : '';
                                            const wellnessLink = `/wellness?section=Questionnaire+Data${selectedTeamId ? `&teamId=${selectedTeamId}` : ''}`;

                                            return (
                                                <>
                                                    {/* Stale data warning */}
                                                    {isStale && (
                                                        <div className="bg-amber-50 dark:bg-amber-500/15 border border-amber-100 dark:border-amber-500/30 rounded-lg px-3 py-1.5 flex items-center gap-2">
                                                            <AlertTriangleIcon size={12} className="text-amber-500 shrink-0" />
                                                            <p className="text-xs text-amber-700 dark:text-amber-300">
                                                                Last data collected on <strong>{formattedDate}</strong> — may be outdated
                                                            </p>
                                                        </div>
                                                    )}

                                                    {responseCount === 0 ? (
                                                        <div className="py-8 text-center text-slate-400 dark:text-[#94A3B8]">
                                                            <p className="text-sm font-medium">No wellness responses yet</p>
                                                            <p className="text-xs mt-1">Responses will appear once athletes complete their check-ins.</p>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            {/* Stat chips row: date + response counts */}
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {formattedDate && (
                                                                    <div className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 border ${isStale ? 'bg-amber-50 dark:bg-amber-500/15 border-amber-100 dark:border-amber-500/30' : 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-100 dark:border-emerald-500/30'}`}>
                                                                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isStale ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                                                                        <span className={`text-[10px] font-semibold ${isStale ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                                                                            {formattedDate}
                                                                            {!isStale && daysSince === 0 && <span className="ml-1 opacity-70">· Today</span>}
                                                                            {!isStale && daysSince === 1 && <span className="ml-1 opacity-70">· Yesterday</span>}
                                                                            {!isStale && daysSince > 1 && <span className="ml-1 opacity-70">· {daysSince}d ago</span>}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                                <div className="flex items-center gap-1 bg-slate-50 dark:bg-[#1A2D48] border border-slate-100 dark:border-[#243A58] rounded-lg px-2.5 py-1.5">
                                                                    <span className="text-xs font-bold text-slate-700 dark:text-[#CBD5E1]">{responseCount}</span>
                                                                    <span className="text-[10px] text-slate-400 dark:text-[#94A3B8]">responses</span>
                                                                </div>
                                                                {[
                                                                    { dot: 'bg-emerald-500', val: availableCount,   label: 'avail',   color: 'text-emerald-600 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-100 dark:border-emerald-500/30' },
                                                                    { dot: 'bg-amber-400',   val: modifiedCount,    label: 'mod',     color: 'text-amber-600 dark:text-amber-300',     bg: 'bg-amber-50 dark:bg-amber-500/15 border-amber-100 dark:border-amber-500/30' },
                                                                    { dot: 'bg-rose-500',    val: unavailableCount, label: 'unavail', color: 'text-rose-600 dark:text-rose-300',       bg: 'bg-rose-50 dark:bg-rose-500/15 border-rose-100 dark:border-rose-500/30' },
                                                                ].map(({ dot, val, label, color, bg }) => (
                                                                    <div key={label} className={`flex items-center gap-1 border rounded-lg px-2.5 py-1.5 ${bg}`}>
                                                                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
                                                                        <span className={`text-xs font-bold ${color}`}>{val}</span>
                                                                        <span className="text-[10px] text-slate-500 dark:text-[#CBD5E1]">{label}</span>
                                                                    </div>
                                                                ))}
                                                            </div>

                                                            {/* Availability bar */}
                                                            <div className="h-1.5 flex rounded-full overflow-hidden bg-slate-100 dark:bg-[#0F1C30]">
                                                                <div className="bg-emerald-500 transition-all duration-700" style={{ width: `${pctAvail}%` }} />
                                                                <div className="bg-amber-400 transition-all duration-700" style={{ width: `${pctMod}%` }} />
                                                                <div className="bg-rose-500 transition-all duration-700" style={{ width: `${pctUnavail}%` }} />
                                                            </div>

                                                            {/* Two-column body: Team Averages | Priority Alerts */}
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                                                {/* Left: Team Averages */}
                                                                <div className="bg-slate-50 dark:bg-[#1A2D48] rounded-xl border border-slate-100 dark:border-[#243A58] p-3">
                                                                    <div className="flex items-center gap-1.5 mb-2.5">
                                                                        <ActivityIcon size={11} className="text-amber-500" />
                                                                        <span className="text-[10px] font-bold text-slate-600 dark:text-[#CBD5E1] uppercase tracking-wider">Team Averages</span>
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        {metricAvgs.map(m => (
                                                                            <div key={m.key} className="flex items-center gap-2">
                                                                                <span className="text-[9px] font-semibold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wide w-[4.5rem] shrink-0">{m.label}</span>
                                                                                <div className="flex-1 h-1.5 bg-slate-200 dark:bg-[#243A58] rounded-full overflow-hidden">
                                                                                    {m.avg !== null && (
                                                                                        <div className="h-full rounded-full transition-all duration-700"
                                                                                            style={{ width: `${(m.avg / m.max) * 100}%`, backgroundColor: m.color }} />
                                                                                    )}
                                                                                </div>
                                                                                <span className="text-[11px] font-bold text-slate-700 dark:text-[#CBD5E1] w-9 text-right shrink-0 tabular-nums">
                                                                                    {m.avg !== null ? (m.key === 'sleep_hours' ? `${m.avg.toFixed(1)}h` : m.avg.toFixed(1)) : '—'}
                                                                                </span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>

                                                                {/* Right: Priority Alerts */}
                                                                <div className="bg-slate-50 dark:bg-[#1A2D48] rounded-xl border border-slate-100 dark:border-[#243A58] p-3">
                                                                    <div className="flex items-center gap-1.5 mb-2.5">
                                                                        <AlertTriangleIcon size={11} className="text-rose-500" />
                                                                        <span className="text-[10px] font-bold text-slate-600 dark:text-[#CBD5E1] uppercase tracking-wider">Priority Alerts</span>
                                                                        {flagged.length > 0 && (
                                                                            <span className="ml-auto text-[9px] font-bold text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/15 border border-rose-100 dark:border-rose-500/30 rounded px-1 py-0.5">{flagged.length} flagged</span>
                                                                        )}
                                                                    </div>
                                                                    {flagged.length === 0 ? (
                                                                        <div className="flex flex-col items-center justify-center py-3 text-center">
                                                                            <CheckCircle2Icon size={18} className="text-emerald-400 mb-1" />
                                                                            <p className="text-xs font-medium text-slate-500 dark:text-[#CBD5E1]">All clear</p>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="space-y-1.5">
                                                                            {visible.map(({ r, player, reason, isCritical, aid }) => {
                                                                                const initials = player
                                                                                    ? player.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                                                                                    : '??';
                                                                                return (
                                                                                    <div key={aid} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 border ${isCritical ? 'bg-white dark:bg-[#132338] border-slate-100 dark:border-rose-500/30' : 'bg-white dark:bg-[#132338] border-slate-100 dark:border-amber-500/30'}`}>
                                                                                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isCritical ? 'bg-rose-500' : 'bg-amber-400'}`} />
                                                                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0 ${isCritical ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-300' : 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300'}`}>
                                                                                            {initials}
                                                                                        </div>
                                                                                        <div className="flex-1 min-w-0">
                                                                                            <p className="text-[10px] font-semibold text-slate-800 dark:text-[#E2E8F0] truncate leading-tight">{player?.name || 'Unknown'}</p>
                                                                                            <p className={`text-[9px] font-bold uppercase tracking-wide leading-tight ${isCritical ? 'text-rose-500 dark:text-rose-300' : 'text-amber-500 dark:text-amber-300'}`}>{reason}</p>
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                            {hiddenCount > 0 && (
                                                                                <Link
                                                                                    to={wellnessLink}
                                                                                    className="flex items-center justify-center py-1.5 border border-dashed border-rose-200 dark:border-rose-500/30 rounded-lg text-[9px] font-semibold text-rose-500 dark:text-rose-300 hover:text-rose-700 dark:hover:text-rose-200 hover:border-rose-300 dark:hover:border-rose-500/50 transition-colors"
                                                                                >
                                                                                    + {hiddenCount} more flagged athlete{hiddenCount > 1 ? 's' : ''}
                                                                                </Link>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Full Size Calendar */}
                        <div data-tour="calendar" className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm flex flex-col">
                            {/* Calendar Header */}
                            <div className="px-5 py-4 border-b border-slate-100 dark:border-[#243A58] flex flex-col gap-3 bg-white dark:bg-[#132338]">
                                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 bg-slate-900 dark:bg-[#1A2D48] rounded-lg flex items-center justify-center text-white shrink-0">
                                            <CalendarIcon size={16} />
                                        </div>
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <h3 className="text-base font-semibold text-slate-900 dark:text-[#E2E8F0]">
                                                {calendarViewMode === 'week'
                                                    ? (() => {
                                                        const s = weekDays[0]; const e = weekDays[6];
                                                        const sd = new Date(s.dateStr + 'T00:00'); const ed = new Date(e.dateStr + 'T00:00');
                                                        return sd.getMonth() === ed.getMonth()
                                                            ? `${sd.toLocaleString('default', { month: 'long' })} ${sd.getDate()}–${ed.getDate()}, ${sd.getFullYear()}`
                                                            : `${sd.toLocaleString('default', { month: 'short' })} ${sd.getDate()} – ${ed.toLocaleString('default', { month: 'short' })} ${ed.getDate()}, ${ed.getFullYear()}`;
                                                    })()
                                                    : dashboardCalendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                                            </h3>
                                            <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-[#1A2D48] p-0.5 rounded-lg border border-slate-200/50 dark:border-[#243A58]">
                                                <button onClick={() => {
                                                    const newDate = new Date(dashboardCalendarDate);
                                                    if (calendarViewMode === 'week') newDate.setDate(newDate.getDate() - 7);
                                                    else newDate.setMonth(newDate.getMonth() - 1);
                                                    setDashboardCalendarDate(newDate);
                                                }} className="p-1.5 hover:bg-white dark:hover:bg-[#243A58] hover:shadow-sm rounded-md transition-all">
                                                    <ChevronLeftIcon size={14} className="text-slate-600 dark:text-[#CBD5E1]" />
                                                </button>
                                                <button onClick={() => {
                                                    const newDate = new Date(dashboardCalendarDate);
                                                    if (calendarViewMode === 'week') newDate.setDate(newDate.getDate() + 7);
                                                    else newDate.setMonth(newDate.getMonth() + 1);
                                                    setDashboardCalendarDate(newDate);
                                                }} className="p-1.5 hover:bg-white dark:hover:bg-[#243A58] hover:shadow-sm rounded-md transition-all">
                                                    <ChevronRightIcon size={14} className="text-slate-600 dark:text-[#CBD5E1]" />
                                                </button>
                                            </div>
                                            {/* Week / Month toggle */}
                                            <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-[#1A2D48] p-0.5 rounded-lg border border-slate-200/50 dark:border-[#243A58]">
                                                <button
                                                    onClick={() => { setCalendarViewMode('month'); localStorage.setItem('dash_calendar_view', 'month'); }}
                                                    className={`px-2.5 py-1 text-xs rounded-md transition-all ${calendarViewMode === 'month' ? 'bg-white dark:bg-[#243A58] shadow-sm font-semibold text-slate-800 dark:text-[#E2E8F0]' : 'text-slate-500 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#94A3B8]'}`}
                                                >Month</button>
                                                <button
                                                    onClick={() => { setCalendarViewMode('week'); localStorage.setItem('dash_calendar_view', 'week'); }}
                                                    className={`px-2.5 py-1 text-xs rounded-md transition-all ${calendarViewMode === 'week' ? 'bg-white dark:bg-[#243A58] shadow-sm font-semibold text-slate-800 dark:text-[#E2E8F0]' : 'text-slate-500 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#94A3B8]'}`}
                                                >Week</button>
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-[#CBD5E1]">{calendarFilterLabel}</p>
                                        </div>
                                    </div>

                                    {/* Cascading Filter Dropdowns + Add Event */}
                                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                                        {/* Category Filter */}
                                        <CustomSelect
                                            value={calendarFilterCategory}
                                            onChange={(e) => {
                                                setCalendarFilterCategory(e.target.value);
                                                setCalendarFilterTeamId(null);
                                                setCalendarFilterAthleteId(null);
                                            }}
                                            variant="filter"
                                            size="xs"
                                            prefixIcon={<FilterIcon size={13} />}
                                        >
                                            <option value="all">All</option>
                                            <option value="teams">Teams</option>
                                            <option value="athletes">Athletes</option>
                                            <option value="trainer">Trainer Events</option>
                                        </CustomSelect>

                                        {/* Team Filter — shown for 'teams' category */}
                                        {calendarFilterCategory === 'teams' && (
                                            <CustomSelect
                                                value={calendarFilterTeamId || ''}
                                                onChange={(e) => setCalendarFilterTeamId(e.target.value || null)}
                                                variant="filter"
                                                size="xs"
                                                placeholder="All Teams"
                                            >
                                                <option value="">All Teams</option>
                                                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                            </CustomSelect>
                                        )}

                                        {/* Athletes: Team picker then athlete picker */}
                                        {calendarFilterCategory === 'athletes' && (
                                            <>
                                                <CustomSelect
                                                    value={calendarFilterTeamId || ''}
                                                    onChange={(e) => {
                                                        setCalendarFilterTeamId(e.target.value || null);
                                                        setCalendarFilterAthleteId(null);
                                                    }}
                                                    variant="filter"
                                                    size="xs"
                                                    placeholder="All Teams"
                                                >
                                                    <option value="">All Teams</option>
                                                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                                </CustomSelect>
                                                <CustomSelect
                                                    value={calendarFilterAthleteId || ''}
                                                    onChange={(e) => setCalendarFilterAthleteId(e.target.value || null)}
                                                    variant="filter"
                                                    size="xs"
                                                    prefixIcon={<UserIcon size={12} />}
                                                    placeholder="All Athletes"
                                                >
                                                    <option value="">All Athletes</option>
                                                    {(calendarFilterTeamId
                                                        ? (teams.find(t => t.id === calendarFilterTeamId)?.players || [])
                                                        : teams.flatMap(t => t.players)
                                                    ).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                </CustomSelect>
                                            </>
                                        )}

                                        <button onClick={() => setIsAddEventModalOpen(true)}
                                            className="bg-indigo-600 text-white px-3.5 py-1.5 rounded-lg text-xs font-medium shadow-sm flex items-center gap-1.5 hover:bg-indigo-500 transition-colors"
                                        >
                                            <PlusIcon size={13} /> Add Event
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 relative">
                                {/* Calendar loading skeleton */}
                                {isLoading && (
                                    <div className="absolute inset-0 z-10 bg-white/80 dark:bg-[#132338]/80 backdrop-blur-[1px] flex flex-col items-center justify-center gap-3 rounded-lg">
                                        <div className="w-6 h-6 border-2 border-indigo-200 dark:border-indigo-800/50 border-t-indigo-600 rounded-full animate-spin" />
                                        <span className="text-xs font-medium text-slate-400 dark:text-[#CBD5E1]">Loading calendar...</span>
                                    </div>
                                )}

                                {/* ── Week View ── */}
                                {calendarViewMode === 'week' && (
                                    <div>
                                        <div className="grid grid-cols-7 gap-2">
                                            {weekDays.map(wd => {
                                                const isToday = wd.dateStr === new Date().toLocaleDateString('en-CA');
                                                const daySessions = filteredSessionsForCalendar.filter(s => s.date === wd.dateStr);
                                                const dayEvents = filteredCalendarEventsForView.filter(e => e.start_date === wd.dateStr);
                                                const allItems = [
                                                    ...daySessions.map(s => ({ type: 'session' as const, time: s.time || '99:99', item: s })),
                                                    ...dayEvents.map(e => ({ type: 'event' as const, time: e.all_day ? '00:00' : (e.start_time || '99:99'), item: e })),
                                                ].sort((a, b) => a.time.localeCompare(b.time));
                                                return (
                                                    <div
                                                        key={wd.dateStr}
                                                        onClick={() => setViewingDate(wd.dateStr)}
                                                        onDragOver={(e) => handleDragOver(e, wd.dateStr)}
                                                        onDragLeave={handleDragLeave}
                                                        onDrop={(e) => handleDrop(e, wd.dateStr)}
                                                        className={`min-h-[140px] rounded-lg border p-2 flex flex-col gap-1.5 cursor-pointer transition-all hover:shadow-md ${
                                                            dragOverDate === wd.dateStr
                                                                ? 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-400 ring-2 ring-indigo-300'
                                                                : isToday
                                                                ? 'bg-indigo-50 dark:bg-indigo-600/20 border-indigo-300 dark:border-indigo-500/50 ring-1 ring-indigo-200 dark:ring-indigo-800/50'
                                                                : 'bg-white dark:bg-[#132338] border-slate-100 dark:border-[#243A58] hover:border-slate-300 dark:hover:border-white/30'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-1.5 pb-1 border-b border-slate-100 dark:border-[#243A58]/60">
                                                            <span className="text-[10px] font-semibold text-slate-400 dark:text-[#CBD5E1] uppercase">{wd.dayName}</span>
                                                            <span className={`text-sm font-bold leading-none inline-flex items-center justify-center ${isToday ? 'bg-indigo-600 text-white rounded-full w-5 h-5' : 'text-slate-700 dark:text-[#E2E8F0]'}`}>{wd.day}</span>
                                                        </div>
                                                        <div className="flex-1 space-y-1 overflow-hidden">
                                                            {allItems.length === 0 ? (
                                                                <p className="text-[9px] text-slate-300 dark:text-[#1A2D48] text-center pt-3">—</p>
                                                            ) : allItems.map(entry => {
                                                                if (entry.type === 'session') {
                                                                    const session = entry.item;
                                                                    const tc = getTargetColor(session.targetId);
                                                                    return (
                                                                        <div
                                                                            key={session.id}
                                                                            draggable
                                                                            onDragStart={(e) => { e.stopPropagation(); handleDragStart(e, 'session', session, wd.dateStr); }}
                                                                            onDragEnd={handleDragEnd}
                                                                            onClick={(e) => { e.stopPropagation(); setViewingSession(session); }}
                                                                            className={`flex flex-col gap-0.5 p-1.5 rounded-md border cursor-grab transition-all hover:scale-[1.01] active:scale-95 overflow-hidden ${tc.bg} ${tc.border} ${tc.text}`}
                                                                            style={isDark ? { backgroundColor: tc.darkBg, borderColor: tc.darkBorder, color: tc.darkText } : undefined}
                                                                        >
                                                                            <div className={`flex items-center gap-1 ${tc.pillBg} px-1 py-0.5 rounded overflow-hidden`} style={isDark ? { backgroundColor: tc.darkPillBg } : undefined}>
                                                                                <div className="flex items-center gap-0.5 min-w-0 flex-1 overflow-hidden">
                                                                                    {session.session_type === 'wattbike' && <ActivityIcon size={7} className="text-emerald-600 dark:text-emerald-400 shrink-0" />}
                                                                                    {session.session_type === 'conditioning' && <TimerIcon size={7} className="text-orange-500 shrink-0" />}
                                                                                    {(!session.session_type || session.session_type === 'workout') && <DumbbellIcon size={7} className="shrink-0" />}
                                                                                    <span className="text-[8px] font-medium uppercase tracking-wide truncate">{session.trainingPhase}</span>
                                                                                </div>
                                                                                <div className="flex items-center gap-0.5 shrink-0">
                                                                                    {(session.linked_sessions?.length > 0) && <Link2Icon size={7} className="opacity-60" title="Has linked sessions" />}
                                                                                    {session.load && (
                                                                                        <span className={`text-[7px] font-bold uppercase px-1 py-px rounded ${
                                                                                            session.load === 'High' ? 'bg-red-500 text-white' :
                                                                                            session.load === 'Medium' ? 'bg-amber-400 text-white' :
                                                                                            'bg-emerald-400 text-white'
                                                                                        }`}>{session.load[0]}</span>
                                                                                    )}
                                                                                    {session.targetType === 'Individual' && <UserIcon size={7} />}
                                                                                </div>
                                                                            </div>
                                                                            <div className="px-0.5">
                                                                                <div className="text-[9px] font-medium leading-tight truncate">{session.title}</div>
                                                                                <div className="text-[8px] opacity-70 truncate mt-0.5">
                                                                                    {session.time && <span className="font-semibold">{session.time} · </span>}
                                                                                    {resolveTargetName(session.targetId, session.targetType)}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                } else {
                                                                    const event = entry.item;
                                                                    return (
                                                                        <div
                                                                            key={event.id}
                                                                            draggable
                                                                            onDragStart={(e) => { e.stopPropagation(); handleDragStart(e, 'event', event, wd.dateStr); }}
                                                                            onDragEnd={handleDragEnd}
                                                                            onClick={(e) => { e.stopPropagation(); const popKey = `${event.id}_${wd.dateStr}`; setActivePopover({ id: popKey, event }); }}
                                                                            className="flex items-center gap-1.5 px-1.5 py-1 rounded-md border cursor-grab transition-all hover:scale-[1.01] active:scale-95"
                                                                            style={{ backgroundColor: `${event.color}${isDark ? '6B' : '26'}`, borderColor: `${event.color}${isDark ? 'A8' : '55'}`, color: isDark ? '#ffffff' : darkenHex(event.color) }}
                                                                        >
                                                                            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: event.color }} />
                                                                            <span className="text-[9px] font-medium leading-tight truncate">
                                                                                {!event.all_day && event.start_time && (
                                                                                    <span className="font-semibold">{event.start_time} </span>
                                                                                )}
                                                                                {event.title}
                                                                            </span>
                                                                        </div>
                                                                    );
                                                                }
                                                            })}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* ── Month View ── */}
                                {calendarViewMode === 'month' && (
                                <div className="grid grid-cols-7 gap-1 sm:gap-2">
                                    {[
                                        { full: 'Sun', short: 'S' }, { full: 'Mon', short: 'M' },
                                        { full: 'Tue', short: 'T' }, { full: 'Wed', short: 'W' },
                                        { full: 'Thu', short: 'T' }, { full: 'Fri', short: 'F' },
                                        { full: 'Sat', short: 'S' }
                                    ].map(day => (
                                        <div key={day.full} className="text-[11px] font-medium text-slate-400 dark:text-[#CBD5E1] text-center pb-3">
                                            <span className="hidden sm:block">{day.full}</span>
                                            <span className="sm:hidden">{day.short}</span>
                                        </div>
                                    ))}
                                    {dashboardCalendarDays.map((dateObj, idx) => {
                                        const isToday = dateObj && dateObj.dateStr === new Date().toLocaleDateString('en-CA');
                                        const calendarRow = Math.floor(idx / 7);
                                        const totalRows = Math.ceil(dashboardCalendarDays.length / 7);
                                        const isBottomRows = calendarRow >= totalRows - 2;
                                        const isDragOver = dateObj && dragOverDate === dateObj.dateStr;
                                        return (
                                            <div key={idx}
                                                onDragOver={dateObj ? (e) => handleDragOver(e, dateObj.dateStr) : undefined}
                                                onDragLeave={dateObj ? handleDragLeave : undefined}
                                                onDrop={dateObj ? (e) => handleDrop(e, dateObj.dateStr) : undefined}
                                                className={`relative min-h-[72px] sm:min-h-[96px] rounded-lg border transition-all duration-200 ease-out group p-1.5 sm:p-2.5 flex flex-col justify-between ${dateObj
                                                    ? 'hover:shadow-md cursor-pointer'
                                                    : 'bg-slate-50/30 dark:bg-[#0D1829]/40 border-transparent'} ${isDragOver
                                                        ? 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-400 ring-2 ring-indigo-300 shadow-lg scale-[1.02]'
                                                        : isToday
                                                        ? 'bg-indigo-50 dark:bg-indigo-600/20 border-indigo-300 dark:border-indigo-500/50 shadow-sm ring-1 ring-indigo-200 dark:ring-indigo-800/50'
                                                        : 'bg-white dark:bg-[#132338] border-slate-100 dark:border-[#243A58] hover:border-slate-300 dark:hover:border-white/30'}`}
                                                onClick={() => dateObj && setViewingDate(dateObj.dateStr)}>
                                                {dateObj && (
                                                    <>
                                                        {/* Date number — circled on today (Google Calendar pattern, no overflow possible) */}
                                                        <div className="mb-1 sm:mb-1.5">
                                                            <span className={`text-[11px] font-semibold leading-none inline-flex items-center justify-center transition-colors
                                                                ${isToday
                                                                    ? 'bg-indigo-600 text-white rounded-full w-[18px] h-[18px] sm:w-5 sm:h-5'
                                                                    : 'text-slate-400 dark:text-[#CBD5E1] group-hover:text-slate-800 dark:group-hover:text-[#E2E8F0]'
                                                                }`}>{dateObj.day}</span>
                                                        </div>
                                                        <div>
                                                            {/* xs: dots-only (< 640px) */}
                                                            {(() => {
                                                                const ds = filteredSessionsForCalendar.filter(s => s.date === dateObj.dateStr);
                                                                const de = filteredCalendarEventsForView.filter(e => e.start_date === dateObj.dateStr);
                                                                const all = [
                                                                    ...ds.map(s => ({ type: 'session' as const, item: s })),
                                                                    ...de.map(e => ({ type: 'event' as const, item: e })),
                                                                ];
                                                                if (all.length === 0) return null;
                                                                const shown = all.slice(0, 3);
                                                                return (
                                                                    <div
                                                                        className="flex items-center gap-0.5 sm:hidden flex-wrap mt-0.5 cursor-pointer"
                                                                        onClick={(e) => { e.stopPropagation(); setOverflowDay(overflowDay === dateObj.dateStr ? null : dateObj.dateStr); }}
                                                                    >
                                                                        {shown.map((entry, i) => {
                                                                            const dotColor = entry.type === 'session'
                                                                                ? getTargetColor((entry.item as any).targetId).dot
                                                                                : (entry.item as any).color;
                                                                            return <div key={i} className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />;
                                                                        })}
                                                                        {all.length > 3 && <span className="text-[8px] text-slate-400 font-medium">+{all.length - 3}</span>}
                                                                    </div>
                                                                );
                                                            })()}
                                                            {/* sm+: full event cards */}
                                                            <div className="hidden sm:block space-y-0.5 sm:space-y-1">
                                                            {/* Merged sessions + events, sorted by time */}
                                                            {(() => {
                                                                const daySessions = filteredSessionsForCalendar.filter(s => s.date === dateObj.dateStr)
                                                                    .map(s => ({ type: 'session' as const, time: s.time || '99:99', item: s }));
                                                                const dayEvents = filteredCalendarEventsForView
                                                                    .filter(e => e.start_date === dateObj.dateStr)
                                                                    .map(e => ({ type: 'event' as const, time: e.all_day ? '00:00' : (e.start_time || '99:99'), item: e }));
                                                                const merged = [...daySessions, ...dayEvents]
                                                                    .sort((a, b) => a.time.localeCompare(b.time))
                                                                    .slice(0, 3);
                                                                return merged.map(entry => {
                                                                    if (entry.type === 'session') {
                                                                        const session = entry.item;
                                                                        const tc = getTargetColor(session.targetId);
                                                                        return (
                                                                <div key={session.id} className="relative"
                                                                    draggable
                                                                    onDragStart={(e) => { e.stopPropagation(); handleDragStart(e, 'session', session, dateObj.dateStr); }}
                                                                    onDragEnd={handleDragEnd}
                                                                >
                                                                <div
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        const popKey = session.id;
                                                                        setActiveSessionPopover(activeSessionPopover?.id === popKey ? null : { id: popKey, session });
                                                                        setActivePopover(null);
                                                                    }}
                                                                    className={`flex flex-col gap-0.5 p-1.5 rounded-md border transition-all hover:scale-[1.02] active:scale-95 cursor-grab overflow-hidden ${tc.bg} ${tc.border} ${tc.text}`}
                                                                    style={isDark ? { backgroundColor: tc.darkBg, borderColor: tc.darkBorder, color: tc.darkText } : undefined}>
                                                                    <div className={`flex items-center gap-1 ${tc.pillBg} px-1 py-0.5 rounded overflow-hidden`} style={isDark ? { backgroundColor: tc.darkPillBg } : undefined}>
                                                                        <div className="flex items-center gap-0.5 min-w-0 flex-1 overflow-hidden">
                                                                            {session.session_type === 'wattbike' && <ActivityIcon size={7} className="text-emerald-600 dark:text-emerald-400 shrink-0" />}
                                                                            {session.session_type === 'conditioning' && <TimerIcon size={7} className="text-orange-500 shrink-0" />}
                                                                            {(!session.session_type || session.session_type === 'workout') && <DumbbellIcon size={7} className="shrink-0" />}
                                                                            <span className="text-[8px] font-medium uppercase tracking-wide truncate">{session.trainingPhase}</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-0.5 shrink-0">
                                                                            {(session.linked_sessions?.length > 0) && <Link2Icon size={7} className="opacity-60" title="Has linked sessions" />}
                                                                            {session.load && (
                                                                                <span className={`text-[7px] font-bold uppercase px-1 py-px rounded ${
                                                                                    session.load === 'High' ? 'bg-red-500 text-white' :
                                                                                    session.load === 'Medium' ? 'bg-amber-400 text-white' :
                                                                                    'bg-emerald-400 text-white'
                                                                                }`}>{session.load[0]}</span>
                                                                            )}
                                                                            {session.targetType === 'Individual' && <UserIcon size={7} />}
                                                                        </div>
                                                                    </div>
                                                                    <div className="px-0.5">
                                                                        <div className="text-[9px] font-medium leading-tight truncate">{session.title}</div>
                                                                        <div className="text-[8px] opacity-70 truncate mt-0.5">
                                                                            {session.time && <span className="font-semibold">{session.time} · </span>}
                                                                            {resolveTargetName(session.targetId, session.targetType)}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                {/* Session Popover */}
                                                                {activeSessionPopover?.id === session.id && (
                                                                    <div
                                                                        ref={sessionPopoverRef}
                                                                        className={`absolute z-50 left-0 w-56 bg-white dark:bg-[#1A2D48] rounded-lg shadow-xl border border-slate-200 dark:border-[#243A58] animate-in fade-in zoom-in-95 duration-150 ${isBottomRows ? 'bottom-full mb-1' : 'top-full mt-1'}`}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    >
                                                                        <div className={`h-1 rounded-t-lg ${tc.bg === 'bg-red-50' ? 'bg-red-400' : tc.bg === 'bg-blue-50' ? 'bg-blue-400' : tc.bg === 'bg-emerald-50' ? 'bg-emerald-400' : tc.bg === 'bg-orange-50' ? 'bg-orange-400' : tc.bg === 'bg-violet-50' ? 'bg-violet-400' : 'bg-indigo-400'}`} />
                                                                        <div className="p-3 space-y-2">
                                                                            <div className="flex items-start justify-between">
                                                                                <h4 className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0] leading-tight">{session.title}</h4>
                                                                                <button onClick={() => setActiveSessionPopover(null)} className="p-0.5 text-slate-300 hover:text-slate-600 dark:text-[#CBD5E1] transition-colors">
                                                                                    <XIcon size={12} />
                                                                                </button>
                                                                            </div>
                                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                                <span className="px-2 py-0.5 rounded text-[9px] font-semibold bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-300">{session.trainingPhase}</span>
                                                                                {session.load && (
                                                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-semibold border ${
                                                                                        session.load === 'High'   ? 'bg-rose-50 dark:bg-rose-500/15 border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400' :
                                                                                        session.load === 'Medium' ? 'bg-amber-50 dark:bg-amber-500/15 border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-400' :
                                                                                        'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                                                                                    }`}>{session.load} Load</span>
                                                                                )}
                                                                                {session.status && session.status !== 'Scheduled' && (
                                                                                    <span className="px-2 py-0.5 rounded text-[9px] font-semibold bg-slate-50 dark:bg-slate-500/10 border border-slate-200 dark:border-slate-500/25 text-slate-500 dark:text-[#CBD5E1]">{session.status}</span>
                                                                                )}
                                                                            </div>
                                                                            <div className="text-[10px] text-slate-500 space-y-1">
                                                                                <div>
                                                                                    {session.time && <span className="font-semibold">{session.time} · </span>}
                                                                                    {new Date(session.date + 'T00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                                                                </div>
                                                                                <div>{resolveTargetName(session.targetId, session.targetType)}</div>
                                                                            </div>
                                                                            <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100 dark:border-[#243A58]">
                                                                                <button
                                                                                    onClick={() => { setViewingSession(session); setActiveSessionPopover(null); }}
                                                                                    className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-slate-500 hover:text-indigo-600 dark:text-white hover:bg-indigo-50 dark:bg-[#1A2D48] dark:hover:bg-indigo-500/15 rounded transition-colors"
                                                                                >
                                                                                    <EyeIcon size={10} /> View
                                                                                </button>
                                                                                {/* "Complete" button removed: tonnage is now tracked at schedule time. */}
                                                                                <button
                                                                                    onClick={() => { setEditingSession({ ...session }); setActiveSessionPopover(null); }}
                                                                                    className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-slate-500 hover:text-indigo-600 dark:text-white hover:bg-indigo-50 dark:bg-[#1A2D48] dark:hover:bg-indigo-500/15 rounded transition-colors"
                                                                                >
                                                                                    <PencilIcon size={10} /> Edit
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => {
                                                                                        setConfirmDeleteItem({ type: 'session', id: session.id, name: session.title || 'this session' });
                                                                                        setActiveSessionPopover(null);
                                                                                    }}
                                                                                    className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                                                >
                                                                                    <Trash2Icon size={10} /> Delete
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                </div>
                                                                        );
                                                                    } else {
                                                                        const event = entry.item;
                                                                        return (
                                                                    <div key={`${event.id}_${dateObj.dateStr}`} className="relative"
                                                                        draggable
                                                                        onDragStart={(e) => { e.stopPropagation(); handleDragStart(e, 'event', event, dateObj.dateStr); }}
                                                                        onDragEnd={handleDragEnd}
                                                                    >
                                                                        <div
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                const popKey = `${event.id}_${dateObj.dateStr}`;
                                                                                setActivePopover(activePopover?.id === popKey ? null : { id: popKey, event });
                                                                                setEditingEvent(null);
                                                                            }}
                                                                            className="flex items-center gap-1.5 px-1.5 py-1 rounded-md border transition-all hover:scale-[1.02] active:scale-95 cursor-grab"
                                                                            style={{
                                                                                backgroundColor: `${event.color}${isDark ? '6B' : '26'}`,
                                                                                borderColor: `${event.color}${isDark ? 'A8' : '55'}`,
                                                                                color: isDark ? '#ffffff' : darkenHex(event.color),
                                                                            }}
                                                                        >
                                                                            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: event.color }} />
                                                                            <span className="text-[9px] font-medium leading-tight truncate">
                                                                                {!event.all_day && event.start_time && (
                                                                                    <span className="font-semibold">{event.start_time} </span>
                                                                                )}
                                                                                {event.title}
                                                                            </span>
                                                                        </div>
                                                                        {/* Event Popover */}
                                                                        {activePopover?.id === `${event.id}_${dateObj.dateStr}` && (
                                                                            <div
                                                                                ref={popoverRef}
                                                                                className={`absolute z-50 left-0 w-56 bg-white dark:bg-[#1A2D48] rounded-lg shadow-xl border border-slate-200 dark:border-[#243A58] animate-in fade-in zoom-in-95 duration-150 ${isBottomRows ? 'bottom-full mb-1' : 'top-full mt-1'}`}
                                                                                onClick={(e) => e.stopPropagation()}
                                                                            >
                                                                                {/* Color accent bar */}
                                                                                <div className="h-1 rounded-t-lg" style={{ backgroundColor: event.color }} />
                                                                                <div className="p-3 space-y-2">
                                                                                    <div className="flex items-start justify-between">
                                                                                        <h4 className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0] leading-tight">{event.title}</h4>
                                                                                        <button onClick={() => { setActivePopover(null); }} className="p-0.5 text-slate-300 hover:text-slate-600 dark:text-[#CBD5E1] transition-colors">
                                                                                            <XIcon size={12} />
                                                                                        </button>
                                                                                    </div>
                                                                                    <span
                                                                                        className="inline-block px-2 py-0.5 rounded text-[9px] font-semibold"
                                                                                        style={{ backgroundColor: `${event.color}20`, color: event.color }}
                                                                                    >
                                                                                        {event.event_type}
                                                                                    </span>
                                                                                    <div className="text-[10px] text-slate-500 space-y-1">
                                                                                        <div>
                                                                                            {event.all_day
                                                                                                ? `All Day · ${new Date(event.start_date + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                                                                                                : `${event.start_time || ''}${event.end_time ? ' – ' + event.end_time : ''} · ${new Date(event.start_date + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                                                                                            }
                                                                                        </div>
                                                                                        {event.location && (
                                                                                            <div className="flex items-center gap-1">
                                                                                                <MapPinIcon size={9} className="text-slate-400 shrink-0" />
                                                                                                {event.location}
                                                                                            </div>
                                                                                        )}
                                                                                        {event.description && (
                                                                                            <p className="text-slate-400 leading-relaxed">{event.description}</p>
                                                                                        )}
                                                                                    </div>
                                                                                    <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100 dark:border-[#243A58]">
                                                                                        <button
                                                                                            onClick={() => { setEditingEvent({ ...event, all_day: event.all_day || false }); setActivePopover(null); }}
                                                                                            className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-slate-500 hover:text-indigo-600 dark:text-white hover:bg-indigo-50 dark:bg-[#1A2D48] dark:hover:bg-indigo-500/15 rounded transition-colors"
                                                                                        >
                                                                                            <PencilIcon size={10} /> Edit
                                                                                        </button>
                                                                                        <button
                                                                                            onClick={() => {
                                                                                                setConfirmDeleteItem({ type: 'event', id: event.id, name: event.title || 'this event' });
                                                                                                setActivePopover(null);
                                                                                            }}
                                                                                            className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                                                        >
                                                                                            <Trash2Icon size={10} /> Delete
                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                        );
                                                                    }
                                                                });
                                                            })()}
                                                            </div>{/* end hidden sm:block */}
                                                            {/* +X more button (sm+) + overflow panel (all sizes) */}
                                                            {(() => {
                                                                const daySessions = filteredSessionsForCalendar.filter(s => s.date === dateObj.dateStr)
                                                                    .map(s => ({ type: 'session' as const, time: s.time || '99:99', item: s }));
                                                                const dayEvents = filteredCalendarEventsForView
                                                                    .filter(e => e.start_date === dateObj.dateStr)
                                                                    .map(e => ({ type: 'event' as const, time: e.all_day ? '00:00' : (e.start_time || '99:99'), item: e }));
                                                                const allItems = [...daySessions, ...dayEvents].sort((a, b) => a.time.localeCompare(b.time));
                                                                const total = allItems.length;
                                                                const hidden = total - 3;
                                                                if (hidden <= 0 && overflowDay !== dateObj.dateStr) return null;

                                                                return (
                                                                    <div className="relative">
                                                                        {hidden > 0 && (
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setOverflowDay(overflowDay === dateObj.dateStr ? null : dateObj.dateStr);
                                                                                setActivePopover(null);
                                                                            }}
                                                                            className="hidden sm:block w-full text-[9px] text-indigo-500 hover:text-indigo-700 dark:text-white font-semibold text-center pt-0.5 hover:bg-indigo-50 dark:bg-[#1A2D48] dark:hover:bg-indigo-500/15 rounded transition-colors cursor-pointer"
                                                                        >
                                                                            +{hidden} more
                                                                        </button>
                                                                        )}
                                                                        {overflowDay === dateObj.dateStr && (
                                                                            <div
                                                                                ref={overflowRef}
                                                                                className={`absolute z-50 left-0 w-60 bg-white dark:bg-[#1A2D48] rounded-lg shadow-xl border border-slate-200 dark:border-[#243A58] animate-in fade-in zoom-in-95 duration-150 max-h-64 overflow-y-auto ${isBottomRows ? 'bottom-full mb-1' : 'top-full mt-1'}`}
                                                                                onClick={(e) => e.stopPropagation()}
                                                                            >
                                                                                <div className="px-3 py-2 border-b border-slate-100 dark:border-[#243A58] bg-slate-50 dark:bg-[#243A58] rounded-t-lg">
                                                                                    <div className="flex items-center justify-between">
                                                                                        <span className="text-[10px] font-bold text-slate-600 dark:text-[#CBD5E1] uppercase tracking-wider">
                                                                                            {new Date(dateObj.dateStr + 'T00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                                                                        </span>
                                                                                        <span className="text-[9px] text-slate-400">{total} items</span>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="p-2 space-y-1">
                                                                                    {allItems.map(entry => {
                                                                                        if (entry.type === 'session') {
                                                                                            const session = entry.item;
                                                                                            const tc = getTargetColor(session.targetId);
                                                                                            return (
                                                                                            <div
                                                                                                key={session.id}
                                                                                                draggable
                                                                                                onDragStart={(e) => { e.stopPropagation(); handleDragStart(e, 'session', session, dateObj.dateStr); }}
                                                                                                onDragEnd={() => { handleDragEnd(); setOverflowDay(null); }}
                                                                                                onClick={() => { setViewingSession(session); setOverflowDay(null); }}
                                                                                                className={`flex items-center gap-2 p-1.5 rounded-md border cursor-grab transition-all hover:scale-[1.02] active:scale-95 ${tc.bg} ${tc.border} ${tc.text}`}
                                                                                                style={isDark ? { backgroundColor: tc.darkBg, borderColor: tc.darkBorder, color: tc.darkText } : undefined}
                                                                                            >
                                                                                                <div className="flex-1 min-w-0">
                                                                                                    <div className="text-[9px] font-medium leading-tight truncate">{session.title}</div>
                                                                                                    <div className="text-[8px] opacity-70 truncate">
                                                                                                        {session.time && <span className="font-semibold">{session.time} · </span>}
                                                                                                        {resolveTargetName(session.targetId, session.targetType)}
                                                                                                    </div>
                                                                                                </div>
                                                                                                {session.load && (
                                                                                                    <span className={`text-[7px] font-bold uppercase px-1 py-px rounded shrink-0 ${
                                                                                                        session.load === 'High' ? 'bg-red-500 text-white' :
                                                                                                        session.load === 'Medium' ? 'bg-amber-400 text-white' :
                                                                                                        'bg-emerald-400 text-white'
                                                                                                    }`}>{session.load[0]}</span>
                                                                                                )}
                                                                                            </div>
                                                                                            );
                                                                                        } else {
                                                                                            const event = entry.item;
                                                                                            return (
                                                                                        <div
                                                                                            key={event.id}
                                                                                            draggable
                                                                                            onDragStart={(e) => { e.stopPropagation(); handleDragStart(e, 'event', event, dateObj.dateStr); }}
                                                                                            onDragEnd={() => { handleDragEnd(); setOverflowDay(null); }}
                                                                                            onClick={() => {
                                                                                                setOverflowDay(null);
                                                                                                const popKey = `${event.id}_${dateObj.dateStr}`;
                                                                                                setActivePopover({ id: popKey, event });
                                                                                            }}
                                                                                            className="flex items-center gap-1.5 px-1.5 py-1 rounded-md border cursor-grab transition-all hover:scale-[1.02] active:scale-95"
                                                                                            style={{
                                                                                                backgroundColor: `${event.color}${isDark ? '6B' : '26'}`,
                                                                                                borderColor: `${event.color}${isDark ? 'A8' : '55'}`,
                                                                                                color: isDark ? '#ffffff' : darkenHex(event.color),
                                                                                            }}
                                                                                        >
                                                                                            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: event.color }} />
                                                                                            <span className="text-[9px] font-medium leading-tight truncate flex-1">
                                                                                                {!event.all_day && event.start_time && (
                                                                                                    <span className="font-semibold">{event.start_time} </span>
                                                                                                )}
                                                                                                {event.title}
                                                                                            </span>
                                                                                        </div>
                                                                                            );
                                                                                        }
                                                                                    })}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── Edit Event Modal ── */}
                    {editingEvent && (() => {
                        const allEventTypes = [...DEFAULT_EVENT_TYPES, ...(customEventTypes || [])];
                        const INPUT = 'w-full bg-slate-50 dark:bg-[#1A2D48] border border-slate-200 dark:border-[#243A58] text-slate-900 dark:text-[#E2E8F0] rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors';
                        const LABEL = 'text-xs font-medium text-slate-600 dark:text-[#CBD5E1] block mb-1.5';
                        return (
                            <div className="fixed inset-0 z-[700] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setEditingEvent(null)}>
                                <div className="bg-white dark:bg-[#1A2D48] rounded-xl shadow-xl border border-slate-200 dark:border-[#243A58] w-full max-w-lg animate-in zoom-in-95 fade-in duration-200 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                                    {/* Header */}
                                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-[#243A58]">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: editingEvent.color || '#6366f1' }}>
                                                <PencilIcon size={16} />
                                            </div>
                                            <div>
                                                <h2 className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0]">Edit Event</h2>
                                                <p className="text-[10px] text-slate-400 mt-0.5">Update event details</p>
                                            </div>
                                        </div>
                                        <button onClick={() => setEditingEvent(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-[#1A2D48] rounded-lg text-slate-400 transition-colors">
                                            <XIcon size={18} />
                                        </button>
                                    </div>

                                    {/* Form */}
                                    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                                        {/* Title */}
                                        <div>
                                            <label className={LABEL}>Event Name</label>
                                            <input type="text" value={editingEvent.title || ''} onChange={e => setEditingEvent({ ...editingEvent, title: e.target.value })} className={INPUT} />
                                        </div>

                                        {/* Event Type */}
                                        <div>
                                            <label className={LABEL}>Event Type</label>
                                            <CustomSelect
                                                value={editingEvent.event_type || 'Appointment'}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    const match = allEventTypes.find(t => t.label === val);
                                                    setEditingEvent({ ...editingEvent, event_type: val, ...(match ? { color: match.color } : {}) });
                                                }}
                                                variant="form"
                                            >
                                                {allEventTypes.map(t => <option key={t.label} value={t.label}>{t.label}</option>)}
                                            </CustomSelect>
                                        </div>

                                        {/* Color */}
                                        <div>
                                            <label className={LABEL}>Color</label>
                                            <div className="flex items-center gap-2">
                                                {PRESET_COLORS.map(c => (
                                                    <button key={c} onClick={() => setEditingEvent({ ...editingEvent, color: c })}
                                                        className={`w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center ${editingEvent.color === c ? 'border-slate-900 scale-110' : 'border-slate-200 hover:border-slate-400'}`}
                                                        style={{ backgroundColor: c }}
                                                    >
                                                        {editingEvent.color === c && <CheckIcon size={12} className="text-white" />}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Description */}
                                        <div>
                                            <label className={LABEL}>Description</label>
                                            <textarea value={editingEvent.description || ''} onChange={e => setEditingEvent({ ...editingEvent, description: e.target.value })} placeholder="Add event details..." rows={3} className={INPUT + ' resize-none'} />
                                        </div>

                                        {/* Location */}
                                        <div>
                                            <label className={LABEL}>Location</label>
                                            <div className="relative">
                                                <MapPinIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <input type="text" value={editingEvent.location || ''} onChange={e => setEditingEvent({ ...editingEvent, location: e.target.value })} placeholder="e.g. Training Facility..." className={INPUT + ' pl-9'} />
                                            </div>
                                        </div>

                                        {/* Assign To */}
                                        <div>
                                            <label className={LABEL}>Assign To</label>
                                            <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-[#243A58] w-fit mb-2">
                                                {(['none', 'team', 'individual'] as const).map(opt => (
                                                    <button
                                                        key={opt}
                                                        onClick={() => setEditingEvent({ ...editingEvent, assigned_to_type: opt === 'none' ? null : opt, assigned_to_id: null })}
                                                        className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold transition-all ${(opt === 'none' ? !editingEvent.assigned_to_type : editingEvent.assigned_to_type === opt) ? 'bg-slate-900 dark:bg-indigo-600 text-white' : 'bg-white dark:bg-[#0F1C30] text-slate-500 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-[#1A2D48]'}`}
                                                    >
                                                        {opt === 'team' && <UsersIcon size={12} />}
                                                        {opt === 'individual' && <UserIcon size={12} />}
                                                        {opt === 'none' ? 'No one' : opt === 'team' ? 'Team' : 'Athlete'}
                                                    </button>
                                                ))}
                                            </div>
                                            {editingEvent.assigned_to_type === 'team' && (
                                                <CustomSelect
                                                    value={editingEvent.assigned_to_id || ''}
                                                    onChange={e => setEditingEvent({ ...editingEvent, assigned_to_id: e.target.value || null })}
                                                    variant="form"
                                                    placeholder="Select a team..."
                                                >
                                                    <option value="">Select a team...</option>
                                                    {(teams || []).map((t: any) => (
                                                        <option key={t.id} value={t.id}>{t.name}</option>
                                                    ))}
                                                </CustomSelect>
                                            )}
                                            {editingEvent.assigned_to_type === 'individual' && (
                                                <CustomSelect
                                                    value={editingEvent.assigned_to_id || ''}
                                                    onChange={e => setEditingEvent({ ...editingEvent, assigned_to_id: e.target.value || null })}
                                                    variant="form"
                                                    placeholder="Select an athlete..."
                                                >
                                                    <option value="">Select an athlete...</option>
                                                    {(teams || []).flatMap((t: any) =>
                                                        (t.players || []).map((p: any) => (
                                                            <option key={p.id} value={p.id}>{p.name}{t.name ? ` — ${t.name}` : ''}</option>
                                                        ))
                                                    )}
                                                </CustomSelect>
                                            )}
                                        </div>

                                        {/* All Day Toggle */}
                                        <div className="flex items-center gap-3">
                                            <button onClick={() => setEditingEvent({ ...editingEvent, all_day: !editingEvent.all_day })}
                                                className={`w-10 h-5 rounded-full transition-colors relative ${editingEvent.all_day ? 'bg-indigo-600' : 'bg-slate-200'}`}
                                            >
                                                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${editingEvent.all_day ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                            </button>
                                            <span className="text-xs font-medium text-slate-700 dark:text-[#CBD5E1]">All Day</span>
                                        </div>

                                        {/* Date */}
                                        <div>
                                            <label className={LABEL}>Date</label>
                                            <input type="date" value={editingEvent.start_date || ''} onChange={e => setEditingEvent({ ...editingEvent, start_date: e.target.value, end_date: e.target.value })} className={INPUT} />
                                        </div>

                                        {/* Time */}
                                        {!editingEvent.all_day && (
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className={LABEL}>Start Time</label>
                                                    <div className="relative">
                                                        <ClockIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                        <input type="time" value={editingEvent.start_time || ''} onChange={e => setEditingEvent({ ...editingEvent, start_time: e.target.value })} className={INPUT + ' pl-9'} />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className={LABEL}>End Time</label>
                                                    <div className="relative">
                                                        <ClockIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                        <input type="time" value={editingEvent.end_time || ''} onChange={e => setEditingEvent({ ...editingEvent, end_time: e.target.value })} className={INPUT + ' pl-9'} />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Footer */}
                                    <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
                                        <button onClick={() => setEditingEvent(null)} className="flex-1 py-2.5 bg-slate-50 text-slate-500 rounded-lg text-sm font-medium hover:bg-slate-100 dark:hover:bg-[#1A2D48] transition-colors">
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => {
                                                handleUpdateCalendarEvent(editingEvent.id, {
                                                    title: editingEvent.title,
                                                    event_type: editingEvent.event_type,
                                                    color: editingEvent.color,
                                                    description: editingEvent.description || null,
                                                    location: editingEvent.location || null,
                                                    all_day: editingEvent.all_day,
                                                    start_date: editingEvent.start_date,
                                                    end_date: editingEvent.start_date,
                                                    start_time: editingEvent.all_day ? null : (editingEvent.start_time || null),
                                                    end_time: editingEvent.all_day ? null : (editingEvent.end_time || null),
                                                    assigned_to_type: editingEvent.assigned_to_type || null,
                                                    assigned_to_id: editingEvent.assigned_to_id || null,
                                                });
                                                setEditingEvent(null);
                                            }}
                                            disabled={!editingEvent.title?.trim()}
                                            className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-500 transition-colors disabled:opacity-40"
                                        >
                                            Save Changes
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* ── Edit Session Modal ── */}
                    {editingSession && (() => {
                        const PHASES = ['Strength', 'Power', 'Hypertrophy', 'Endurance', 'Speed', 'Recovery', 'Testing', 'Pre-Season', 'In-Season', 'Off-Season'];
                        const LOADS = ['Low', 'Medium', 'High'];
                        const INPUT = 'w-full bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-[#E2E8F0] placeholder:text-slate-400 dark:placeholder:text-[#475569] outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors';
                        const LABEL = 'text-xs font-medium text-slate-600 dark:text-[#CBD5E1] block mb-1.5';
                        return (
                            <div className="fixed inset-0 z-[700] flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-sm p-4" onClick={() => setEditingSession(null)}>
                                <div className="bg-white dark:bg-[#132338] rounded-xl shadow-xl border border-slate-200 dark:border-[#243A58] w-full max-w-md animate-in zoom-in-95 fade-in duration-200 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                                    {/* Header */}
                                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                                                <DumbbellIcon size={16} />
                                            </div>
                                            <h3 className="text-lg font-bold text-slate-900 dark:text-[#E2E8F0]">Edit Session</h3>
                                        </div>
                                        <button onClick={() => setEditingSession(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-[#1A2D48] rounded-lg text-slate-400 transition-colors">
                                            <XIcon size={16} />
                                        </button>
                                    </div>
                                    <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
                                        {/* Title */}
                                        <div>
                                            <label className={LABEL}>Title</label>
                                            <input value={editingSession.title || ''} onChange={e => setEditingSession(p => ({ ...p, title: e.target.value }))} className={INPUT} />
                                        </div>
                                        {/* Date & Time */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className={LABEL}>Date</label>
                                                <input type="date" value={editingSession.date || ''} onChange={e => setEditingSession(p => ({ ...p, date: e.target.value }))} className={INPUT} />
                                            </div>
                                            <div>
                                                <label className={LABEL}>Time</label>
                                                <input type="time" value={editingSession.time || ''} onChange={e => setEditingSession(p => ({ ...p, time: e.target.value }))} className={INPUT} />
                                            </div>
                                        </div>
                                        {/* Phase & Load */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className={LABEL}>Training Phase</label>
                                                <CustomSelect value={editingSession.trainingPhase || ''} onChange={e => setEditingSession(p => ({ ...p, trainingPhase: e.target.value }))} variant="form">
                                                    {PHASES.map(p => <option key={p} value={p}>{p}</option>)}
                                                </CustomSelect>
                                            </div>
                                            <div>
                                                <label className={LABEL}>Load</label>
                                                <CustomSelect value={editingSession.load || 'Medium'} onChange={e => setEditingSession(p => ({ ...p, load: e.target.value }))} variant="form">
                                                    {LOADS.map(l => <option key={l} value={l}>{l}</option>)}
                                                </CustomSelect>
                                            </div>
                                        </div>
                                        {/* Status */}
                                        <div>
                                            <label className={LABEL}>Status</label>
                                            <CustomSelect value={editingSession.status || 'Scheduled'} onChange={e => setEditingSession(p => ({ ...p, status: e.target.value }))} variant="form">
                                                <option value="Scheduled">Scheduled</option>
                                                <option value="Completed">Completed</option>
                                                <option value="Cancelled">Cancelled</option>
                                            </CustomSelect>
                                        </div>
                                    </div>
                                    {/* Footer */}
                                    <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
                                        <button onClick={() => setEditingSession(null)} className="flex-1 py-2.5 bg-slate-50 text-slate-500 rounded-lg text-sm font-medium hover:bg-slate-100 dark:hover:bg-[#1A2D48] transition-colors">
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => {
                                                handleUpdateSession(editingSession.id, {
                                                    title: editingSession.title,
                                                    date: editingSession.date,
                                                    time: editingSession.time || null,
                                                    trainingPhase: editingSession.trainingPhase,
                                                    load: editingSession.load,
                                                    status: editingSession.status,
                                                });
                                                setEditingSession(null);
                                            }}
                                            disabled={!editingSession.title?.trim()}
                                            className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-500 transition-colors disabled:opacity-40"
                                        >
                                            Save Changes
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                    {/* Intervention Modal */}
                    <InterventionModal
                        athlete={selectedInterventionAthlete}
                        isOpen={isInterventionModalOpen}
                        onClose={() => { setIsInterventionModalOpen(false); setSelectedInterventionAthlete(null); }}
                        loadRecords={loadRecords || []}
                        wellnessData={wellnessData || []}
                        acwrOptions={selectedInterventionAthlete ? getAthleteAcwrOptions(selectedInterventionAthlete.id) : {}}
                    />
                    {/* (Complete Session popover removed — plan-time tonnage tracking replaces it.) */}
                    <ConfirmDeleteModal
                        isOpen={!!confirmDeleteItem}
                        title={confirmDeleteItem?.type === 'session' ? 'Delete Session' : 'Delete Event'}
                        message={`Are you sure you want to delete "${confirmDeleteItem?.name}"?`}
                        onConfirm={() => {
                            if (confirmDeleteItem?.type === 'session') handleDeleteSession(confirmDeleteItem.id);
                            else handleDeleteCalendarEvent(confirmDeleteItem.id);
                            setConfirmDeleteItem(null);
                        }}
                        onCancel={() => setConfirmDeleteItem(null)}
                    />
                </>);
            }
