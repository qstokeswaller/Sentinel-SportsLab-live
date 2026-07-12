// @ts-nocheck
import React from 'react';
import { Link } from 'react-router-dom';
import { useAppState } from '../context/AppStateContext';
import {
    AlertTriangleIcon, CalendarIcon, FilterIcon,
    ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, UserIcon, UsersIcon, PlusIcon, CheckCircle2Icon,
    MapPinIcon, PencilIcon, Trash2Icon, XIcon, ClockIcon, CheckIcon,
    Activity as ActivityIcon, Timer as TimerIcon, Dumbbell as DumbbellIcon, Link2 as Link2Icon, EyeIcon,
    ExternalLinkIcon, GripVertical as GripVerticalIcon, InfoIcon,
} from 'lucide-react';

import InterventionModal from '../components/analytics/InterventionModal';
import { CustomSelect } from '../components/ui/CustomSelect';
import { DatabaseService } from '../services/databaseService';
import { ConfirmDeleteModal } from '../components/ui/ConfirmDeleteModal';
import { computeComposite, computeAthleteBaseline, scoreToHex } from '../utils/wellnessScoring';
import { AthleteAvatar } from '../components/roster/AthleteAvatar';
import { AssigneePicker } from '../components/calendar/AssigneePicker';
import { CalendarPopover, EventDetailPopover } from '../components/calendar/CalendarPopovers';
import { KpiInfoModal, type KpiInfoKey } from './dashboard/KpiInfoModal';
import MorningReport from './dashboard/MorningReport';
import CalendarWeekView from './dashboard/CalendarWeekView';
import CalendarMonthView from './dashboard/CalendarMonthView';
import EditEventModal from './dashboard/EditEventModal';
import EditSessionModal from './dashboard/EditSessionModal';

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
        setAddEventPresetDate,
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
    // Which KPI tile's "What is this?" modal is currently open: null | 'flagged' | 'acwr' | 'sleep' | 'readiness'
    const [kpiInfoOpen, setKpiInfoOpen] = React.useState<null | 'flagged' | 'acwr' | 'sleep' | 'readiness'>(null);
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
            // Ctrl+drop = copy event. Pass silent:true so the handler doesn't also
            // fire its "Event created successfully" toast — the copy shows a single
            // "Event copied" instead (was firing both = double notification).
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
            }, { silent: true });
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

    // Resolve the assignees shown on a calendar event. Events store an `assignees`
    // JSONB array of { type: 'team'|'individual', id }; older rows only have the
    // legacy single assigned_to_type/assigned_to_id — we fall back to those.
    // Returns an array of { name, isTeam }. Names are truncated at the render site
    // and capped (3 shown + "+N more") so big rosters never overflow the bubble.
    const getEventAssignees = (event) => {
        const raw = (Array.isArray(event?.assignees) && event.assignees.length > 0)
            ? event.assignees
            : (event?.assigned_to_type && event?.assigned_to_id
                ? [{ type: event.assigned_to_type, id: event.assigned_to_id }]
                : []);
        return raw.map(a => {
            if (a.type === 'team') {
                const team = teams.find(t => t.id === a.id);
                return team ? { name: team.name, isTeam: true } : null;
            }
            const player = teams.flatMap(t => t.players).find(p => p.id === a.id);
            return player ? { name: player.name, isTeam: false } : null;
        }).filter(Boolean);
    };

    // Close popover on click outside — industry-standard dismissal.
    // Also closes on ESC key (standard accessibility pattern).
    // Note: mousedown fires before click, so any outbound click starts a close
    // before the target's own click handler runs. Popover contents use
    // e.stopPropagation() on their own click handlers so intra-popover clicks
    // don't trigger the outside-click closer.
    React.useEffect(() => {
        if (!activePopover && !activeSessionPopover && !overflowDay) return;
        const handleMouse = (e) => {
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
        const handleKey = (e) => {
            if (e.key !== 'Escape') return;
            if (activePopover) { setActivePopover(null); setEditingEvent(null); }
            if (activeSessionPopover) setActiveSessionPopover(null);
            if (overflowDay) setOverflowDay(null);
        };
        document.addEventListener('mousedown', handleMouse);
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('mousedown', handleMouse);
            document.removeEventListener('keydown', handleKey);
        };
    }, [activePopover, activeSessionPopover, overflowDay]);


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
        // Normalise an event's assignees to a {type,id}[] — new `assignees` array
        // if present, else the legacy single columns. Filters below match if ANY
        // assignee satisfies the criterion (an event can now target several).
        const rawAssignees = (e: any) => (Array.isArray(e?.assignees) && e.assignees.length > 0)
            ? e.assignees
            : (e?.assigned_to_type && e?.assigned_to_id ? [{ type: e.assigned_to_type, id: e.assigned_to_id }] : []);

        if (calendarFilterCategory === 'all' || calendarFilterCategory === 'trainer') {
            return calendarEvents;
        }
        if (calendarFilterCategory === 'teams') {
            if (calendarFilterTeamId) {
                return calendarEvents.filter(e => rawAssignees(e).some((a: any) =>
                    (a.type === 'team' && a.id === calendarFilterTeamId) ||
                    (a.type === 'individual' && selectedTeamPlayerIds.includes(a.id))
                ));
            }
            // All teams selected — show any event with at least one team assignee
            return calendarEvents.filter(e => rawAssignees(e).some((a: any) => a.type === 'team'));
        }
        if (calendarFilterCategory === 'athletes') {
            if (calendarFilterAthleteId) {
                return calendarEvents.filter(e => rawAssignees(e).some((a: any) =>
                    a.type === 'individual' && a.id === calendarFilterAthleteId
                ));
            }
            if (calendarFilterTeamId) {
                return calendarEvents.filter(e => rawAssignees(e).some((a: any) =>
                    (a.type === 'team' && a.id === calendarFilterTeamId) ||
                    (a.type === 'individual' && selectedTeamPlayerIds.includes(a.id))
                ));
            }
            return calendarEvents.filter(e => rawAssignees(e).some((a: any) => a.type === 'individual'));
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
                        <div data-tour="dashboard-kpis" className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                            {/* Players Flagged */}
                            <div className="bg-white dark:bg-gradient-to-br dark:from-rose-950/90 dark:to-[#132338] rounded-xl border border-slate-200 dark:border-rose-800/50 shadow-sm p-4 flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-slate-900 dark:text-[#E2E8F0] uppercase tracking-wider">Flagged</span>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => setKpiInfoOpen('flagged')}
                                            title="What is this tile?"
                                            className="w-5 h-5 rounded-md flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                                        >
                                            <InfoIcon size={12} />
                                        </button>
                                        <div className="w-7 h-7 bg-rose-50 dark:bg-rose-900/20 rounded-lg flex items-center justify-center">
                                            <AlertTriangleIcon size={13} className="text-rose-500" />
                                        </div>
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
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => setKpiInfoOpen('acwr')}
                                            title="What is this tile?"
                                            className="w-5 h-5 rounded-md flex items-center justify-center text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                                        >
                                            <InfoIcon size={12} />
                                        </button>
                                        <div className="w-7 h-7 bg-amber-50 dark:bg-amber-900/20 rounded-lg flex items-center justify-center">
                                            <ActivityIcon size={13} className="text-amber-500" />
                                        </div>
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
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => setKpiInfoOpen('sleep')}
                                            title="What is this tile?"
                                            className="w-5 h-5 rounded-md flex items-center justify-center text-slate-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-colors"
                                        >
                                            <InfoIcon size={12} />
                                        </button>
                                        <div className="w-7 h-7 bg-sky-50 dark:bg-sky-900/20 rounded-lg flex items-center justify-center">
                                            <ClockIcon size={13} className="text-sky-500" />
                                        </div>
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
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => setKpiInfoOpen('readiness')}
                                            title="What is this tile?"
                                            className="w-5 h-5 rounded-md flex items-center justify-center text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                                        >
                                            <InfoIcon size={12} />
                                        </button>
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
                                        <div className="px-4 py-3 border-b border-slate-100 dark:border-[#243A58] bg-rose-50/60 dark:bg-rose-900/15 flex items-center gap-2.5">
                                            <div className="w-8 h-8 bg-rose-200 dark:bg-rose-500/20 rounded-lg animate-pulse" />
                                            <div className="space-y-1">
                                                <div className="h-3 w-24 bg-rose-100 dark:bg-rose-500/15 rounded animate-pulse" />
                                                <div className="h-2 w-16 bg-rose-50 dark:bg-rose-500/10 rounded animate-pulse" />
                                            </div>
                                        </div>
                                        <div className="p-2.5 space-y-1.5 flex-1">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-slate-50/50 dark:bg-[#0F1C30]/60">
                                                    <div className="w-7 h-7 rounded-md bg-slate-100 dark:bg-[#1A2D48] animate-pulse" />
                                                    <div className="flex-1 h-3 bg-slate-100 dark:bg-[#1A2D48] rounded animate-pulse" />
                                                    <div className="w-8 h-4 bg-slate-100 dark:bg-[#1A2D48] rounded animate-pulse" />
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex flex-col items-center py-4">
                                            <div className="w-5 h-5 border-2 border-rose-200 dark:border-rose-800/50 border-t-rose-500 rounded-full animate-spin mb-1.5" />
                                            <span className="text-[10px] font-medium text-slate-400 dark:text-[#94A3B8]">Loading performance report...</span>
                                        </div>
                                    </div>
                                )}
                                {!isLoading && <MorningReport {...{ acwrEnabledAthleteIds, acwrExclusions, calculateACWR, hasAnyAcwrEnabled, heatmapTeamFilter, isMorningReportExpanded, isReportCollapsed, loadRecords, setIsInterventionModalOpen, setIsMorningReportExpanded, setSelectedInterventionAthlete, teams, toggleReportCollapsed }} />}
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
                                                                                const fallbackBg = isCritical
                                                                                    ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-300'
                                                                                    : 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300';
                                                                                return (
                                                                                    <div key={aid} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 border ${isCritical ? 'bg-white dark:bg-[#132338] border-slate-100 dark:border-rose-500/30' : 'bg-white dark:bg-[#132338] border-slate-100 dark:border-amber-500/30'}`}>
                                                                                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isCritical ? 'bg-rose-500' : 'bg-amber-400'}`} />
                                                                                        <AthleteAvatar
                                                                                            player={player || { name: 'Unknown' }}
                                                                                            size="xs"
                                                                                            className="w-6 h-6"
                                                                                            fallbackClass={fallbackBg}
                                                                                            fallbackTextSize="text-[8px]"
                                                                                        />
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
                                {calendarViewMode === 'week' && <CalendarWeekView {...{ activePopover, activeSessionPopover, darkenHex, dragOverDate, filteredCalendarEventsForView, filteredSessionsForCalendar, getEventAssignees, getTargetColor, handleDragEnd, handleDragLeave, handleDragOver, handleDragStart, handleDrop, isDark, overflowDay, overflowRef, popoverRef, resolveTargetName, sessionPopoverRef, setActivePopover, setActiveSessionPopover, setAddEventPresetDate, setConfirmDeleteItem, setEditingEvent, setEditingSession, setIsAddEventModalOpen, setOverflowDay, setViewingSession, weekDays }} />}

                                {/* ── Month View ── */}
                                {calendarViewMode === 'month' && <CalendarMonthView {...{ activePopover, activeSessionPopover, darkenHex, dashboardCalendarDays, dragOverDate, filteredCalendarEventsForView, filteredSessionsForCalendar, getEventAssignees, getTargetColor, handleDragEnd, handleDragLeave, handleDragOver, handleDragStart, handleDrop, isDark, overflowDay, overflowRef, popoverRef, resolveTargetName, sessionPopoverRef, setActivePopover, setActiveSessionPopover, setAddEventPresetDate, setConfirmDeleteItem, setEditingEvent, setEditingSession, setIsAddEventModalOpen, setOverflowDay, setViewingSession }} />}
                            </div>
                        </div>
                    </div>

                    {/* ── Edit Event Modal ── */}
                    {editingEvent && <EditEventModal {...{ customEventTypes, editingEvent, handleUpdateCalendarEvent, setEditingEvent, teams }} />}

                    {/* ── Edit Session Modal ── */}
                    {editingSession && <EditSessionModal {...{ editingSession, handleUpdateSession, setEditingSession }} />}
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
                    <KpiInfoModal which={kpiInfoOpen} onClose={() => setKpiInfoOpen(null)} />
                </>);
            }
