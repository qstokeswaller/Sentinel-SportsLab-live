import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeftIcon, EditIcon, Share2Icon, MoreHorizontalIcon,
    GaugeIcon, HeartIcon, AlertTriangleIcon, FlaskConicalIcon,
    DumbbellIcon, CalendarDaysIcon, TrendingUpIcon, TrendingDownIcon,
    ActivityIcon, ShieldIcon, BadgeCheckIcon, ChevronRightIcon,
    SaveIcon, XIcon, CheckCircle2Icon,
} from 'lucide-react';
import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';
import { useAppState } from '../context/AppStateContext';
import { DatabaseService } from '../services/databaseService';
import { supabase } from '../lib/supabase';
import { AthleteAvatar } from '../components/roster/AthleteAvatar';
import { ShareAthleteModal } from '../components/athlete/ShareAthleteModal';
import { EditAthleteProfileModal } from '../components/athlete/EditAthleteProfileModal';

// ────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────

const daysAgo = (dateStr: string | null | undefined): number | null => {
    if (!dateStr) return null;
    const ms = Date.now() - new Date(dateStr).getTime();
    return Math.floor(ms / 86400000);
};

const fmtDate = (s: string | null | undefined) => {
    if (!s) return '—';
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

const acwrZoneInfo = (v: number | null) => {
    if (v == null) return { zone: '—', color: 'slate', pillClass: 'bg-slate-100 dark:bg-[#0F1C30] text-slate-500 dark:text-[#CBD5E1] border-slate-200 dark:border-[#243A58]' };
    if (v < 0.8)  return { zone: 'Underexposed', color: 'sky',     pillClass: 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-900/50' };
    if (v <= 1.3) return { zone: 'Optimal',      color: 'emerald', pillClass: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50' };
    if (v <= 1.5) return { zone: 'Caution',      color: 'amber',   pillClass: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/50' };
    return { zone: 'Danger', color: 'rose', pillClass: 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50' };
};

const wellnessTone = (key: string, val: number) => {
    // Higher fatigue/stress/soreness = worse; higher sleep = better.
    const bad = /fatigue|stress|soreness|pain|mood/i.test(key);
    if (bad) {
        if (val >= 7) return 'rose';
        if (val >= 5) return 'amber';
        return 'emerald';
    }
    if (val >= 7) return 'emerald';
    if (val >= 5) return 'amber';
    return 'rose';
};

const toneClasses = {
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40',
    amber:   'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/40',
    rose:    'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/40',
    sky:     'bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-900/40',
    slate:   'bg-slate-50 dark:bg-[#0F1C30] text-slate-700 dark:text-[#E2E8F0] border-slate-200 dark:border-[#243A58]',
};

// ────────────────────────────────────────────────────────────────────────
// Reusable bits
// ────────────────────────────────────────────────────────────────────────

const SectionCard: React.FC<{
    icon?: any;
    title: string;
    trailing?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    bodyPadding?: string;
}> = ({ icon: Icon, title, trailing, children, className = '', bodyPadding = 'p-4 sm:p-5' }) => (
    <section className={`bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-xl shadow-sm ${className}`}>
        <header className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-slate-100 dark:border-[#1A2D48]">
            <div className="flex items-center gap-2 min-w-0">
                {Icon && <Icon size={14} className="text-indigo-500 dark:text-indigo-300 shrink-0" />}
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-[#E2E8F0] truncate">{title}</h3>
            </div>
            <div className="shrink-0">{trailing}</div>
        </header>
        <div className={bodyPadding}>{children}</div>
    </section>
);

const EmptyHint: React.FC<{ text: string }> = ({ text }) => (
    <p className="text-xs text-slate-400 dark:text-[#94A3B8] italic">{text}</p>
);

// ────────────────────────────────────────────────────────────────────────
// Snapshot KPI tiles
// ────────────────────────────────────────────────────────────────────────

const KpiTile: React.FC<{
    label: string;
    value: React.ReactNode;
    sub?: React.ReactNode;
    tone?: keyof typeof toneClasses;
    icon?: any;
}> = ({ label, value, sub, tone = 'slate', icon: Icon }) => (
    <div className={`rounded-xl border px-4 py-3 ${toneClasses[tone]}`}>
        <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{label}</span>
            {Icon && <Icon size={12} className="opacity-60" />}
        </div>
        <div className="text-xl font-bold leading-tight">{value}</div>
        {sub && <div className="text-[10px] mt-1 opacity-70">{sub}</div>}
    </div>
);

// Mini sparkline used inside KPI tiles
const Sparkline: React.FC<{ data: number[]; color: string; height?: number }> = ({ data, color, height = 24 }) => {
    if (!data.length) return null;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = Math.max(max - min, 0.001);
    const w = 100;
    const points = data.map((v, i) => {
        const x = (i / Math.max(data.length - 1, 1)) * w;
        const y = height - ((v - min) / range) * (height - 2) - 1;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    return (
        <svg viewBox={`0 0 ${w} ${height}`} className="w-full" preserveAspectRatio="none" style={{ height }}>
            <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" />
        </svg>
    );
};

// ────────────────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────────────────

export const AthleteProfilePage: React.FC = () => {
    const { athleteId } = useParams<{ athleteId: string }>();
    const navigate = useNavigate();

    const {
        teams,
        wellnessData,
        injuryReports,
        loadRecords,
        acwrSettings,
        calculateACWR,
        getAthleteAcwrOptions,
        scheduledSessions,
        handleUpdateAthlete,
        periodizationPlans,
        isDarkMode,
    } = useAppState();

    const tooltipStyle = isDarkMode
        ? { background: '#0F1C30', border: '1px solid #243A58', fontSize: 11, color: '#E2E8F0' }
        : { background: '#fff', border: '1px solid #e2e8f0', fontSize: 11 };

    // Resolve athlete from teams
    const { athlete, team } = useMemo(() => {
        for (const t of teams || []) {
            const found = (t.players || []).find(p => p.id === athleteId);
            if (found) return { athlete: found, team: t };
        }
        return { athlete: null, team: null };
    }, [teams, athleteId]);

    const [tonnageRows, setTonnageRows] = useState<any[]>([]);
    const [editingNotes, setEditingNotes] = useState(false);
    const [notesDraft, setNotesDraft] = useState({ goals: '', notes: '' });
    const [savingNotes, setSavingNotes] = useState(false);
    const [shareOpen, setShareOpen] = useState(false);
    const [editProfileOpen, setEditProfileOpen] = useState(false);

    useEffect(() => {
        if (athlete) setNotesDraft({ goals: athlete.goals || '', notes: athlete.notes || '' });
    }, [athlete?.id]);

    // Fetch tonnage rows for this athlete (last 90 days)
    useEffect(() => {
        if (!athlete?.id) return;
        let cancelled = false;
        (async () => {
            try {
                const from = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
                const { data, error } = await supabase
                    .from('planned_tonnage_log')
                    .select('date, total_tonnage')
                    .eq('athlete_id', athlete.id)
                    .gte('date', from)
                    .order('date', { ascending: true });
                if (!cancelled && !error) setTonnageRows(data || []);
            } catch (e) {
                console.error('Failed to load tonnage:', e);
            }
        })();
        return () => { cancelled = true; };
    }, [athlete?.id]);

    // ── Derived training-load data (all hooks must run unconditionally to satisfy Rules of Hooks) ─
    const teamId = team?.id;
    const isPrivate = teamId === 't_private';
    const acwrEnabled = athlete && teamId && (isPrivate
        ? acwrSettings[`ind_${athlete.id}`]?.enabled
        : acwrSettings[teamId]?.enabled);

    let acwrValue: number | null = null;
    if (acwrEnabled && athlete) {
        try { acwrValue = calculateACWR(athlete.id); } catch { acwrValue = null; }
    }
    const acwrInfo = acwrZoneInfo(acwrValue);

    // 28-day ACWR series: bucket loads daily, compute 7d/28d ratio per day with real dates
    const acwrSeries: { date: string; label: string; value: number }[] = useMemo(() => {
        const out: { date: string; label: string; value: number }[] = [];
        const byDay = new Map<string, number>();
        for (const r of (loadRecords || [])) {
            if (!(r.athleteId === athlete?.id || r.athlete_id === athlete?.id)) continue;
            const d = (r.date || '').slice(0, 10);
            if (!d) continue;
            byDay.set(d, (byDay.get(d) || 0) + (r.value || r.sRPE || 0));
        }
        if (byDay.size < 7) return [];
        const sortedDates = Array.from(byDay.keys()).sort();
        const lastDate = new Date(sortedDates[sortedDates.length - 1]);
        const window: { d: string; v: number }[] = [];
        for (let i = 27; i >= 0; i--) {
            const dt = new Date(lastDate);
            dt.setDate(lastDate.getDate() - i);
            const key = dt.toISOString().slice(0, 10);
            window.push({ d: key, v: byDay.get(key) || 0 });
        }
        for (let i = 6; i < window.length; i++) {
            const acute = window.slice(Math.max(0, i - 6), i + 1).reduce((s, x) => s + x.v, 0) / 7;
            const chronicStart = Math.max(0, i - 27);
            const chronicCount = i - chronicStart + 1;
            const chronic = window.slice(chronicStart, i + 1).reduce((s, x) => s + x.v, 0) / chronicCount;
            const ratio = chronic > 0 ? acute / chronic : 0;
            const d = new Date(window[i].d);
            const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            out.push({ date: window[i].d, label, value: Number(ratio.toFixed(2)) });
        }
        return out;
    }, [loadRecords, athlete?.id]);

    const acwrSeriesValues = useMemo(() => acwrSeries.map(p => p.value), [acwrSeries]);
    const acwrLatestDate = acwrSeries.length > 0 ? acwrSeries[acwrSeries.length - 1].date : null;

    // ── Wellness ───────────────────────────────────────────────────────
    const athleteWellness = useMemo(() => {
        return (wellnessData || [])
            .filter(w => w.athleteId === athlete?.id || w.athlete_id === athlete?.id)
            .sort((a, b) => new Date(b.date || b.session_date || 0).getTime() - new Date(a.date || a.session_date || 0).getTime());
    }, [wellnessData, athlete?.id]);

    const latestWellness = athleteWellness[0];
    const wellnessFields: [string, number][] = latestWellness?.responses
        ? Object.entries(latestWellness.responses).filter(([_, v]) => typeof v === 'number') as [string, number][]
        : [];

    // Build wellness 14-day trend (avg of all numeric fields per day, normalised 0-10)
    const wellnessTrend = useMemo(() => {
        const rows = athleteWellness.slice(0, 14).reverse();
        return rows.map(w => {
            const dateKey = (w.date || w.session_date || '').slice(0, 10);
            const d = new Date(dateKey);
            const label = Number.isNaN(d.getTime()) ? dateKey.slice(5) : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            const numeric = Object.values(w.responses || {}).filter(v => typeof v === 'number') as number[];
            const fatigue = w.responses?.fatigue ?? null;
            const sleep = w.responses?.sleep ?? null;
            const stress = w.responses?.stress ?? null;
            const soreness = w.responses?.soreness ?? null;
            const avg = numeric.length ? numeric.reduce((s, n) => s + n, 0) / numeric.length : null;
            return { date: dateKey, label, fatigue, sleep, stress, soreness, avg };
        });
    }, [athleteWellness]);

    // ── Injuries ───────────────────────────────────────────────────────
    const athleteInjuries = useMemo(() => {
        return (injuryReports || [])
            .filter(r => r.athleteId === athlete?.id || r.athlete_id === athlete?.id)
            .sort((a, b) => new Date(b.date || b.created_at || 0).getTime() - new Date(a.date || a.created_at || 0).getTime());
    }, [injuryReports, athlete?.id]);

    const activeInjuries = athleteInjuries.filter(r => r.status !== 'resolved');
    const historicalInjuries = athleteInjuries.filter(r => r.status === 'resolved');

    // ── Testing ────────────────────────────────────────────────────────
    const performanceMetrics = athlete?.performanceMetrics || [];
    const byTestType = useMemo(() => {
        const map = new Map<string, any[]>();
        for (const m of performanceMetrics) {
            if (!m.type) continue;
            if (!map.has(m.type)) map.set(m.type, []);
            map.get(m.type)!.push(m);
        }
        for (const arr of map.values()) {
            arr.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        }
        return Array.from(map.entries());
    }, [performanceMetrics]);

    const lastTestDate = performanceMetrics.length
        ? performanceMetrics.reduce((latest, m) => new Date(m.date) > new Date(latest) ? m.date : latest, performanceMetrics[0].date)
        : null;
    const daysSinceTest = daysAgo(lastTestDate);

    // ── Tonnage weekly bars ────────────────────────────────────────────
    const weeklyTonnage = useMemo(() => {
        const buckets = new Map<string, number>();
        for (const r of tonnageRows) {
            const d = new Date(r.date);
            const dayOfWeek = d.getDay();
            const monday = new Date(d);
            monday.setDate(d.getDate() - ((dayOfWeek + 6) % 7));
            const key = monday.toISOString().slice(0, 10);
            buckets.set(key, (buckets.get(key) || 0) + Number(r.total_tonnage || 0));
        }
        return Array.from(buckets.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .slice(-12)
            .map(([weekStart, total]) => {
                const d = new Date(weekStart);
                const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                return { week: label, date: weekStart, tonnage: Math.round(total) };
            });
    }, [tonnageRows]);

    const last4WeekTonnage = weeklyTonnage.slice(-4).map(w => w.tonnage);
    const totalRecentTonnage = last4WeekTonnage.reduce((s, n) => s + n, 0);

    // ── Current program & phase ────────────────────────────────────────
    const programInfo = useMemo(() => {
        // Find most recent scheduled_session for this athlete or their team
        const relevant = (scheduledSessions || []).filter(s => {
            if (s.target_type === 'Individual' && s.target_id === athlete?.id) return true;
            if (s.target_type === 'Team' && teamId && s.target_id === teamId) return true;
            return false;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const today = new Date().toISOString().slice(0, 10);
        const current = relevant.find(s => s.date >= today) || relevant[0];
        const previous = relevant.find(s => s.date < today);

        return {
            current: current ? { title: current.title || current.session_name || 'Session', date: current.date, status: current.status } : null,
            previous: previous ? { title: previous.title || previous.session_name || 'Session', date: previous.date, status: previous.status } : null,
            total: relevant.length,
        };
    }, [scheduledSessions, athlete?.id, teamId]);

    // ── Periodisation phase ────────────────────────────────────────────
    const phaseInfo = useMemo(() => {
        if (!athlete) return null;
        const today = new Date().toISOString().slice(0, 10);
        const relevantPlans = (periodizationPlans || []).filter(plan => {
            if (plan.targetType === 'Individual' && plan.targetId === athlete.id) return true;
            if (plan.targetType === 'Team' && teamId && plan.targetId === teamId) return true;
            return false;
        });
        for (const plan of relevantPlans) {
            const phase = (plan.phases || []).find(ph => {
                const start = ph.startDate || '';
                const end = ph.endDate || '9999-12-31';
                return start <= today && today <= end;
            });
            if (phase) {
                const block = (phase.blocks || []).find(b => {
                    const start = b.startDate || '';
                    const end = b.endDate || '9999-12-31';
                    return start <= today && today <= end;
                });
                // Compute progress through the phase
                const phaseStart = new Date(phase.startDate).getTime();
                const phaseEnd = phase.endDate ? new Date(phase.endDate).getTime() : phaseStart + 28 * 86400000;
                const now = Date.now();
                const total = Math.max(phaseEnd - phaseStart, 1);
                const progress = Math.min(Math.max((now - phaseStart) / total, 0), 1);
                return { plan, phase, block, progress };
            }
        }
        return null;
    }, [periodizationPlans, athlete?.id, teamId]);

    const saveNotes = async () => {
        if (!athlete?.id) return;
        setSavingNotes(true);
        try {
            await handleUpdateAthlete(athlete.id, { goals: notesDraft.goals, notes: notesDraft.notes });
            setEditingNotes(false);
        } finally {
            setSavingNotes(false);
        }
    };

    // Snapshot builder for share links — freezes the current view
    const buildSnapshot = () => ({
        v: 1,
        generatedAt: new Date().toISOString(),
        athlete: {
            id: athlete.id,
            name: athlete.name,
            position: athlete.position || null,
            sport: athlete.sport || null,
            age: athlete.age || null,
            gender: athlete.gender || null,
            height_cm: athlete.height_cm || null,
            weight_kg: athlete.weight_kg || null,
            image_url: athlete.image_url || null,
            goals: athlete.goals || null,
            notes: athlete.notes || null,
            team_name: team?.name || null,
        },
        acwr: {
            value: acwrValue,
            zone: acwrInfo.zone,
            color: acwrInfo.color,
            series: acwrSeries,
        },
        wellness: latestWellness ? {
            latest: {
                date: latestWellness.date || latestWellness.session_date,
                fields: wellnessFields.map(([k, v]) => ({ key: k, value: v })),
            },
            trend: wellnessTrend,
        } : null,
        injuries: {
            active: activeInjuries.map(i => ({
                body_area: i.body_area || i.area,
                type: i.type,
                severity: i.severity,
                date: i.date,
                notes: i.notes,
            })),
            historical: historicalInjuries.slice(0, 12).map(i => ({
                body_area: i.body_area || i.area,
                type: i.type,
                severity: i.severity,
                date: i.date || i.created_at,
            })),
        },
        testing: byTestType.map(([type, results]) => {
            const latest = results[0];
            const previous = results[1];
            const latestValue = latest.value ?? latest.weight ?? latest.height ?? latest.time ?? latest.avgForce;
            const previousValue = previous ? (previous.value ?? previous.weight ?? previous.height ?? previous.time ?? previous.avgForce) : null;
            const delta = (latestValue != null && previousValue != null)
                ? Number(latestValue) - Number(previousValue)
                : null;
            return {
                type,
                latest: { value: latestValue, unit: latest.unit, date: latest.date },
                delta,
                isBetter: delta != null ? (latest.lowerIsBetter ? delta < 0 : delta > 0) : null,
                count: results.length,
                series: results.slice(0, 8).reverse().map(r => Number(r.value ?? r.weight ?? r.height ?? r.time ?? r.avgForce ?? 0)),
            };
        }),
        tonnage: weeklyTonnage,
        program: programInfo,
        phase: phaseInfo ? {
            name: phaseInfo.phase.name,
            startDate: phaseInfo.phase.startDate,
            endDate: phaseInfo.phase.endDate,
            trainingPhase: phaseInfo.phase.trainingPhase,
            progress: phaseInfo.progress,
            block: phaseInfo.block ? {
                name: phaseInfo.block.name || phaseInfo.block.label,
                intensityLevel: phaseInfo.block.intensityLevel,
                volumeLevel: phaseInfo.block.volumeLevel,
            } : null,
            planName: phaseInfo.plan.name,
        } : null,
    });

    // ────────────────────────────────────────────────────────────────────
    // Render
    // ────────────────────────────────────────────────────────────────────

    if (!athlete) {
        return (
            <div className="max-w-3xl mx-auto py-16 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-slate-100 dark:bg-[#1A2D48] rounded-full mb-3">
                    <AlertTriangleIcon size={20} className="text-slate-400 dark:text-[#CBD5E1]" />
                </div>
                <h2 className="text-base font-semibold text-slate-800 dark:text-[#E2E8F0]">Athlete not found</h2>
                <p className="text-sm text-slate-500 dark:text-[#CBD5E1] mt-1 mb-4">This profile may have been removed or you don't have access.</p>
                <button
                    onClick={() => navigate('/clients')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-full transition-colors"
                >
                    <ArrowLeftIcon size={14} /> Back to Roster
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Back link */}
            <button
                onClick={() => navigate('/clients')}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-[#CBD5E1] hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
            >
                <ArrowLeftIcon size={14} /> Back to Roster
            </button>

            {/* ── HEADER ─────────────────────────────────────────────── */}
            <section className="bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-xl p-5">
                <div className="flex flex-col md:flex-row md:items-center gap-5">
                    <AthleteAvatar player={athlete} size="xl" editable />

                    <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                            <h1 className="text-xl font-bold text-slate-900 dark:text-[#E2E8F0] truncate">{athlete.name}</h1>
                            {athlete.position && (
                                <span className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
                                    {athlete.position}
                                </span>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            {team && (
                                <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-[#CBD5E1]">
                                    <ShieldIcon size={11} /> {team.name}
                                </span>
                            )}
                            {athlete.sport && <span className="text-xs text-slate-400 dark:text-[#94A3B8]">· {athlete.sport}</span>}
                            {athlete.age && <span className="text-xs text-slate-400 dark:text-[#94A3B8]">· {athlete.age} yrs</span>}
                            {athlete.gender && <span className="text-xs text-slate-400 dark:text-[#94A3B8]">· {athlete.gender}</span>}
                        </div>

                        {/* Status pills */}
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${activeInjuries.length === 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/50'}`}>
                                {activeInjuries.length === 0 ? 'Available' : 'Modified Training'}
                            </span>
                            {activeInjuries.length > 0 && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50">
                                    {activeInjuries.length} Active Injur{activeInjuries.length > 1 ? 'ies' : 'y'}
                                </span>
                            )}
                            {acwrValue != null && (
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${acwrInfo.pillClass}`}>
                                    ACWR {acwrValue.toFixed(2)} · {acwrInfo.zone}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setEditProfileOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-slate-200 dark:border-[#243A58] rounded-full text-slate-600 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-[#1A2D48] transition-colors"
                        >
                            <EditIcon size={13} /> Edit
                        </button>
                        <button
                            onClick={() => setShareOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-indigo-300 dark:border-indigo-500/40 bg-indigo-50 dark:bg-indigo-600/15 rounded-full text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-600/25 transition-colors"
                        >
                            <Share2Icon size={13} /> Share
                        </button>
                    </div>
                </div>
            </section>

            {/* ── SNAPSHOT KPI ROW ──────────────────────────────────── */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KpiTile
                    label="ACWR (7-day)"
                    value={acwrValue != null ? acwrValue.toFixed(2) : '—'}
                    sub={
                        acwrSeries.length > 0
                            ? <Sparkline data={acwrSeriesValues} color={acwrInfo.color === 'rose' ? '#ef4444' : acwrInfo.color === 'amber' ? '#f59e0b' : acwrInfo.color === 'sky' ? '#0ea5e9' : '#10b981'} />
                            : 'No load data yet'
                    }
                    tone={acwrInfo.color as any}
                    icon={GaugeIcon}
                />
                <KpiTile
                    label="Latest Wellness"
                    value={latestWellness ? `${wellnessFields.length} markers` : '—'}
                    sub={latestWellness ? fmtDate(latestWellness.date || latestWellness.session_date) : 'No responses yet'}
                    tone={latestWellness ? 'sky' : 'slate'}
                    icon={HeartIcon}
                />
                <KpiTile
                    label="Tonnage (4-week)"
                    value={totalRecentTonnage > 0 ? `${(totalRecentTonnage / 1000).toFixed(1)}t` : '—'}
                    sub={last4WeekTonnage.length > 0 ? <Sparkline data={last4WeekTonnage} color="#6366f1" /> : 'No planned tonnage yet'}
                    tone={totalRecentTonnage > 0 ? 'slate' : 'slate'}
                    icon={DumbbellIcon}
                />
                <KpiTile
                    label="Days Since Test"
                    value={daysSinceTest != null ? daysSinceTest : '—'}
                    sub={lastTestDate ? `Last: ${fmtDate(lastTestDate)}` : 'No tests recorded'}
                    tone={daysSinceTest == null ? 'slate' : daysSinceTest > 30 ? 'amber' : 'emerald'}
                    icon={FlaskConicalIcon}
                />
            </section>

            {/* ── TRAINING LOAD / ACWR ──────────────────────────────── */}
            <SectionCard icon={GaugeIcon} title="Training Load & ACWR"
                trailing={
                    <div className="flex items-center gap-2">
                        {acwrLatestDate && (
                            <span className="text-[10px] text-slate-400 dark:text-[#94A3B8]">As of {fmtDate(acwrLatestDate)}</span>
                        )}
                        {acwrValue != null && (
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${acwrInfo.pillClass}`}>
                                {acwrInfo.zone}
                            </span>
                        )}
                    </div>
                }
            >
                {acwrValue == null ? (
                    <EmptyHint text="ACWR tracking isn't enabled yet for this athlete's team. Enable it in Wellness to start monitoring load." />
                ) : (
                    <div className="space-y-4">
                        {/* Zone bar */}
                        <div>
                            <div className="relative h-3 rounded-full overflow-hidden flex">
                                <div className="bg-sky-200 dark:bg-sky-900/60" style={{ width: '40%' }} />
                                <div className="bg-emerald-200 dark:bg-emerald-900/60" style={{ width: '25%' }} />
                                <div className="bg-amber-200 dark:bg-amber-900/60" style={{ width: '10%' }} />
                                <div className="bg-rose-200 dark:bg-rose-900/60" style={{ width: '25%' }} />
                                {/* Marker */}
                                <div
                                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white dark:bg-[#132338] border-2 border-slate-700 dark:border-white shadow"
                                    style={{ left: `calc(${Math.min(Math.max(acwrValue, 0), 2) / 2 * 100}% - 6px)` }}
                                />
                            </div>
                            <div className="flex justify-between text-[9px] text-slate-400 dark:text-[#94A3B8] mt-1.5">
                                <span>0.0</span><span>0.8</span><span>1.3</span><span>1.5</span><span>2.0+</span>
                            </div>
                            <div className="flex gap-4 mt-3 text-[10px] flex-wrap">
                                <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-400" /> Under &lt; 0.8</span>
                                <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Optimal 0.8–1.3</span>
                                <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> Caution 1.3–1.5</span>
                                <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400" /> Danger &gt; 1.5</span>
                            </div>
                        </div>

                        {/* Sparkline */}
                        {acwrSeries.length > 0 && (
                            <div>
                                <div className="flex items-baseline justify-between mb-2">
                                    <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#CBD5E1]">
                                        Last {acwrSeries.length} Days
                                    </div>
                                    <div className="text-[10px] text-slate-400 dark:text-[#94A3B8]">
                                        {fmtDate(acwrSeries[0].date)} → {fmtDate(acwrSeries[acwrSeries.length - 1].date)}
                                    </div>
                                </div>
                                <div className="h-36">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={acwrSeries} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:opacity-20" />
                                            <XAxis
                                                dataKey="label"
                                                tick={{ fontSize: 9 }}
                                                interval="preserveStartEnd"
                                                minTickGap={24}
                                            />
                                            <YAxis domain={[0, 2]} tick={{ fontSize: 10 }} />
                                            <ReferenceLine y={0.8} stroke="#0ea5e9" strokeDasharray="3 3" />
                                            <ReferenceLine y={1.3} stroke="#f59e0b" strokeDasharray="3 3" />
                                            <ReferenceLine y={1.5} stroke="#ef4444" strokeDasharray="3 3" />
                                            <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} dot={false} />
                                            <Tooltip
                                                formatter={(v: any) => [Number(v).toFixed(2), 'ACWR']}
                                                labelFormatter={(label: any, payload: any) => {
                                                    const d = payload?.[0]?.payload?.date;
                                                    return d ? fmtDate(d) : label;
                                                }}
                                                contentStyle={tooltipStyle}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </SectionCard>

            {/* ── TONNAGE ───────────────────────────────────────────── */}
            <SectionCard icon={DumbbellIcon} title="Planned Tonnage" trailing={
                weeklyTonnage.length > 0 && (
                    <span className="text-[10px] text-slate-400 dark:text-[#94A3B8]">
                        {weeklyTonnage.length} weeks · from {fmtDate(weeklyTonnage[0].date)}
                    </span>
                )
            }>
                {weeklyTonnage.length === 0 ? (
                    <EmptyHint text="No planned tonnage logged yet. Tonnage is captured when programs or packets are scheduled." />
                ) : (
                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={weeklyTonnage} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:opacity-20" />
                                <XAxis dataKey="week" tick={{ fontSize: 10 }} interval="preserveStartEnd" minTickGap={20} />
                                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}t` : v} />
                                <Tooltip
                                    formatter={(v: any) => [`${Number(v).toLocaleString()} kg`, 'Tonnage']}
                                    labelFormatter={(label: any, payload: any) => {
                                        const d = payload?.[0]?.payload?.date;
                                        return d ? `Week of ${fmtDate(d)}` : label;
                                    }}
                                    contentStyle={tooltipStyle}
                                />
                                <Bar dataKey="tonnage" radius={[4, 4, 0, 0]}>
                                    {weeklyTonnage.map((_, i) => (
                                        <Cell key={i} fill={i === weeklyTonnage.length - 1 ? '#6366f1' : '#a5b4fc'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </SectionCard>

            {/* ── WELLNESS ──────────────────────────────────────────── */}
            <SectionCard icon={HeartIcon} title="Wellness" trailing={
                latestWellness && (
                    <span className="text-[10px] text-slate-400 dark:text-[#94A3B8]">Last: {fmtDate(latestWellness.date || latestWellness.session_date)}</span>
                )
            }>
                {!latestWellness ? (
                    <EmptyHint text="No wellness responses captured yet." />
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6">
                        {/* Trend chart */}
                        <div>
                            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#CBD5E1] mb-2">14-Day Trend</div>
                            <div className="h-40">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={wellnessTrend} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:opacity-20" />
                                        <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" minTickGap={18} />
                                        <YAxis domain={[0, 10]} tick={{ fontSize: 10 }} />
                                        <Tooltip
                                            contentStyle={tooltipStyle}
                                            labelFormatter={(label: any, payload: any) => {
                                                const d = payload?.[0]?.payload?.date;
                                                return d ? fmtDate(d) : label;
                                            }}
                                        />
                                        <Line type="monotone" dataKey="fatigue" stroke="#ef4444" strokeWidth={1.5} dot={false} name="Fatigue" />
                                        <Line type="monotone" dataKey="sleep" stroke="#0ea5e9" strokeWidth={1.5} dot={false} name="Sleep" />
                                        <Line type="monotone" dataKey="stress" stroke="#f59e0b" strokeWidth={1.5} dot={false} name="Stress" />
                                        <Line type="monotone" dataKey="soreness" stroke="#a855f7" strokeWidth={1.5} dot={false} name="Soreness" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex flex-wrap gap-3 mt-2 text-[10px]">
                                <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" /> Fatigue</span>
                                <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-500" /> Sleep</span>
                                <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Stress</span>
                                <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500" /> Soreness</span>
                            </div>
                        </div>

                        {/* Latest responses */}
                        <div className="space-y-1.5 min-w-[180px]">
                            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#CBD5E1] mb-1">Latest Responses</div>
                            {wellnessFields.length === 0 ? (
                                <EmptyHint text="No numeric responses" />
                            ) : wellnessFields.slice(0, 8).map(([k, v]) => {
                                const tone = wellnessTone(k, v as number);
                                return (
                                    <div key={k} className={`flex items-center justify-between px-3 py-1.5 rounded-lg border ${toneClasses[tone]}`}>
                                        <span className="text-[11px] font-medium capitalize">{k.replace(/_/g, ' ')}</span>
                                        <span className="text-sm font-bold">{v}<span className="text-[9px] opacity-60">/10</span></span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </SectionCard>

            {/* ── INJURIES & MEDICAL ────────────────────────────────── */}
            <SectionCard icon={AlertTriangleIcon} title="Injuries & Medical History" trailing={
                <span className="text-[10px] text-slate-400 dark:text-[#94A3B8]">
                    {activeInjuries.length} active · {historicalInjuries.length} historical
                </span>
            }>
                {athleteInjuries.length === 0 ? (
                    <EmptyHint text="No injuries on record. " />
                ) : (
                    <div className="space-y-4">
                        {/* Active */}
                        {activeInjuries.length > 0 && (
                            <div>
                                <div className="text-[10px] font-semibold uppercase tracking-wide text-rose-600 dark:text-rose-400 mb-2">Currently Active</div>
                                <div className="grid sm:grid-cols-2 gap-2">
                                    {activeInjuries.map((inj, i) => (
                                        <div key={inj.id || i} className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-900/40 rounded-lg p-3">
                                            <div className="flex items-start justify-between gap-3 mb-1">
                                                <div className="text-sm font-semibold text-rose-700 dark:text-rose-300">
                                                    {inj.body_area || inj.area || 'Injury'}
                                                </div>
                                                {inj.severity && (
                                                    <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 bg-rose-200 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 rounded">
                                                        {inj.severity}
                                                    </span>
                                                )}
                                            </div>
                                            {inj.type && <div className="text-[11px] text-rose-600 dark:text-rose-400">{inj.type}</div>}
                                            {inj.date && <div className="text-[10px] text-rose-500/70 dark:text-rose-400/70 mt-1">Reported {fmtDate(inj.date)}</div>}
                                            {inj.notes && <div className="text-[11px] text-rose-600 dark:text-rose-400/80 mt-2 italic">"{inj.notes}"</div>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Historical timeline */}
                        {historicalInjuries.length > 0 && (
                            <div>
                                <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#CBD5E1] mb-2">History</div>
                                <div className="space-y-1.5">
                                    {historicalInjuries.slice(0, 8).map((inj, i) => (
                                        <div key={inj.id || i} className="flex items-center gap-3 px-3 py-2 bg-slate-50 dark:bg-[#0F1C30] border border-slate-100 dark:border-[#243A58] rounded-lg">
                                            <CheckCircle2Icon size={14} className="text-emerald-500 shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs font-medium text-slate-700 dark:text-[#E2E8F0]">{inj.body_area || inj.area || 'Injury'}{inj.type ? ` — ${inj.type}` : ''}</div>
                                                <div className="text-[10px] text-slate-400 dark:text-[#94A3B8]">{fmtDate(inj.date || inj.created_at)}</div>
                                            </div>
                                            {inj.severity && (
                                                <span className="text-[9px] font-medium uppercase tracking-wide text-slate-500 dark:text-[#CBD5E1]">{inj.severity}</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </SectionCard>

            {/* ── TESTING ───────────────────────────────────────────── */}
            <SectionCard icon={FlaskConicalIcon} title="Testing Results" trailing={
                <span className="text-[10px] text-slate-400 dark:text-[#94A3B8]">{byTestType.length} test type{byTestType.length !== 1 ? 's' : ''}</span>
            }>
                {byTestType.length === 0 ? (
                    <EmptyHint text="No test results recorded for this athlete." />
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {byTestType.map(([type, results]) => {
                            const latest = results[0];
                            const previous = results[1];
                            const latestValue = latest.value ?? latest.weight ?? latest.height ?? latest.time ?? latest.avgForce;
                            const previousValue = previous ? (previous.value ?? previous.weight ?? previous.height ?? previous.time ?? previous.avgForce) : null;
                            const delta = (latestValue != null && previousValue != null)
                                ? Number(latestValue) - Number(previousValue)
                                : null;
                            const isBetter = delta != null ? (latest.lowerIsBetter ? delta < 0 : delta > 0) : null;
                            const series = results.slice(0, 8).reverse().map(r => Number(r.value ?? r.weight ?? r.height ?? r.time ?? r.avgForce ?? 0));

                            return (
                                <div key={type} className="bg-slate-50 dark:bg-[#0F1C30] border border-slate-100 dark:border-[#243A58] rounded-lg p-4">
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#CBD5E1] capitalize truncate">
                                            {type.replace(/_/g, ' ')}
                                        </div>
                                        {delta != null && (
                                            <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${isBetter ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                                {isBetter ? <TrendingUpIcon size={11} /> : <TrendingDownIcon size={11} />}
                                                {Math.abs(delta).toFixed(1)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-2xl font-bold text-slate-800 dark:text-[#E2E8F0]">
                                        {latestValue != null ? Number(latestValue).toFixed(1) : '—'}
                                        <span className="text-xs font-medium text-slate-400 dark:text-[#94A3B8] ml-1">{latest.unit || ''}</span>
                                    </div>
                                    <div className="text-[10px] text-slate-400 dark:text-[#94A3B8] mt-0.5">{fmtDate(latest.date)} · {results.length} record{results.length !== 1 ? 's' : ''}</div>
                                    {series.length > 1 && (
                                        <div className="mt-2">
                                            <Sparkline data={series} color="#6366f1" />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </SectionCard>

            {/* ── CURRENT PROGRAM & PHASE ───────────────────────────── */}
            <SectionCard icon={CalendarDaysIcon} title="Current Program & Phase">
                <div className="grid sm:grid-cols-2 gap-3">
                    {/* Current program */}
                    <div className="bg-indigo-50 dark:bg-indigo-600/10 border border-indigo-200 dark:border-indigo-500/30 rounded-lg p-4">
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-300 mb-2">Next / Current Session</div>
                        {programInfo.current ? (
                            <>
                                <div className="text-sm font-semibold text-slate-800 dark:text-[#E2E8F0]">{programInfo.current.title}</div>
                                <div className="text-[11px] text-slate-500 dark:text-[#CBD5E1] mt-1">Scheduled {fmtDate(programInfo.current.date)}</div>
                                {programInfo.current.status && (
                                    <span className="inline-block mt-2 text-[10px] font-medium px-2 py-0.5 rounded-full bg-white dark:bg-[#0F1C30] border border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-300 capitalize">
                                        {programInfo.current.status}
                                    </span>
                                )}
                            </>
                        ) : (
                            <EmptyHint text="No upcoming sessions assigned." />
                        )}
                    </div>

                    {/* Last session */}
                    <div className="bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-lg p-4">
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#CBD5E1] mb-2">Last Session</div>
                        {programInfo.previous ? (
                            <>
                                <div className="text-sm font-semibold text-slate-800 dark:text-[#E2E8F0]">{programInfo.previous.title}</div>
                                <div className="text-[11px] text-slate-500 dark:text-[#CBD5E1] mt-1">{fmtDate(programInfo.previous.date)}</div>
                            </>
                        ) : (
                            <EmptyHint text="No prior sessions." />
                        )}
                    </div>
                </div>

                {/* Periodisation phase */}
                <div className="mt-3 bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-lg p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#CBD5E1] mb-0.5">Periodisation Phase</div>
                            {phaseInfo ? (
                                <div className="text-sm font-semibold text-slate-800 dark:text-[#E2E8F0]">
                                    {phaseInfo.phase.name}
                                </div>
                            ) : (
                                <div className="text-sm text-slate-500 dark:text-[#CBD5E1]">
                                    No active phase found for this athlete{teamId && !isPrivate ? "'s team" : ''}.
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => navigate('/periodization')}
                            className="text-[11px] font-medium text-indigo-600 dark:text-indigo-300 hover:underline inline-flex items-center gap-1 shrink-0"
                        >
                            Open Planner <ChevronRightIcon size={12} />
                        </button>
                    </div>

                    {phaseInfo && (
                        <>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-[#CBD5E1] mb-3">
                                <span>{fmtDate(phaseInfo.phase.startDate)} → {fmtDate(phaseInfo.phase.endDate)}</span>
                                {phaseInfo.phase.trainingPhase && (
                                    <span className="px-1.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-300 font-medium">
                                        {phaseInfo.phase.trainingPhase}
                                    </span>
                                )}
                                <span className="text-slate-400 dark:text-[#94A3B8]">{phaseInfo.plan.name}</span>
                            </div>

                            <div className="relative h-2 bg-slate-100 dark:bg-[#0F1C30] rounded-full overflow-hidden mb-3">
                                <div
                                    className="absolute left-0 top-0 bottom-0 bg-indigo-500"
                                    style={{ width: `${Math.round(phaseInfo.progress * 100)}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-[10px] text-slate-400 dark:text-[#94A3B8]">
                                <span>Phase start</span>
                                <span>{Math.round(phaseInfo.progress * 100)}% through</span>
                                <span>Phase end</span>
                            </div>

                            {phaseInfo.block && (
                                <div className="mt-3 grid sm:grid-cols-3 gap-2">
                                    <div className="bg-slate-50 dark:bg-[#0F1C30] border border-slate-100 dark:border-[#243A58] rounded-lg p-2.5">
                                        <div className="text-[9px] font-semibold uppercase tracking-wide text-slate-400 dark:text-[#94A3B8] mb-0.5">Current Block</div>
                                        <div className="text-xs font-semibold text-slate-700 dark:text-[#E2E8F0]">{phaseInfo.block.name || phaseInfo.block.label}</div>
                                    </div>
                                    {phaseInfo.block.intensityLevel && (
                                        <div className="bg-slate-50 dark:bg-[#0F1C30] border border-slate-100 dark:border-[#243A58] rounded-lg p-2.5">
                                            <div className="text-[9px] font-semibold uppercase tracking-wide text-slate-400 dark:text-[#94A3B8] mb-0.5">Intensity</div>
                                            <div className="text-xs font-semibold text-slate-700 dark:text-[#E2E8F0]">{phaseInfo.block.intensityLevel}</div>
                                        </div>
                                    )}
                                    {phaseInfo.block.volumeLevel && (
                                        <div className="bg-slate-50 dark:bg-[#0F1C30] border border-slate-100 dark:border-[#243A58] rounded-lg p-2.5">
                                            <div className="text-[9px] font-semibold uppercase tracking-wide text-slate-400 dark:text-[#94A3B8] mb-0.5">Volume</div>
                                            <div className="text-xs font-semibold text-slate-700 dark:text-[#E2E8F0]">{phaseInfo.block.volumeLevel}</div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </SectionCard>

            {/* ── NOTES & GOALS ─────────────────────────────────────── */}
            <SectionCard icon={BadgeCheckIcon} title="Notes & Goals" trailing={
                !editingNotes ? (
                    <button
                        onClick={() => setEditingNotes(true)}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-300 hover:underline"
                    >
                        <EditIcon size={11} /> Edit
                    </button>
                ) : (
                    <div className="flex gap-2">
                        <button
                            onClick={() => { setEditingNotes(false); setNotesDraft({ goals: athlete.goals || '', notes: athlete.notes || '' }); }}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#E2E8F0]"
                        >
                            <XIcon size={11} /> Cancel
                        </button>
                        <button
                            onClick={saveNotes}
                            disabled={savingNotes}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline disabled:opacity-50"
                        >
                            <SaveIcon size={11} /> {savingNotes ? 'Saving…' : 'Save'}
                        </button>
                    </div>
                )
            }>
                <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#CBD5E1] mb-1.5">Goals</div>
                        {editingNotes ? (
                            <textarea
                                value={notesDraft.goals}
                                onChange={e => setNotesDraft(d => ({ ...d, goals: e.target.value }))}
                                placeholder="Training goals, performance targets..."
                                className="w-full h-24 bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-[#E2E8F0] resize-none outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                            />
                        ) : (
                            athlete.goals ? (
                                <p className="text-sm text-slate-700 dark:text-[#E2E8F0] whitespace-pre-wrap">{athlete.goals}</p>
                            ) : <EmptyHint text="No goals recorded." />
                        )}
                    </div>
                    <div>
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#CBD5E1] mb-1.5">Notes</div>
                        {editingNotes ? (
                            <textarea
                                value={notesDraft.notes}
                                onChange={e => setNotesDraft(d => ({ ...d, notes: e.target.value }))}
                                placeholder="Background, flags, observations..."
                                className="w-full h-24 bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-[#E2E8F0] resize-none outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                            />
                        ) : (
                            athlete.notes ? (
                                <p className="text-sm text-slate-700 dark:text-[#E2E8F0] whitespace-pre-wrap">{athlete.notes}</p>
                            ) : <EmptyHint text="No notes recorded." />
                        )}
                    </div>
                </div>
            </SectionCard>

            <ShareAthleteModal
                isOpen={shareOpen}
                onClose={() => setShareOpen(false)}
                athlete={{ id: athlete.id, name: athlete.name }}
                buildSnapshot={buildSnapshot}
            />

            <EditAthleteProfileModal
                isOpen={editProfileOpen}
                onClose={() => setEditProfileOpen(false)}
                athlete={athlete}
            />
        </div>
    );
};

export default AthleteProfilePage;
