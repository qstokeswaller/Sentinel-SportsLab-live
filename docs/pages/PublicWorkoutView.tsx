// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { DatabaseService } from '../services/databaseService';
import { AlertCircle, Dumbbell, Printer, ExternalLink, Weight, Activity as ActivityIcon, Moon as MoonIcon, Link2 as Link2Icon } from 'lucide-react';
import { useForceLightMode } from '../hooks/useForceLightMode';

// ── Branding Banner (shared across public pages + PDF exports) ───────────────
const BrandingBanner = () => (
    <div className="bg-white border-b border-slate-100 py-3 print:py-2 print:border-b print:border-slate-200">
        <div className="flex flex-col items-center justify-center gap-0.5">
            <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center shrink-0">
                    <ActivityIcon className="text-white w-3 h-3" />
                </div>
                <span className="font-bold text-sm text-slate-900 tracking-tight">
                    Sentinel <span className="text-indigo-600">SportsLab</span>
                </span>
            </div>
            <span className="text-[9px] text-slate-400 tracking-wide uppercase">Athlete Monitoring & Performance Intelligence</span>
        </div>
    </div>
);

// ── Defaults for the built-in sections (kept for backwards compatibility) ───
const DEFAULT_SECTION_LABELS: Record<string, string> = {
    warmup: 'Warm-Up',
    workout: 'Workout',
    cooldown: 'Cool-Down',
};
const DEFAULT_SECTION_COLORS: Record<string, string> = {
    warmup: '#f59e0b',   // amber
    workout: '#6366f1',  // indigo
    cooldown: '#0ea5e9', // sky
};
const DEFAULT_SECTION_ORDER = ['warmup', 'workout', 'cooldown'];

// Resolve a section's display label + color from the day-level metadata.
// Both the program builder (per-day) and packet builder (per-template) save
// section_meta as { [sectionId]: { label, color } }. Fall back to canonical
// defaults so the legacy warmup/workout/cooldown sections still render.
function sectionMetaFor(secId: string, meta?: Record<string, { label?: string; color?: string }>) {
    const m = meta?.[secId];
    return {
        label: m?.label || DEFAULT_SECTION_LABELS[secId] || secId,
        color: m?.color || DEFAULT_SECTION_COLORS[secId] || '#64748B',
    };
}

// Normalize the row's prescription fields. Newer rows store intensities[] as an
// array of {unit, value}; older rows just had `weight`, `rpe`, `rir`, `intensity`.
function normalizeRow(ex: any) {
    const arr = Array.isArray(ex.intensities) ? ex.intensities.filter((p: any) => p && p.value !== '' && p.value != null) : null;
    if (arr && arr.length > 0) return arr.map((p: any) => ({ unit: String(p.unit || ''), value: String(p.value || '') }));
    // Legacy fallback: synthesize pills from the old flat columns so old shares still render
    const pills: { unit: string; value: string }[] = [];
    if (ex.weight) pills.push({ unit: 'kg', value: String(ex.weight) });
    if (ex.rpe) pills.push({ unit: 'RPE', value: String(ex.rpe) });
    if (ex.rir) pills.push({ unit: 'RIR', value: String(ex.rir) });
    if (ex.intensity) pills.push({ unit: '', value: String(ex.intensity) });
    return pills;
}

// Decide which prescription columns to show. Coaches can toggle per-row via
// display_fields; if not set, show everything that has a value.
function visibleFieldsFor(ex: any) {
    const fields = Array.isArray(ex.display_fields || ex.displayFields) ? (ex.display_fields || ex.displayFields) : null;
    if (!fields) return { sets: true, reps: true, rest: true, tempo: true, intensities: true, notes: true };
    return {
        sets: fields.includes('sets'),
        reps: fields.includes('reps'),
        rest: fields.includes('rest'),
        tempo: fields.includes('tempo'),
        intensities: fields.includes('intensity1') || fields.includes('intensity2') || fields.includes('intensity3'),
        notes: fields.includes('notes'),
    };
}

