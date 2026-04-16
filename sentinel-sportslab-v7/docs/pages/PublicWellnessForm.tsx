import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { DatabaseService } from '../services/databaseService';
import { supabase } from '../lib/supabase';
import { CheckCircle2, AlertCircle, Clock, ChevronRight, ChevronLeft, Send, Activity } from 'lucide-react';
import BodyMapSelector from '../components/wellness/BodyMapSelector';
import { BODY_MAP_AREAS } from '../utils/mocks';
import { BORG_RPE_SCALE } from '../utils/constants';

// ── Types ─────────────────────────────────────────────────────────────────────

interface VisibleStep {
    question: any;
    areaContext?: string;   // body area key (e.g. 'hamstrings')
    areaLabel?: string;     // human-readable (e.g. 'Hamstrings')
    responseKey: string;    // key into responses object
}

// ── Component ─────────────────────────────────────────────────────────────────

const PublicWellnessForm: React.FC = () => {
    const { templateId, teamId } = useParams<{ templateId: string; teamId: string }>();
    const [searchParams] = useSearchParams();
    const shareSessionId = searchParams.get('s') || undefined;

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [template, setTemplate] = useState<any>(null);
    const [athletes, setAthletes] = useState<{ id: string; name: string }[]>([]);

    const [selectedAthleteId, setSelectedAthleteId] = useState('');
    const [responses, setResponses] = useState<Record<string, any>>({});
    const [currentStep, setCurrentStep] = useState(0); // 0 = Name selection, 1..N = Questions

    // Public form: clear any stale/expired session so the anon key is used on submit.
    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            if (!data.session) supabase.auth.signOut({ scope: 'local' });
        });
    }, []);

    useEffect(() => {
        const loadData = async () => {
            if (!templateId || !teamId) return;
            try {
                const data = await DatabaseService.getWellnessFormData(templateId, teamId);
                setTemplate(data.template);
                setAthletes(data.athletes || []);
            } catch (err) {
                console.error(err);
                setError("Failed to load form. Link may be expired or invalid.");
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [templateId, teamId]);

    // ── Build area label lookup ───────────────────────────────────────────────
    const areaLabelMap = useMemo(() => {
        const map: Record<string, string> = {};
        (BODY_MAP_AREAS || []).forEach(a => { map[a.key] = a.label; });
        return map;
    }, []);

    // ── Compute visible steps (conditional filtering + per-area expansion) ────
    const questions: any[] = template?.questions || [];

    const visibleSteps = useMemo((): VisibleStep[] => {
        const bodyMapAreas: any[] = responses['body_map'] || [];
        const areaKeys = bodyMapAreas.map((a: any) => a.area);
        const steps: VisibleStep[] = [];

        for (const q of questions) {
            // Non-conditional questions are always visible
            if (!q.conditional) {
                steps.push({ question: q, responseKey: q.id });
                continue;
            }

            const { questionId, notEmpty, value } = q.conditional;
            const targetResponse = responses[questionId];

            // Evaluate the conditional
            let conditionMet = false;
            if (notEmpty) {
                if (Array.isArray(targetResponse)) conditionMet = targetResponse.length > 0;
                else conditionMet = targetResponse !== undefined && targetResponse !== null && targetResponse !== '';
            }
            if (value !== undefined) {
                conditionMet = targetResponse === value;
            }

            if (!conditionMet) continue;

            // If conditional references body_map with notEmpty → expand per-area
            if (questionId === 'body_map' && notEmpty && areaKeys.length > 0) {
                for (const areaKey of areaKeys) {
                    steps.push({
                        question: q,
                        areaContext: areaKey,
                        areaLabel: areaLabelMap[areaKey] || areaKey,
                        responseKey: `${q.id}__${areaKey}`,
                    });
                }
            } else {
                steps.push({ question: q, responseKey: q.id });
            }
        }

        return steps;
    }, [questions, responses, areaLabelMap]);

    const totalSteps = visibleSteps.length + 1; // +1 for athlete selection

    // Clamp currentStep if visible steps shrink (e.g. user goes back and clears body areas)
    useEffect(() => {
        if (currentStep > visibleSteps.length) {
            setCurrentStep(visibleSteps.length);
        }
    }, [visibleSteps.length, currentStep]);

    const handleNext = () => {
        if (currentStep === 0 && !selectedAthleteId) return;
        setCurrentStep(prev => prev + 1);
        window.scrollTo(0, 0);
    };

    const handleBack = () => setCurrentStep(prev => Math.max(0, prev - 1));

    const handleSubmit = async () => {
        if (!selectedAthleteId || !template) return;
        setSubmitting(true);
        try {
            // Auto-resolve share session for permalink responses (no ?s= param)
            let resolvedSessionId = shareSessionId;
            if (!resolvedSessionId && teamId && templateId) {
                resolvedSessionId = await DatabaseService.resolveShareSessionId(teamId, templateId) || undefined;
            }

            const validAvailability = ['available', 'modified', 'unavailable'].includes(responses['availability'])
                ? responses['availability'] : undefined;
            await DatabaseService.saveWellnessResponse({
                athlete_id: selectedAthleteId,
                team_id: teamId!,
                questionnaire_template_id: templateId,
                session_date: new Date().toISOString().split('T')[0],
                responses,
                rpe: typeof responses['rpe'] === 'number' ? responses['rpe'] : undefined,
                availability: validAvailability,
                injury_report: responses['body_map'] ? { areas: responses['body_map'] } : undefined,
                share_session_id: resolvedSessionId,
            });
            setSubmitted(true);
        } catch (err) {
            console.error(err);
            alert("Failed to submit. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <div className="text-center">
                <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-500 font-medium">Loading questionnaire...</p>
            </div>
        </div>
    );

    if (submitted) return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 animate-bounce">
                <CheckCircle2 size={40} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Check-in Complete!</h1>
            <p className="text-slate-500 mb-8 max-w-xs">Your wellness data has been sent to your coach. Have a great session!</p>
            <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold shadow-lg active:scale-95 transition-all"
            >
                Submit New Response
            </button>
        </div>
    );

    if (error) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
            <div className="p-8 bg-white rounded-3xl shadow-xl border border-slate-100 text-center max-w-sm">
                <AlertCircle size={48} className="text-rose-500 mx-auto mb-4" />
                <h1 className="text-xl font-bold text-slate-900 mb-2">Expired Link</h1>
                <p className="text-slate-500 mb-6">{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-bold"
                >
                    Retry
                </button>
            </div>
        </div>
    );

    // ── Severity color map for URTI illness symptom options ────────────────────
    const SEVERITY_OPTION_COLORS: Record<string, { selected: string; unselected: string }> = {
        'No Symptoms': { selected: 'bg-emerald-500 border-emerald-500 text-white shadow-xl scale-[1.02]', unselected: 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:border-emerald-300' },
        'Mild':        { selected: 'bg-amber-500 border-amber-500 text-white shadow-xl scale-[1.02]',    unselected: 'bg-amber-50 border-amber-200 text-amber-700 hover:border-amber-300' },
        'Moderate':    { selected: 'bg-orange-500 border-orange-500 text-white shadow-xl scale-[1.02]',  unselected: 'bg-orange-50 border-orange-200 text-orange-700 hover:border-orange-300' },
        'Severe':      { selected: 'bg-rose-500 border-rose-500 text-white shadow-xl scale-[1.02]',      unselected: 'bg-rose-50 border-rose-200 text-rose-700 hover:border-rose-300' },
    };

    // ── Determine if Continue button should be disabled ───────────────────────
    // All questions are required EXCEPT body_map (injury selection is optional).
    // This overrides the template's required flag to ensure athletes can't skip questions.
    const isContinueDisabled = (() => {
        if (currentStep === 0) return !selectedAthleteId;
        const step = visibleSteps[currentStep - 1];
        if (!step) return true;
        const q = step.question;
        // body_map is the only truly optional question
        if (q.type === 'body_map' || q.type === 'buttons') return false;
        const val = responses[step.responseKey];
        return val === undefined || val === null || val === '';
    })();

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Branding + Header */}
            <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
                <div className="flex flex-col items-center justify-center gap-1 py-3 border-b border-slate-50">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                            <Activity size={13} className="text-white" />
                        </div>
                        <span className="font-bold text-sm text-slate-900 tracking-tight">
                            Sentinel <span className="text-indigo-600">SportsLab</span>
                        </span>
                    </div>
                    <span className="text-[9px] text-slate-400 tracking-wide uppercase">Athlete Monitoring & Performance Intelligence</span>
                </div>
                <div className="px-6 py-2 flex items-center justify-end">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Step {currentStep + 1} of {totalSteps}
                    </div>
                </div>
            </header>

            {/* Progress Bar */}
            <div className="h-1.5 w-full bg-slate-100">
                <div
                    className="h-full bg-cyan-500 transition-all duration-500 ease-out"
                    style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
                />
            </div>

            <main className="flex-1 overflow-y-auto p-6 pb-2 max-w-md mx-auto w-full">
                {currentStep === 0 ? (
                    <div className="flex-1">
                        <h2 className="text-2xl font-black text-slate-900 mb-2">Welcome!</h2>
                        <p className="text-slate-500 mb-8 font-medium">Select your name to begin the daily wellness check-in.</p>

                        <div className="space-y-3">
                            {athletes.map(a => (
                                <button
                                    key={a.id}
                                    onClick={() => setSelectedAthleteId(a.id)}
                                    className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${selectedAthleteId === a.id
                                            ? 'bg-cyan-50 border-cyan-500 shadow-md ring-4 ring-cyan-50/50 scale-[1.02]'
                                            : 'bg-white border-slate-100 text-slate-700 hover:border-slate-200'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-lg">{a.name}</span>
                                        {selectedAthleteId === a.id && <CheckCircle2 size={24} className="text-cyan-600" />}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="flex-1">
                        {(() => {
                            const step = visibleSteps[currentStep - 1];
                            if (!step) return null;
                            const q = step.question;
                            const rk = step.responseKey;

                            return (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="px-2 py-0.5 bg-slate-200 text-slate-600 text-[10px] font-black rounded uppercase tracking-tighter">
                                            {q.category}
                                        </div>
                                    </div>

                                    {/* Per-area badge (when this is a follow-up for a specific body area) */}
                                    {step.areaContext && (
                                        <div className="mb-3 px-3 py-2 bg-cyan-50 border border-cyan-100 rounded-xl inline-flex items-center gap-2">
                                            <Activity size={12} className="text-cyan-600" />
                                            <span className="text-[11px] font-black text-cyan-700 uppercase tracking-wide">
                                                {step.areaLabel}
                                            </span>
                                        </div>
                                    )}

                                    {/* Reference image (any question type) */}
                                    {q.imageUrl && (
                                        <div className="rounded-2xl overflow-hidden border border-slate-100 bg-white mb-6">
                                            <img
                                                src={q.imageUrl}
                                                alt="Reference"
                                                className="w-full object-contain max-h-56"
                                            />
                                        </div>
                                    )}

                                    <h2 className="text-2xl font-black text-slate-900 leading-tight">{q.text}</h2>
                                    {q.description && (
                                        <p className="text-slate-500 font-medium mt-1">{q.description}</p>
                                    )}
                                    <div className="mb-8" />

                                    {/* Question Inputs */}
                                    {(() => {
                                        const scaleMatch = q.type.match(/^scale_(\d+)_(\d+)$/);
                                        const isNumericScale = q.type === 'scale' || !!scaleMatch;

                                        if (isNumericScale) {
                                            const min = scaleMatch ? parseInt(scaleMatch[1]) : (q.scaleMin ?? 0);
                                            const max = scaleMatch ? parseInt(scaleMatch[2]) : (q.scaleMax ?? 10);
                                            const scaleSteps = Array.from({ length: max - min + 1 }, (_, i) => min + i);
                                            const useGrid = scaleSteps.length > 6;
                                            const isRpe = q.type === 'scale_1_10';

                                            // RPE gradient colors matching standard RPE chart (blue → green → yellow → orange → red)
                                            const rpeColors: Record<number, { selected: string; unselected: string }> = {
                                                1:  { selected: 'bg-sky-400 border-sky-400 text-white shadow-xl scale-[1.02]',        unselected: 'bg-sky-50 border-sky-200 text-sky-700 hover:border-sky-300' },
                                                2:  { selected: 'bg-sky-400 border-sky-400 text-white shadow-xl scale-[1.02]',        unselected: 'bg-sky-50 border-sky-200 text-sky-700 hover:border-sky-300' },
                                                3:  { selected: 'bg-lime-500 border-lime-500 text-white shadow-xl scale-[1.02]',      unselected: 'bg-lime-50 border-lime-200 text-lime-700 hover:border-lime-300' },
                                                4:  { selected: 'bg-lime-500 border-lime-500 text-white shadow-xl scale-[1.02]',      unselected: 'bg-lime-50 border-lime-200 text-lime-700 hover:border-lime-300' },
                                                5:  { selected: 'bg-yellow-400 border-yellow-400 text-white shadow-xl scale-[1.02]',  unselected: 'bg-yellow-50 border-yellow-200 text-yellow-700 hover:border-yellow-300' },
                                                6:  { selected: 'bg-yellow-400 border-yellow-400 text-white shadow-xl scale-[1.02]',  unselected: 'bg-yellow-50 border-yellow-200 text-yellow-700 hover:border-yellow-300' },
                                                7:  { selected: 'bg-amber-500 border-amber-500 text-white shadow-xl scale-[1.02]',    unselected: 'bg-amber-50 border-amber-200 text-amber-700 hover:border-amber-300' },
                                                8:  { selected: 'bg-orange-500 border-orange-500 text-white shadow-xl scale-[1.02]',  unselected: 'bg-orange-50 border-orange-200 text-orange-700 hover:border-orange-300' },
                                                9:  { selected: 'bg-red-500 border-red-500 text-white shadow-xl scale-[1.02]',        unselected: 'bg-red-50 border-red-200 text-red-700 hover:border-red-300' },
                                                10: { selected: 'bg-red-600 border-red-600 text-white shadow-xl scale-[1.02]',        unselected: 'bg-red-50 border-red-200 text-red-700 hover:border-red-300' },
                                            };

                                            // RPE: compact vertical list with number + label + color
                                            if (isRpe) {
                                                return (
                                                    <div className="space-y-1.5">
                                                        {scaleSteps.map(val => {
                                                            const isSelected = responses[rk] === val;
                                                            const style = rpeColors[val];
                                                            const borgLabel = BORG_RPE_SCALE[val]?.label || '';
                                                            return (
                                                                <button
                                                                    key={val}
                                                                    type="button"
                                                                    onClick={() => setResponses({ ...responses, [rk]: val })}
                                                                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 font-bold transition-all active:scale-[0.98] ${
                                                                        isSelected ? style.selected : style.unselected
                                                                    }`}
                                                                >
                                                                    <span className="text-lg font-black w-7 text-center shrink-0">{val}</span>
                                                                    <span className="text-sm">{borgLabel}</span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            }

                                            // Health severity scale (0-3): plain buttons with descriptors
                                            const isHealthSeverity = q.type === 'scale_0_3' && q.category === 'health';
                                            if (isHealthSeverity) {
                                                const severityLabels: Record<number, string> = { 0: 'None', 1: 'Mild', 2: 'Moderate', 3: 'Severe' };
                                                return (
                                                    <div className="space-y-2">
                                                        {scaleSteps.map(val => {
                                                            const isSelected = responses[rk] === val;
                                                            return (
                                                                <button
                                                                    key={val}
                                                                    type="button"
                                                                    onClick={() => setResponses({ ...responses, [rk]: val })}
                                                                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 font-bold transition-all active:scale-[0.98] ${
                                                                        isSelected
                                                                            ? 'bg-slate-900 border-slate-900 text-white shadow-xl scale-[1.02]'
                                                                            : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200'
                                                                    }`}
                                                                >
                                                                    <span className="text-lg font-black w-7 text-center shrink-0">{val}</span>
                                                                    <span className="text-sm font-semibold">{severityLabels[val] || val}</span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            }

                                            // Non-RPE scales: grid or vertical list
                                            return (
                                                <div>
                                                    {(q.labels?.[0] || q.labels?.[1]) && (
                                                        <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">
                                                            <span>{q.labels[0]}</span>
                                                            <span>{q.labels[1]}</span>
                                                        </div>
                                                    )}
                                                    <div className={useGrid ? 'grid grid-cols-5 gap-2' : 'flex flex-col gap-3'}>
                                                        {scaleSteps.map(val => {
                                                            const isSelected = responses[rk] === val;
                                                            return (
                                                                <button
                                                                    key={val}
                                                                    type="button"
                                                                    onClick={() => setResponses({ ...responses, [rk]: val })}
                                                                    className={`${useGrid ? 'aspect-square text-xl' : 'w-full p-5 text-left'} rounded-2xl border-2 font-black transition-all ${
                                                                        isSelected
                                                                            ? 'bg-slate-900 border-slate-900 text-white shadow-xl scale-[1.02]'
                                                                            : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200'
                                                                    }`}
                                                                >
                                                                    {val}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        }

                                        if (q.type === 'yes_no') {
                                            return (
                                                <div className="flex flex-col gap-3">
                                                    {['Yes', 'No'].map(opt => {
                                                        const isSelected = responses[rk] === opt;
                                                        return (
                                                            <button
                                                                key={opt}
                                                                type="button"
                                                                onClick={() => setResponses({ ...responses, [rk]: opt })}
                                                                className={`w-full p-5 rounded-2xl border-2 text-left font-bold transition-all ${isSelected
                                                                    ? 'bg-slate-900 border-slate-900 text-white shadow-xl scale-[1.02]'
                                                                    : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200'
                                                                }`}
                                                            >
                                                                {opt}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        }

                                        if (q.type === 'multiple_choice') {
                                            return (
                                                <div className="space-y-3">
                                                    {(q.options || []).map((opt: any, idx: number) => {
                                                        const val = q.numericMap ? q.numericMap[idx] : opt;
                                                        const isSelected = responses[rk] === val;
                                                        const sevStyle = SEVERITY_OPTION_COLORS[opt];
                                                        return (
                                                            <button
                                                                key={idx}
                                                                type="button"
                                                                onClick={() => setResponses({ ...responses, [rk]: val })}
                                                                className={`w-full p-5 rounded-2xl border-2 text-left font-bold transition-all ${
                                                                    sevStyle
                                                                        ? (isSelected ? sevStyle.selected : sevStyle.unselected)
                                                                        : (isSelected
                                                                            ? 'bg-slate-900 border-slate-900 text-white shadow-xl scale-[1.02]'
                                                                            : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200')
                                                                }`}
                                                            >
                                                                {opt}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        }

                                        if (q.type === 'buttons') {
                                            return (
                                                <BodyMapSelector
                                                    value={responses[rk] || []}
                                                    onChange={(val) => setResponses({ ...responses, [rk]: val })}
                                                    config={q.bodyMapConfig}
                                                />
                                            );
                                        }

                                        if (q.type === 'body_map') {
                                            const bmc = q.bodyMapConfig;
                                            const subType = bmc?.subInputType || 'buttons';

                                            if (subType === 'buttons') {
                                                return (
                                                    <BodyMapSelector
                                                        value={responses[rk] || []}
                                                        onChange={(val) => setResponses({ ...responses, [rk]: val })}
                                                        config={bmc}
                                                    />
                                                );
                                            }

                                            return (
                                                <div className="space-y-4">
                                                    {bmc?.referenceImageUrl && (
                                                        <div className="rounded-2xl overflow-hidden border border-slate-100 bg-white">
                                                            <img src={bmc.referenceImageUrl} alt="Reference" className="w-full object-contain max-h-56" />
                                                        </div>
                                                    )}

                                                    {subType === 'scale' && (() => {
                                                        const min = bmc?.subInputScaleMin ?? 0;
                                                        const max = bmc?.subInputScaleMax ?? 10;
                                                        const scaleSteps = Array.from({ length: max - min + 1 }, (_, i) => min + i);
                                                        const useGrid = scaleSteps.length > 6;
                                                        return (
                                                            <div>
                                                                {(bmc?.subInputLabels?.[0] || bmc?.subInputLabels?.[1]) && (
                                                                    <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">
                                                                        <span>{bmc!.subInputLabels![0]}</span>
                                                                        <span>{bmc!.subInputLabels![1]}</span>
                                                                    </div>
                                                                )}
                                                                <div className={useGrid ? 'grid grid-cols-5 gap-2' : 'flex flex-col gap-3'}>
                                                                    {scaleSteps.map(val => (
                                                                        <button key={val} type="button"
                                                                            onClick={() => setResponses({ ...responses, [rk]: val })}
                                                                            className={`${useGrid ? 'aspect-square text-xl' : 'w-full p-5 text-left'} rounded-2xl border-2 font-black transition-all ${responses[rk] === val
                                                                                ? 'bg-slate-900 border-slate-900 text-white shadow-xl scale-[1.02]'
                                                                                : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200'
                                                                            }`}
                                                                        >{val}</button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}

                                                    {subType === 'multiple_choice' && (
                                                        <div className="space-y-3">
                                                            {(bmc?.subInputOptions || []).map((opt: string, idx: number) => {
                                                                const val = bmc?.subInputNumericMap?.[idx] ?? opt;
                                                                return (
                                                                    <button key={idx} type="button"
                                                                        onClick={() => setResponses({ ...responses, [rk]: val })}
                                                                        className={`w-full p-5 rounded-2xl border-2 text-left font-bold transition-all ${responses[rk] === val
                                                                            ? 'bg-slate-900 border-slate-900 text-white shadow-xl scale-[1.02]'
                                                                            : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200'
                                                                        }`}
                                                                    >{opt}</button>
                                                                );
                                                            })}
                                                        </div>
                                                    )}

                                                    {subType === 'checklist' && (
                                                        <div className="space-y-3">
                                                            {(bmc?.subInputOptions || []).map((opt: string, idx: number) => {
                                                                const checked = Array.isArray(responses[rk]) && (responses[rk] as string[]).includes(opt);
                                                                return (
                                                                    <button key={idx} type="button"
                                                                        onClick={() => {
                                                                            const cur: string[] = Array.isArray(responses[rk]) ? responses[rk] as string[] : [];
                                                                            setResponses({ ...responses, [rk]: checked ? cur.filter(v => v !== opt) : [...cur, opt] });
                                                                        }}
                                                                        className={`w-full p-5 rounded-2xl border-2 text-left font-bold transition-all flex items-center gap-3 ${checked
                                                                            ? 'bg-slate-900 border-slate-900 text-white shadow-xl'
                                                                            : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200'
                                                                        }`}
                                                                    >
                                                                        <span className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${checked ? 'bg-white border-white' : 'border-slate-300'}`}>
                                                                            {checked && <span className="text-slate-900 text-xs font-black">&#10003;</span>}
                                                                        </span>
                                                                        {opt}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    )}

                                                    {subType === 'yes_no' && (
                                                        <div className="flex flex-col gap-3">
                                                            {['Yes', 'No'].map(opt => (
                                                                <button key={opt} type="button"
                                                                    onClick={() => setResponses({ ...responses, [rk]: opt })}
                                                                    className={`w-full p-5 rounded-2xl border-2 text-left font-bold transition-all ${responses[rk] === opt
                                                                        ? 'bg-slate-900 border-slate-900 text-white shadow-xl scale-[1.02]'
                                                                        : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200'
                                                                    }`}
                                                                >{opt}</button>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {subType === 'text' && (
                                                        <textarea
                                                            value={responses[rk] || ''}
                                                            onChange={e => setResponses({ ...responses, [rk]: e.target.value })}
                                                            className="w-full p-4 rounded-2xl border-2 border-slate-100 text-slate-700 font-semibold min-h-[120px] focus:outline-none focus:border-slate-300 transition-all"
                                                            placeholder="Type your answer..."
                                                        />
                                                    )}
                                                </div>
                                            );
                                        }

                                        return (
                                            <p className="text-center p-8 bg-slate-100 rounded-2xl text-slate-400 font-bold">
                                                {q.type} input not yet implemented
                                            </p>
                                        );
                                    })()}
                                </div>
                            );
                        })()}
                    </div>
                )}

            </main>

            {/* Sticky Footer Navigation */}
            <div className="sticky bottom-0 z-10 bg-slate-50 border-t border-slate-100">
                <div className="flex gap-4 px-6 py-4 max-w-md mx-auto w-full">
                    {currentStep > 0 && (
                        <button
                            type="button"
                            onClick={handleBack}
                            className="p-4 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl font-bold active:scale-95 transition-all"
                        >
                            <ChevronLeft />
                        </button>
                    )}

                    {currentStep < totalSteps - 1 ? (
                        <button
                            type="button"
                            onClick={handleNext}
                            disabled={isContinueDisabled}
                            className="flex-1 py-4 bg-cyan-600 text-white rounded-2xl font-black text-lg shadow-lg shadow-cyan-200 disabled:opacity-50 disabled:grayscale transition-all active:scale-[0.98]"
                        >
                            <div className="flex items-center justify-center gap-2">
                                {currentStep === 0 ? 'START CHECK-IN' : 'CONTINUE'}
                                <ChevronRight size={20} />
                            </div>
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-lg shadow-xl shadow-slate-200 disabled:opacity-50 transition-all active:scale-[0.98]"
                        >
                            <div className="flex items-center justify-center gap-2">
                                {submitting ? <Clock className="animate-spin" /> : <Send size={20} />}
                                {submitting ? 'SUBMITTING...' : 'COMPLETE CHECK-IN'}
                            </div>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PublicWellnessForm;
