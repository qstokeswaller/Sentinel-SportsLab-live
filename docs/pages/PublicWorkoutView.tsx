// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { DatabaseService } from '../services/databaseService';
import { AlertCircle, Dumbbell, Printer, ChevronRight, ExternalLink, Weight, Activity as ActivityIcon } from 'lucide-react';

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

// ── Section labels ────────────────────────────────────────────────────────────
const SECTION_LABELS: Record<string, string> = {
    warmup: 'Warm Up',
    workout: 'Workout',
    cooldown: 'Cool Down',
};

const SECTION_ORDER = ['warmup', 'workout', 'cooldown'];

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ── Exercise Table Component ──────────────────────────────────────────────────
const ExerciseTable = ({ exercises, sectionLabel, exerciseDetails }: { exercises: any[]; sectionLabel: string; exerciseDetails?: Record<string, { description?: string; video_url?: string }> }) => {
    if (!exercises || exercises.length === 0) return null;
    return (
        <div className="mb-6 print:mb-4 print:break-inside-avoid">
            <div className="flex items-center gap-3 mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">{sectionLabel}</h3>
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-[10px] text-slate-300 font-medium">{exercises.length} exercises</span>
            </div>
            <div className="space-y-2">
                {exercises.map((ex, idx) => {
                    const name = ex.exercise_name || ex.exerciseName || ex.name || '—';
                    const hasMeta = ex.sets || ex.reps || ex.rest_min || ex.rest_sec || ex.rest || ex.rpe || ex.intensity || ex.tempo || ex.rir || ex.weight;
                    // Resolve description and video_url from RPC data or exercise details map
                    const rawDesc = ex.exercise_description || exerciseDetails?.[ex.exerciseId || ex.exercise_id]?.description || '';
                    const desc = rawDesc && rawDesc.toLowerCase() !== 'no description provided.' ? rawDesc : '';
                    const rawVideoUrl = ex.exercise_video_url || exerciseDetails?.[ex.exerciseId || ex.exercise_id]?.video_url || '';
                    // Only show video link if it's a real URL (not empty, not placeholder)
                    const videoUrl = rawVideoUrl && rawVideoUrl.startsWith('http') ? rawVideoUrl : '';
                    const hasDetail = desc || videoUrl || ex.notes;

                    return (
                        <div key={ex.id || idx} className="bg-white border border-slate-200 rounded-lg print:border-slate-300 overflow-hidden">
                            {/* Banner: Number + Name + Metrics — stacks on mobile */}
                            <div className="px-4 py-3">
                                <div className="flex items-start gap-3">
                                    <span className="w-6 h-6 bg-slate-800 text-white rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 print:bg-slate-700 mt-0.5">
                                        {idx + 1}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-semibold text-slate-800 break-words">{name}</div>
                                        {hasMeta && (
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 mt-1.5">
                                                {ex.sets && <span>Sets <span className="font-semibold text-slate-700">{ex.sets}</span></span>}
                                                {ex.reps && <span>Reps <span className="font-semibold text-slate-700">{ex.reps}</span></span>}
                                                {ex.weight && (
                                                    <span className="flex items-center gap-0.5">
                                                        <Weight size={10} className="text-indigo-500" />
                                                        <span className="font-semibold text-indigo-600">{ex.weight} kg</span>
                                                    </span>
                                                )}
                                                {(ex.rest_min > 0 || ex.rest_sec > 0) && (
                                                    <span>Rest <span className="text-slate-600">{ex.rest_min || 0}m {ex.rest_sec || 0}s</span></span>
                                                )}
                                                {ex.rest && !ex.rest_min && <span>Rest <span className="text-slate-600">{ex.rest}s</span></span>}
                                                {ex.rpe && <span>RPE <span className="text-slate-600">{ex.rpe}</span></span>}
                                                {ex.rir && <span>RIR <span className="text-slate-600">{ex.rir}</span></span>}
                                                {ex.intensity && <span>Int <span className="text-slate-600">{ex.intensity}</span></span>}
                                                {ex.tempo && <span>Tempo <span className="text-slate-600">{ex.tempo}</span></span>}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {/* Detail area: description, video link, notes */}
                            {hasDetail && (
                                <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 space-y-1.5">
                                    {ex.notes && <p className="text-xs text-slate-500 italic">{ex.notes}</p>}
                                    {desc && <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>}
                                    {videoUrl && (
                                        <a href={videoUrl} target="_blank" rel="noopener noreferrer"
                                           className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-700 transition-colors print:text-indigo-800 print:underline">
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

// ── Main Component ────────────────────────────────────────────────────────────
const PublicWorkoutView: React.FC = () => {
    const { workoutType, workoutId } = useParams<{ workoutType: string; workoutId: string }>();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<any>(null);

    // For program day tabs
    const [activeDay, setActiveDay] = useState(0);

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

    // Also handle Ctrl+P
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

        return (
            <div className="bg-[#F8F9FF] print-standalone" id="print-content" style={{minHeight: '100dvh'}}>
                <BrandingBanner />
                {/* Header */}
                <div className="bg-white border-b border-slate-200 px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center text-white shrink-0 print:hidden">
                                <Dumbbell size={16} />
                            </div>
                            <div>
                                <h1 className="text-base font-bold text-slate-900 print:text-lg">{data.name}</h1>
                                <p className="text-[10px] text-slate-400 font-medium">
                                    {days.length} day program
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

                {/* Day Tabs (screen) */}
                {days.length > 0 && (
                    <div className="max-w-3xl mx-auto px-4 mt-4 print:hidden">
                        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar bg-white border border-slate-200 rounded-lg p-1">
                            {days.map((d: any, i: number) => (
                                <button
                                    key={d.id || i}
                                    onClick={() => setActiveDay(i)}
                                    className={`px-4 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
                                        activeDay === i
                                            ? 'bg-indigo-600 text-white shadow-sm'
                                            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                                    }`}
                                >
                                    {d.name || `Day ${d.day_number}`}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Active Day Content (screen) */}
                {day && (
                    <div className="max-w-3xl mx-auto px-4 mt-4 pb-12 print:hidden">
                        {day.instructions && (
                            <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 mb-4 text-sm text-slate-600">
                                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Instructions</span>
                                {day.instructions}
                            </div>
                        )}
                        {SECTION_ORDER.map(sec => {
                            const exercises = (day.exercises || []).filter((e: any) => e.section === sec);
                            return <ExerciseTable key={sec} exercises={exercises} sectionLabel={SECTION_LABELS[sec]} />;
                        })}
                        {(!day.exercises || day.exercises.length === 0) && (
                            <p className="text-center text-sm text-slate-400 py-8">No exercises on this day</p>
                        )}
                    </div>
                )}

                {/* Print view: all days expanded, each day on its own page */}
                <div className="hidden print:block max-w-3xl mx-auto px-4 mt-2">
                    {days.map((d: any, i: number) => (
                        <div key={d.id || i} style={i > 0 ? { pageBreakBefore: 'always' } : undefined}>
                            <div className="mb-4 pb-2 border-b border-slate-200">
                                <h2 className="text-lg font-bold text-slate-800">{d.name || `Day ${d.day_number}`}</h2>
                                <p className="text-[10px] text-slate-400">{data.name} — Day {d.day_number || i + 1} of {days.length}</p>
                            </div>
                            {d.instructions && <p className="text-sm text-slate-500 mb-3">{d.instructions}</p>}
                            {SECTION_ORDER.map(sec => {
                                const exercises = (d.exercises || []).filter((e: any) => e.section === sec);
                                return <ExerciseTable key={sec} exercises={exercises} sectionLabel={SECTION_LABELS[sec]} />;
                            })}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // ── Render Template ─────────────────────────────────────────────────────
    const sections = data.sections || {};
    const exerciseDetails = data.exercise_details || {};

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
                {SECTION_ORDER.map(sec => {
                    const exercises = sections[sec] || [];
                    return <ExerciseTable key={sec} exercises={exercises} sectionLabel={SECTION_LABELS[sec]} exerciseDetails={exerciseDetails} />;
                })}
                {Object.values(sections).every((arr: any) => !arr || arr.length === 0) && (
                    <p className="text-center text-sm text-slate-400 py-8">No exercises in this workout</p>
                )}
            </div>
        </div>
    );
};

export default PublicWorkoutView;