// ── Section header — colored bar that matches the builder's section identity ─
const SectionHeader = ({ label, color, count }: { label: string; color: string; count: number }) => (
    <div className="flex items-center gap-3 mb-3">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <h3 className="text-xs font-bold uppercase tracking-wide" style={{ color }}>{label}</h3>
        <div className="flex-1 h-px" style={{ backgroundColor: `${color}33` }} />
        <span className="text-[10px] text-slate-300 font-medium">{count} exercise{count !== 1 ? 's' : ''}</span>
    </div>
);

// ── Exercise Table Component ──────────────────────────────────────────────────
const ExerciseTable = ({
    exercises,
    sectionId,
    sectionMeta,
    exerciseDetails,
}: {
    exercises: any[];
    sectionId: string;
    sectionMeta?: Record<string, { label?: string; color?: string }>;
    exerciseDetails?: Record<string, { description?: string; video_url?: string }>;
}) => {
    if (!exercises || exercises.length === 0) return null;
    const { label, color } = sectionMetaFor(sectionId, sectionMeta);
    return (
        <div className="mb-6 print:mb-4 print:break-inside-avoid">
            <SectionHeader label={label} color={color} count={exercises.length} />
            <div className="space-y-2">
                {exercises.map((ex, idx) => {
                    const name = ex.exercise_name || ex.exerciseName || ex.name || '—';
                    const visible = visibleFieldsFor(ex);
                    const pills = visible.intensities ? normalizeRow(ex) : [];
                    const hasMeta =
                        (visible.sets && ex.sets) ||
                        (visible.reps && ex.reps) ||
                        (visible.rest && (ex.rest_min || ex.rest_sec || ex.rest)) ||
                        (visible.tempo && ex.tempo) ||
                        pills.length > 0;

                    // Resolve description / video — RPC inlines them on the program side, and the
                    // template path enriches via the exercise_details lookup.
                    const exId = ex.exerciseId || ex.exercise_id;
                    const rawDesc = ex.exercise_description || exerciseDetails?.[exId]?.description || '';
                    const desc = rawDesc && rawDesc.toLowerCase() !== 'no description provided.' ? rawDesc : '';
                    const rawVideoUrl = ex.exercise_video_url || exerciseDetails?.[exId]?.video_url || '';
                    const videoUrl = rawVideoUrl && rawVideoUrl.startsWith('http') ? rawVideoUrl : '';
                    const showNotes = visible.notes && ex.notes;
                    const hasDetail = desc || videoUrl || showNotes;

                    return (
                        <div
                            key={ex.id || idx}
                            className="bg-white border rounded-lg print:border-slate-300 overflow-hidden"
                            style={{ borderColor: `${color}33`, borderLeftWidth: 3, borderLeftColor: color }}
                        >
                            {/* Banner: Number + Name + Metrics */}
                            <div className="px-4 py-3">
                                <div className="flex items-start gap-3">
                                    <span
                                        className="w-6 h-6 text-white rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5"
                                        style={{ backgroundColor: color }}
                                    >
                                        {idx + 1}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-semibold text-slate-800 break-words">{name}</div>
                                        {hasMeta && (
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 mt-1.5">
                                                {visible.sets && ex.sets && (
                                                    <span>Sets <span className="font-semibold text-slate-700">{ex.sets}</span></span>
                                                )}
                                                {visible.reps && ex.reps && (
                                                    <span>Reps <span className="font-semibold text-slate-700">{ex.reps}</span></span>
                                                )}
                                                {visible.rest && (ex.rest_min > 0 || ex.rest_sec > 0) && (
                                                    <span>Rest <span className="text-slate-600">{ex.rest_min || 0}m {ex.rest_sec || 0}s</span></span>
                                                )}
                                                {visible.rest && ex.rest && !ex.rest_min && !ex.rest_sec && (
                                                    <span>Rest <span className="text-slate-600">{ex.rest}</span></span>
                                                )}
                                                {visible.tempo && ex.tempo && (
                                                    <span>Tempo <span className="text-slate-600">{ex.tempo}</span></span>
                                                )}
                                                {/* Intensity pills — one chip per unit so kg, RPE, %1RM, RIR, etc. all render */}
                                                {pills.map((p, i) => (
                                                    <span
                                                        key={`int-${i}`}
                                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border"
                                                        style={{ borderColor: `${color}55`, color, backgroundColor: `${color}10` }}
                                                    >
                                                        {p.unit && p.unit.toLowerCase() === 'kg' && <Weight size={9} />}
                                                        <span className="font-bold">{p.value}</span>
                                                        {p.unit && <span className="opacity-80">{p.unit}</span>}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {/* Detail area */}
                            {hasDetail && (
                                <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 space-y-1.5">
                                    {showNotes && <p className="text-xs text-slate-500 italic">{ex.notes}</p>}
                                    {desc && <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>}
                                    {videoUrl && (
                                        <a
                                            href={videoUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-700 transition-colors print:text-indigo-800 print:underline"
                                        >
                                            <ExternalLink size={10} className="print:hidden" />
                                            Video Reference
                                            <span className="hidden print:inline text-[9px] text-slate-400 ml-1 truncate max-w-[200px]">({videoUrl})</span>
                                        </a>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// ── Linked sessions — render per-day attached Wattbike / Conditioning items ──
const LinkedSessionsBlock = ({ linked }: { linked: any[] }) => {
    if (!linked || linked.length === 0) return null;
    return (
        <div className="mb-6 print:mb-3 print:break-inside-avoid">
            <div className="flex items-center gap-2 mb-2">
                <Link2Icon size={12} className="text-indigo-500" />
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Linked Sessions</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {linked.map((l, i) => (
                    <div key={l.id || i} className="bg-white border border-slate-200 rounded-lg px-3 py-2 flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide bg-indigo-50 text-indigo-700 shrink-0">
                            {l.source || l.type || 'Session'}
                        </span>
                        <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold text-slate-700 truncate">{l.title || l.name || 'Linked session'}</div>
                            {l.meta && <div className="text-[10px] text-slate-400 truncate">{l.meta}</div>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Helper: pull the section order for a given day or template — preferring the
// explicit section_order array, then any extra keys present in `sections`/exercises,
// then falling back to the canonical defaults so legacy shares still render.
function resolveSectionOrder(saved: any, presentSections: string[]): string[] {
    if (Array.isArray(saved) && saved.length > 0) {
        // Append any sections that are present in data but missing from saved order
        const extras = presentSections.filter(s => !saved.includes(s));
        return [...saved, ...extras];
    }
    if (presentSections.length > 0) {
        // Put defaults first (in their canonical order) then any customs
        const inOrder = DEFAULT_SECTION_ORDER.filter(s => presentSections.includes(s));
        const customs = presentSections.filter(s => !DEFAULT_SECTION_ORDER.includes(s) && s !== 'weightroomSheet');
        return [...inOrder, ...customs];
    }
    return DEFAULT_SECTION_ORDER;
}

// ── Main Component ────────────────────────────────────────────────────────────
const PublicWorkoutView: React.FC = () => {
    useForceLightMode();
    const { workoutType, workoutId } = useParams<{ workoutType: string; workoutId: string }>();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<any>(null);

    // For program day tabs
    const [activeDay, setActiveDay] = useState(0);
    // For multi-week programs: filter the day-tab strip to one week at a time so days
    // from later weeks aren't hidden behind a horizontal scroll affordance.
    const [activeWeek, setActiveWeek] = useState(1);

    // Keep activeWeek in sync with the active day so the day strip always shows the
    // strip the currently-rendered day belongs to (handles initial mount + any
    // programmatic activeDay changes).
    useEffect(() => {
        const days = data?.days;
        if (!Array.isArray(days)) return;
        const d = days[activeDay];
        const w = d?.week_number || 1;
        if (w !== activeWeek) setActiveWeek(w);
    }, [activeDay, data]);

    useEffect(() => {
        const load = async () => {
            if (!workoutType || !workoutId) { setError('Invalid link.'); setLoading(false); return; }
            try {
                if (workoutType === 'program') {
                    const result = await DatabaseService.getSharedWorkoutProgram(workoutId);
                    if (!result?.program) { setError('Workout not found.'); }
                    else { setData(result.program); }
                } else if (workoutType === 'template') {
                    const result = await DatabaseService.getSharedWorkoutTemplate(workoutId);
                    if (!result) { setError('Workout not found.'); }
                    else { setData(result); }
                } else {
                    setError('Invalid workout type.');
                }
            } catch (err) {
                console.error(err);
                setError('Failed to load workout. The link may be invalid.');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [workoutType, workoutId]);

    // ── Print / PDF ──
    React.useEffect(() => {
        document.body.classList.add('printing-standalone');
        return () => document.body.classList.remove('printing-standalone');
    }, []);

    const handlePrint = () => {
        const el = document.getElementById('print-content');
        const original = el?.style.minHeight;
        if (el) el.style.minHeight = '0';
        window.print();
        if (el) el.style.minHeight = original || '';
    };

    React.useEffect(() => {
        const beforePrint = () => {
            const el = document.getElementById('print-content');
            if (el) el.style.minHeight = '0';
        };
        const afterPrint = () => {
            const el = document.getElementById('print-content');
            if (el) el.style.minHeight = '100dvh';
        };
        window.addEventListener('beforeprint', beforePrint);
        window.addEventListener('afterprint', afterPrint);
        return () => {
            window.removeEventListener('beforeprint', beforePrint);
            window.removeEventListener('afterprint', afterPrint);
        };
    }, []);

    // ── Loading state ───────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="h-screen bg-[#F8F9FF] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-sm text-slate-500 font-medium">Loading workout...</p>
                </div>
            </div>
        );
    }

    // ── Error state ─────────────────────────────────────────────────────────
    if (error || !data) {
        return (
            <div className="h-screen bg-[#F8F9FF] flex items-center justify-center px-4">
                <div className="text-center max-w-sm">
                    <AlertCircle size={40} className="text-red-400 mx-auto mb-4" />
                    <h2 className="text-lg font-semibold text-slate-900 mb-2">Invalid Link</h2>
                    <p className="text-sm text-slate-500">{error || 'This workout could not be found.'}</p>
                </div>
            </div>
        );
    }

    // ── Render Program ──────────────────────────────────────────────────────
    if (workoutType === 'program') {
        const days = data.days || [];
        const day = days[activeDay];

        // Group days by week for the header label (programs can now span multiple weeks)
        const totalWeeks = Math.max(1, ...days.map((d: any) => d.week_number || 1));

        // Render the inside of a single training day — used by both the screen view
        // and the all-days-expanded print view so they stay perfectly in sync.
        const renderDayBody = (d: any) => {
            if (d.is_rest_day) {
                return (
                    <div className="flex flex-col items-center justify-center py-16 rounded-2xl border-2 border-dashed border-slate-200 bg-white text-center space-y-4 mt-2 print:py-8 print:border print:border-slate-300">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center print:w-10 print:h-10">
                            <MoonIcon size={28} className="text-slate-400 print:w-5 print:h-5" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-slate-700 print:text-base">Rest Day</p>
                            <p className="text-sm text-slate-400 mt-1 print:text-xs">Recovery is part of the program.</p>
                            <p className="text-sm text-slate-400 print:text-xs">Sleep well, eat well, hydrate.</p>
                        </div>
                        {d.instructions && (
                            <div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 max-w-sm">
                                <p className="text-xs text-slate-500">{d.instructions}</p>
                            </div>
                        )}
                    </div>
                );
            }
            // Build the actual section order from the day's saved metadata
            const presentSections = Array.from(new Set((d.exercises || []).map((e: any) => e.section).filter(Boolean)));
            const sectionOrder = resolveSectionOrder(d.section_order, presentSections);
            return (
                <>
                    {d.instructions && (
                        <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 mb-4 text-sm text-slate-600 print:bg-transparent">
                            <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Instructions</span>
                            {d.instructions}
                        </div>
                    )}
                    {sectionOrder.map((sec: string) => {
                        const exercises = (d.exercises || []).filter((e: any) => e.section === sec);
                        return (
                            <ExerciseTable
                                key={sec}
                                exercises={exercises}
                                sectionId={sec}
                                sectionMeta={d.section_meta}
                            />
                        );
                    })}
                    {Array.isArray(d.linked_sessions) && d.linked_sessions.length > 0 && (
                        <LinkedSessionsBlock linked={d.linked_sessions} />
                    )}
                    {(!Array.isArray(d.exercises) || d.exercises.length === 0) && (!Array.isArray(d.linked_sessions) || d.linked_sessions.length === 0) && (
                        <p className="text-center text-sm text-slate-400 py-8">No exercises on this day</p>
                    )}
                </>
            );
        };

        return (
            <div className="bg-[#F8F9FF] print-standalone" id="print-content" style={{minHeight: '100dvh'}}>
                <BrandingBanner />
                {/* Header */}
                <div className="bg-white border-b border-slate-200 px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shrink-0 print:hidden">
                                <Dumbbell size={16} />
                            </div>
                            <div>
                                <h1 className="text-base font-bold text-slate-900 print:text-lg">{data.name}</h1>
                                <p className="text-[10px] text-slate-400 font-medium">
                                    {days.length} day program{totalWeeks > 1 ? ` · ${totalWeeks} weeks` : ''}
                                    {data.training_phase ? ` · ${data.training_phase}` : ''}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-[10px] font-semibold transition-all print:hidden"
                        >
                            <Printer size={12} /> Download PDF
                        </button>
                    </div>
                </div>

                {/* Overview */}
                {data.overview && (
                    <div className="max-w-3xl mx-auto px-4 mt-4">
                        <p className="text-sm text-slate-600 bg-white border border-slate-200 rounded-lg px-4 py-3">{data.overview}</p>
                    </div>
                )}

                {/* Tags */}
                {(data.tags ?? []).length > 0 && (
                    <div className="max-w-3xl mx-auto px-4 mt-3 flex flex-wrap gap-1.5">
                        {data.tags.map((t: string) => (
                            <span key={t} className="px-2.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-md text-[10px] font-semibold">{t}</span>
                        ))}
                    </div>
                )}

                {/* Week + Day pickers (screen).
                    Multi-week programs get a dedicated week selector above the day strip
                    so days from later weeks aren't hidden behind a horizontal scroll. */}
                {days.length > 0 && (() => {
                    const weeks = Array.from({ length: totalWeeks }, (_, i) => i + 1);
                    const visibleDays = totalWeeks > 1
                        ? days.map((d: any, i: number) => ({ d, i })).filter(({ d }) => (d.week_number || 1) === activeWeek)
                        : days.map((d: any, i: number) => ({ d, i }));
                    return (
                        <div className="max-w-3xl mx-auto px-4 mt-4 print:hidden space-y-2">
                            {totalWeeks > 1 && (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    {weeks.map(w => {
                                        const dayCount = days.filter((d: any) => (d.week_number || 1) === w).length;
                                        const isActive = activeWeek === w;
                                        return (
                                            <button
                                                key={w}
                                                onClick={() => {
                                                    setActiveWeek(w);
                                                    // Jump to the first day of the newly selected week
                                                    const firstIdx = days.findIndex((d: any) => (d.week_number || 1) === w);
                                                    if (firstIdx >= 0) setActiveDay(firstIdx);
                                                }}
                                                className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1.5 border ${
                                                    isActive
                                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                                        : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-700'
                                                }`}
                                            >
                                                Week {w}
                                                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                    {dayCount}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar bg-white border border-slate-200 rounded-lg p-1">
                                {visibleDays.map(({ d, i }) => (
                                    <button
                                        key={d.id || i}
                                        onClick={() => setActiveDay(i)}
                                        className={`px-4 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                                            activeDay === i
                                                ? d.is_rest_day
                                                    ? 'bg-slate-600 text-white shadow-sm'
                                                    : 'bg-indigo-600 text-white shadow-sm'
                                                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                                        }`}
                                    >
                                        {d.name || `Day ${d.day_number}`}
                                        {d.is_rest_day && (
                                            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-black shrink-0 ${activeDay === i ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'}`}>R</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    );
                })()}

                {/* Active Day Content (screen) */}
                {day && (
                    <div className="max-w-3xl mx-auto px-4 mt-4 pb-12 print:hidden">
                        {renderDayBody(day)}
                    </div>
                )}

                {/* Print view: every day expanded, each day on its own page */}
                <div className="hidden print:block max-w-3xl mx-auto px-4 mt-2">
                    {days.map((d: any, i: number) => (
                        <div key={d.id || i} style={i > 0 ? { pageBreakBefore: 'always' } : undefined}>
                            <div className="mb-4 pb-2 border-b border-slate-200 flex items-center gap-3">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                        {totalWeeks > 1 && d.week_number ? `Week ${d.week_number} — ` : ''}{d.name || `Day ${d.day_number}`}
                                        {d.is_rest_day && (
                                            <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Rest</span>
                                        )}
                                    </h2>
                                    <p className="text-[10px] text-slate-400">{data.name} — Day {d.day_number || i + 1} of {days.length}</p>
                                </div>
                            </div>
                            {renderDayBody(d)}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // ── Render Template ─────────────────────────────────────────────────────
    const sections = data.sections || {};
    // Persisted meta lives under sections._meta (workout_templates only has a single
    // sections column, so we embed sectionMeta/sectionOrder/linkedSessions there).
    // Tolerate top-level legacy shapes too.
    const persistedMeta = (sections._meta && typeof sections._meta === 'object') ? sections._meta : null;
    const sectionMeta = persistedMeta?.sectionMeta || data.sectionMeta || data.section_meta;
    const savedOrder = persistedMeta?.sectionOrder || data.sectionOrder || data.section_order;
    const exerciseDetails = data.exercise_details || {};
    const linkedSessions = persistedMeta?.linkedSessions
        || data.linked_sessions
        || (Array.isArray(data.linkedSessions) ? data.linkedSessions : null);

    // Every key in `sections` that holds an exercise array is a renderable section.
    // Skip `weightroomSheet` (config object) and any reserved meta keys (start with _).
    const presentSectionIds = Object.keys(sections).filter(
        k => Array.isArray(sections[k]) && k !== 'weightroomSheet' && !k.startsWith('_')
    );
    const sectionOrder = resolveSectionOrder(savedOrder, presentSectionIds);

    return (
        <div className="bg-[#F8F9FF] print-standalone" id="print-content" style={{minHeight: '100dvh'}}>
            <BrandingBanner />
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-4 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white shrink-0 print:hidden">
                            <Dumbbell size={16} />
                        </div>
                        <div>
                            <h1 className="text-base font-bold text-slate-900">{data.name}</h1>
                            <div className="flex items-center gap-2 mt-0.5">
                                {data.training_phase && (
                                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[9px] font-semibold">{data.training_phase}</span>
                                )}
                                {data.load && (
                                    <span className="text-[10px] text-slate-400 font-medium">{data.load} Load</span>
                                )}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-[10px] font-semibold transition-all print:hidden"
                    >
                        <Printer size={12} /> Download PDF
                    </button>
                </div>
            </div>

            {/* Sections */}
            <div className="max-w-3xl mx-auto px-4 mt-5 pb-12 print:mt-2 print:pb-4">
                {sectionOrder.map(sec => {
                    const exercises = sections[sec] || [];
                    return (
                        <ExerciseTable
                            key={sec}
                            exercises={exercises}
                            sectionId={sec}
                            sectionMeta={sectionMeta}
                            exerciseDetails={exerciseDetails}
                        />
                    );
                })}
                {Array.isArray(linkedSessions) && linkedSessions.length > 0 && (
                    <LinkedSessionsBlock linked={linkedSessions} />
                )}
                {presentSectionIds.every(s => !sections[s] || sections[s].length === 0) && !linkedSessions?.length && (
                    <p className="text-center text-sm text-slate-400 py-8">No exercises in this workout</p>
                )}
            </div>
        </div>
    );
};

export default PublicWorkoutView;
