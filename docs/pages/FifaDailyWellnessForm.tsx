// @ts-nocheck
/**
 * FIFA-Aligned Daily Wellness Form (Tier 1)
 *
 * Public-facing form for daily athlete check-in (< 2 minutes).
 * Based on Waldén et al. (2023, BJSM) consensus and sport scientist partner's research.
 *
 * 8 inputs: Availability, Health complaint, 5 wellness metrics (1-10), Sleep hours, Readiness
 * URL: /daily-wellness/:teamId
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { DatabaseService } from '../services/databaseService';
import BodyMapSelector from '../components/wellness/BodyMapSelector';
import { DEFAULT_BODY_MAP_CONFIG } from '../utils/mocks';
import { AlertTriangle } from 'lucide-react';
import { CheckCircle2, AlertCircle, Activity, ChevronRight, ChevronLeft, Send } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════
// Wellness scale colour gradient (1-10)
// 1-2 = green (good), 3-4 = lime, 5-6 = yellow, 7-8 = orange, 9-10 = red (bad)
// For POSITIVE metrics (sleep quality, mood) the scale is REVERSED visually
// ═══════════════════════════════════════════════════════════════════════

const SCALE_COLORS: Record<number, { selected: string; unselected: string }> = {
    1:  { selected: 'bg-emerald-500 border-emerald-500 text-white shadow-lg scale-[1.03]', unselected: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
    2:  { selected: 'bg-emerald-500 border-emerald-500 text-white shadow-lg scale-[1.03]', unselected: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
    3:  { selected: 'bg-lime-500 border-lime-500 text-white shadow-lg scale-[1.03]',       unselected: 'bg-lime-50 border-lime-200 text-lime-700' },
    4:  { selected: 'bg-lime-500 border-lime-500 text-white shadow-lg scale-[1.03]',       unselected: 'bg-lime-50 border-lime-200 text-lime-700' },
    5:  { selected: 'bg-yellow-400 border-yellow-400 text-white shadow-lg scale-[1.03]',   unselected: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
    6:  { selected: 'bg-yellow-400 border-yellow-400 text-white shadow-lg scale-[1.03]',   unselected: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
    7:  { selected: 'bg-amber-500 border-amber-500 text-white shadow-lg scale-[1.03]',     unselected: 'bg-amber-50 border-amber-200 text-amber-700' },
    8:  { selected: 'bg-orange-500 border-orange-500 text-white shadow-lg scale-[1.03]',   unselected: 'bg-orange-50 border-orange-200 text-orange-700' },
    9:  { selected: 'bg-red-500 border-red-500 text-white shadow-lg scale-[1.03]',         unselected: 'bg-red-50 border-red-200 text-red-700' },
    10: { selected: 'bg-red-600 border-red-600 text-white shadow-lg scale-[1.03]',         unselected: 'bg-red-50 border-red-200 text-red-700' },
};

// Reversed for positive metrics (1=bad, 10=good)
const SCALE_COLORS_POSITIVE: Record<number, { selected: string; unselected: string }> = {
    1:  { selected: 'bg-red-600 border-red-600 text-white shadow-lg scale-[1.03]',         unselected: 'bg-red-50 border-red-200 text-red-700' },
    2:  { selected: 'bg-red-500 border-red-500 text-white shadow-lg scale-[1.03]',         unselected: 'bg-red-50 border-red-200 text-red-700' },
    3:  { selected: 'bg-orange-500 border-orange-500 text-white shadow-lg scale-[1.03]',   unselected: 'bg-orange-50 border-orange-200 text-orange-700' },
    4:  { selected: 'bg-amber-500 border-amber-500 text-white shadow-lg scale-[1.03]',     unselected: 'bg-amber-50 border-amber-200 text-amber-700' },
    5:  { selected: 'bg-yellow-400 border-yellow-400 text-white shadow-lg scale-[1.03]',   unselected: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
    6:  { selected: 'bg-yellow-400 border-yellow-400 text-white shadow-lg scale-[1.03]',   unselected: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
    7:  { selected: 'bg-lime-500 border-lime-500 text-white shadow-lg scale-[1.03]',       unselected: 'bg-lime-50 border-lime-200 text-lime-700' },
    8:  { selected: 'bg-lime-500 border-lime-500 text-white shadow-lg scale-[1.03]',       unselected: 'bg-lime-50 border-lime-200 text-lime-700' },
    9:  { selected: 'bg-emerald-500 border-emerald-500 text-white shadow-lg scale-[1.03]', unselected: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
    10: { selected: 'bg-emerald-500 border-emerald-500 text-white shadow-lg scale-[1.03]', unselected: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
};

// ═══════════════════════════════════════════════════════════════════════
// Step definitions
// ═══════════════════════════════════════════════════════════════════════

interface FormStep {
    id: string;
    heading: string;
    instruction?: string;
    type: 'athlete_select' | 'availability' | 'yes_no' | 'health_type' | 'scale_negative' | 'scale_positive' | 'number' | 'readiness' | 'body_map';
    lowLabel?: string;
    highLabel?: string;
    conditional?: boolean;  // only show if certain condition met
}

const ALL_STEPS: FormStep[] = [
    { id: 'athlete', heading: 'Who are you?', instruction: 'Select your name to begin.', type: 'athlete_select' },
    { id: 'availability', heading: 'Availability', instruction: 'What is your training status today?', type: 'availability' },
    { id: 'health_complaint', heading: 'Health Check', instruction: 'Do you have any physical complaint today? (e.g. pain, illness — flag to medical team if yes)', type: 'health_type' },
    { id: 'illness_severity', heading: 'Illness Severity', instruction: 'How would you describe your illness symptoms today?', type: 'health_type', conditional: true },
    { id: 'complaint_areas', heading: 'Where is the problem?', instruction: 'Tap the affected area(s) on the body map. Tap again to increase severity.', type: 'body_map', conditional: true },
    { id: 'fatigue', heading: 'Fatigue', instruction: 'How fatigued do you feel right now?', type: 'scale_negative', lowLabel: 'Fully fresh', highLabel: 'Completely exhausted' },
    { id: 'soreness', heading: 'Muscle Soreness', instruction: 'Rate your overall muscle soreness.', type: 'scale_negative', lowLabel: 'No soreness', highLabel: 'Severe pain' },
    { id: 'sleep_quality', heading: 'Sleep Quality', instruction: 'How well did you sleep last night?', type: 'scale_positive', lowLabel: 'Very poor', highLabel: 'Excellent' },
    { id: 'stress', heading: 'Stress', instruction: 'Rate your non-training stress level.', type: 'scale_negative', lowLabel: 'No stress', highLabel: 'Extreme stress' },
    { id: 'mood', heading: 'Mood', instruction: 'How are you feeling mentally today?', type: 'scale_positive', lowLabel: 'Very low', highLabel: 'Very positive' },
    { id: 'sleep_hours', heading: 'Sleep Duration', instruction: 'How many hours did you sleep last night?', type: 'number' },
    { id: 'readiness', heading: 'Post-Session Feeling', instruction: 'How are you feeling after today\'s session?', type: 'readiness' },
];

const AVAILABILITY_OPTIONS = [
    { value: 'available', label: 'Fully Available', desc: 'No restrictions', color: 'emerald' },
    { value: 'modified', label: 'Modified Training', desc: 'Available with adjustments', color: 'amber' },
    { value: 'unavailable_training', label: 'Unavailable — Training', desc: 'Cannot train today', color: 'rose' },
    { value: 'unavailable_match', label: 'Unavailable — Match', desc: 'Cannot be selected for match', color: 'rose' },
];

const READINESS_OPTIONS = [
    { value: 'ready', label: 'Feeling Good', desc: 'Recovered well, no concerns after today', color: 'emerald' },
    { value: 'compromised', label: 'Somewhat Fatigued', desc: 'A little tired or sore, but manageable', color: 'amber' },
    { value: 'not_ready', label: 'Heavily Fatigued', desc: 'Significant fatigue or discomfort after today', color: 'rose' },
];

// ═══════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════

const FifaDailyWellnessForm: React.FC = () => {
    const { teamId } = useParams<{ teamId: string }>();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [athletes, setAthletes] = useState<{ id: string; name: string }[]>([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [responses, setResponses] = useState<Record<string, any>>({});
    const [selectedAthleteId, setSelectedAthleteId] = useState('');
    const [weeklyTriggered, setWeeklyTriggered] = useState(false);
    const [weeklyFollowUp, setWeeklyFollowUp] = useState(false);
    const [lastWeeklyDate, setLastWeeklyDate] = useState<string | null>(null);   // last deep check date
    const [repeatTriggerDate, setRepeatTriggerDate] = useState<string | null>(null); // last daily with same flag

    useEffect(() => {
        const load = async () => {
            if (!teamId) return;
            try {
                const data = await DatabaseService.getTeamAthletes(teamId);
                setAthletes(data.athletes || []);
            } catch (err) {
                console.error(err);
                setError('Failed to load form. Please try again.');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [teamId]);

    // Filter steps — show illness_severity when illness/both, complaint_areas when injury/both
    const STEPS = ALL_STEPS.filter(s => {
        if (s.id === 'illness_severity') return responses.health_complaint === 'illness' || responses.health_complaint === 'both';
        if (s.id === 'complaint_areas') return responses.health_complaint === 'injury' || responses.health_complaint === 'both';
        return true;
    });

    const step = STEPS[currentStep];
    const totalSteps = STEPS.length;
    const progress = ((currentStep + 1) / totalSteps) * 100;

    const setVal = (key: string, val: any) => setResponses(prev => ({ ...prev, [key]: val }));

    const canContinue = (() => {
        if (!step) return false;
        if (step.id === 'athlete') return !!selectedAthleteId;
        if (step.id === 'complaint_areas') return true; // body map is optional — can continue without selection
        if (step.id === 'sleep_hours') return responses.sleep_hours != null && responses.sleep_hours > 0;
        if (step.id === 'illness_severity') return !!responses.illness_severity;
        return responses[step.id] !== undefined && responses[step.id] !== null && responses[step.id] !== '';
    })();

    const handleNext = () => { if (canContinue) { setCurrentStep(prev => Math.min(totalSteps - 1, prev + 1)); window.scrollTo(0, 0); } };
    const handleBack = () => setCurrentStep(prev => Math.max(0, prev - 1));

    const handleSubmit = async () => {
        if (!selectedAthleteId || !teamId) return;
        setSubmitting(true);
        try {
            const availability = responses.availability?.startsWith('unavailable') ? 'unavailable' : responses.availability;

            await DatabaseService.saveWellnessResponse({
                athlete_id: selectedAthleteId,
                team_id: teamId,
                session_date: (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })(),
                responses: {
                    fatigue: responses.fatigue,
                    soreness: responses.soreness,
                    sleep_quality: responses.sleep_quality,
                    stress: responses.stress,
                    mood: responses.mood,
                    sleep_hours: responses.sleep_hours,
                    health_complaint: responses.health_complaint,
                    readiness: responses.readiness,
                    ...(responses.illness_severity && { illness_severity: responses.illness_severity }),
                },
                availability,
                tier: 'daily',
                health_problem_flag: responses.health_complaint && responses.health_complaint !== 'no',
                readiness: responses.readiness,
                injury_report: responses.complaint_areas?.length > 0 ? { areas: responses.complaint_areas } : undefined,
            });
            setSubmitted(true);

            // Check if this response triggered a flag → prompt weekly form
            const isRedFlag =
                availability === 'unavailable' ||
                (responses.health_complaint && responses.health_complaint !== 'no') ||
                responses.fatigue >= 8 ||
                (responses.sleep_hours != null && responses.sleep_hours <= 5);

            if (isRedFlag) {
                try {
                    const localDate = (offset = 0) => {
                        const d = new Date();
                        d.setDate(d.getDate() - offset);
                        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                    };
                    const todayStr = localDate(0);

                    // Step 1: already completed a deep check this week → ask if anything new
                    const info = await DatabaseService.getRecentWeeklyInfo(selectedAthleteId, 7);
                    if (info.hasRecent) {
                        setWeeklyFollowUp(true);
                        setLastWeeklyDate(info.lastDate);
                    } else {
                        // Step 2: same flag type in last 3 daily check-ins → ask rather than force
                        const recentDaily = await DatabaseService.fetchWellnessResponsesByAthlete(
                            selectedAthleteId, localDate(3)
                        );
                        const todayHealthFlag = responses.health_complaint && responses.health_complaint !== 'no';
                        const todayFatigueFlag = responses.fatigue >= 8;
                        const todaySleepFlag  = responses.sleep_hours != null && responses.sleep_hours <= 5;
                        const todayAvailFlag  = availability === 'unavailable';

                        const prevMatch = recentDaily.find(r => {
                            if ((r.session_date || '').split('T')[0] === todayStr) return false;
                            if (r.tier === 'weekly') return false;
                            const rr = r.responses || {};
                            return (todayHealthFlag && rr.health_complaint && rr.health_complaint !== 'no') ||
                                   (todayFatigueFlag && rr.fatigue >= 8) ||
                                   (todaySleepFlag  && rr.sleep_hours != null && rr.sleep_hours <= 5) ||
                                   (todayAvailFlag  && r.availability === 'unavailable');
                        });

                        if (prevMatch) {
                            setWeeklyFollowUp(true);
                            setRepeatTriggerDate((prevMatch.session_date || '').split('T')[0]);
                        } else {
                            setWeeklyTriggered(true);
                        }
                    }
                } catch { setWeeklyTriggered(true); }
            }

        } catch (err) {
            console.error(err);
            alert('Failed to submit. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const isLastStep = currentStep === totalSteps - 1;

    // ═══════════════════════════════════════════════════════════════════
    // Render helpers
    // ═══════════════════════════════════════════════════════════════════

    const renderScale = (id: string, positive: boolean) => {
        const colors = positive ? SCALE_COLORS_POSITIVE : SCALE_COLORS;
        const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

        // Per-metric descriptors
        const SCALE_LABELS = {
            fatigue:       { 1: 'Fully fresh', 2: 'Very good', 3: 'Good', 4: 'Fairly good', 5: 'Moderate', 6: 'Slightly fatigued', 7: 'Fatigued', 8: 'Very fatigued', 9: 'Exhausted', 10: 'Completely exhausted' },
            soreness:      { 1: 'No soreness', 2: 'Barely noticeable', 3: 'Mild', 4: 'Slight discomfort', 5: 'Moderate', 6: 'Noticeable', 7: 'Uncomfortable', 8: 'Painful', 9: 'Very painful', 10: 'Severe pain' },
            stress:        { 1: 'Completely relaxed', 2: 'Very calm', 3: 'Calm', 4: 'Mostly calm', 5: 'Moderate', 6: 'Slightly stressed', 7: 'Stressed', 8: 'Very stressed', 9: 'Overwhelmed', 10: 'Extreme stress' },
            sleep_quality: { 1: 'Very poor', 2: 'Poor', 3: 'Below average', 4: 'Fair', 5: 'Moderate', 6: 'Above average', 7: 'Good', 8: 'Very good', 9: 'Excellent', 10: 'Outstanding' },
            mood:          { 1: 'Very low', 2: 'Low', 3: 'Down', 4: 'Slightly low', 5: 'Neutral', 6: 'Slightly positive', 7: 'Positive', 8: 'Very positive', 9: 'Great', 10: 'Exceptional' },
        };
        const labels = SCALE_LABELS[id] || (positive
            ? { 1: 'Very poor', 2: 'Poor', 3: 'Below average', 4: 'Fair', 5: 'Moderate', 6: 'Above average', 7: 'Good', 8: 'Very good', 9: 'Excellent', 10: 'Outstanding' }
            : { 1: 'None', 2: 'Very low', 3: 'Low', 4: 'Mild', 5: 'Moderate', 6: 'Noticeable', 7: 'High', 8: 'Very high', 9: 'Severe', 10: 'Extreme' });

        return (
            <div className="space-y-1.5">
                {values.map(val => {
                    const isSelected = responses[id] === val;
                    const c = colors[val];
                    return (
                        <button
                            key={val}
                            type="button"
                            onClick={() => setVal(id, val)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 font-bold transition-all active:scale-[0.98] ${
                                isSelected ? c.selected : c.unselected
                            }`}
                        >
                            <span className="text-lg font-bold w-7 text-center shrink-0">{val}</span>
                            <span className="text-sm">{labels[val]}</span>
                        </button>
                    );
                })}
            </div>
        );
    };

    const renderOptionCards = (options: { value: string; label: string; desc: string; color: string }[], id: string) => (
        <div className="space-y-2.5">
            {options.map(opt => {
                const isSelected = responses[id] === opt.value;
                const colorMap = {
                    emerald: { selected: 'bg-emerald-500 border-emerald-500 text-white shadow-lg scale-[1.02]', unselected: 'bg-emerald-50 border-emerald-200' },
                    amber: { selected: 'bg-amber-500 border-amber-500 text-white shadow-lg scale-[1.02]', unselected: 'bg-amber-50 border-amber-200' },
                    rose: { selected: 'bg-rose-500 border-rose-500 text-white shadow-lg scale-[1.02]', unselected: 'bg-rose-50 border-rose-200' },
                };
                const c = colorMap[opt.color] || colorMap.emerald;
                return (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={() => setVal(id, opt.value)}
                        className={`w-full p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.98] ${
                            isSelected ? c.selected : `${c.unselected} text-slate-700 hover:border-slate-300`
                        }`}
                    >
                        <div className="font-bold text-base">{opt.label}</div>
                        <div className={`text-xs mt-0.5 ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>{opt.desc}</div>
                    </button>
                );
            })}
        </div>
    );

    // ═══════════════════════════════════════════════════════════════════
    // Loading / Error / Submitted states
    // ═══════════════════════════════════════════════════════════════════

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <div className="text-center">
                <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-500 font-medium">Loading wellness form...</p>
            </div>
        </div>
    );

    if (submitted) return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center">
            {weeklyTriggered ? (
                /* ── STATE 1: First-time red flag — no recent weekly ── */
                <>
                    <div className="w-24 h-24 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-6 animate-pulse">
                        <AlertTriangle size={48} strokeWidth={2.5} />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">One more step</h1>
                    <p className="text-slate-500 mb-6 max-w-sm leading-relaxed">
                        {responses.health_complaint === 'injury'
                            ? 'Your coaching staff need a bit more detail to help manage your injury better. This short follow-up takes between 2–5 minutes.'
                            : responses.health_complaint === 'illness'
                            ? 'Your coaching staff need a bit more detail to help manage your illness better. This short follow-up takes between 2–5 minutes.'
                            : responses.health_complaint === 'both'
                            ? 'Your coaching staff need a bit more detail to help manage your injury and illness better. This short follow-up takes between 2–5 minutes.'
                            : 'Based on your responses, your coaching staff need a bit more detail about what you\'re experiencing. This short follow-up takes between 2–5 minutes.'}
                    </p>
                    <a
                        href={`/weekly-wellness/${teamId}/${selectedAthleteId}${responses.health_complaint && responses.health_complaint !== 'no' ? `?complaint=${responses.health_complaint}` : ''}`}
                        className="w-full max-w-xs px-6 py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-xl shadow-rose-200 active:scale-95 transition-all text-base flex items-center justify-center gap-2"
                    >
                        <AlertTriangle size={18} /> Complete Deep Health Check
                    </a>
                </>
            ) : weeklyFollowUp ? (
                /* ── STATE 2: Repeat trigger or recent deep check — ask if anything new ── */
                <>
                    <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-5">
                        <CheckCircle2 size={40} />
                    </div>
                    <h1 className="text-xl font-bold text-slate-900 mb-3">Daily Check-in Saved</h1>
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6 max-w-sm text-left">
                        {lastWeeklyDate ? (
                            <>
                                <p className="text-sm text-slate-700 leading-relaxed">
                                    You completed a <strong>deep health check</strong> on{' '}
                                    <strong>{new Date(lastWeeklyDate + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}</strong>.
                                    Your daily responses are still flagging similar concerns.
                                </p>
                                <p className="text-sm text-slate-600 mt-3 font-medium">
                                    Has anything changed or is there something new since that report?
                                </p>
                            </>
                        ) : (
                            <>
                                <p className="text-sm text-slate-700 leading-relaxed">
                                    We noticed you flagged a similar concern on{' '}
                                    <strong>{repeatTriggerDate ? new Date(repeatTriggerDate + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' }) : 'a recent day'}</strong>.
                                    Your coaching staff are already aware of this.
                                </p>
                                <p className="text-sm text-slate-600 mt-3 font-medium">
                                    Is this the same issue with no new developments, or has something changed?
                                </p>
                            </>
                        )}
                    </div>
                    <div className="w-full max-w-xs space-y-3">
                        <a
                            href={`/weekly-wellness/${teamId}/${selectedAthleteId}${responses.health_complaint && responses.health_complaint !== 'no' ? `?complaint=${responses.health_complaint}` : ''}`}
                            className="w-full px-6 py-3.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold shadow-lg active:scale-95 transition-all text-sm flex items-center justify-center gap-2"
                        >
                            Yes — something has changed
                        </a>
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-all text-sm"
                        >
                            No change — same issue as before
                        </button>
                    </div>
                </>
            ) : (
                /* ── STATE 3: No flags — normal success ── */
                <>
                    <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 animate-bounce">
                        <CheckCircle2 size={40} />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">Check-in Complete!</h1>
                    <p className="text-slate-500 mb-8 max-w-xs">Your wellness data has been recorded. Great work today!</p>
                    <button onClick={() => window.location.reload()} className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold shadow-lg active:scale-95 transition-all">
                        Submit for Another Athlete
                    </button>
                </>
            )}
        </div>
    );

    if (error) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
            <div className="p-8 bg-white rounded-3xl shadow-xl border border-slate-100 text-center max-w-sm">
                <AlertCircle size={48} className="text-rose-500 mx-auto mb-4" />
                <h1 className="text-xl font-bold text-slate-900 mb-2">Something went wrong</h1>
                <p className="text-slate-500 mb-6">{error}</p>
                <button onClick={() => window.location.reload()} className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-bold">Retry</button>
            </div>
        </div>
    );

    // ═══════════════════════════════════════════════════════════════════
    // Main form render
    // ═══════════════════════════════════════════════════════════════════

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Header */}
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
                    <span className="text-[9px] text-slate-400 tracking-wide uppercase">Daily Wellness Check-in</span>
                </div>
                <div className="px-6 py-2 flex items-center justify-between">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                        {step.heading}
                    </div>
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                        {currentStep + 1} / {totalSteps}
                    </div>
                </div>
            </header>

            {/* Progress bar */}
            <div className="h-1.5 w-full bg-slate-100">
                <div className="h-full bg-cyan-500 transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
            </div>

            {/* Content */}
            <main className="flex-1 overflow-y-auto p-6 pb-2 max-w-md mx-auto w-full">
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h2 className="text-2xl font-bold text-slate-900 leading-tight">{step.heading}</h2>
                    {step.instruction && <p className="text-slate-500 font-medium mt-1 mb-6">{step.instruction}</p>}
                    {!step.instruction && <div className="mb-6" />}

                    {/* Athlete selection */}
                    {step.type === 'athlete_select' && (
                        <div className="space-y-2.5">
                            {athletes.map(a => (
                                <button key={a.id} onClick={() => setSelectedAthleteId(a.id)}
                                    className={`w-full p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.98] ${
                                        selectedAthleteId === a.id
                                            ? 'bg-cyan-50 border-cyan-500 shadow-md ring-4 ring-cyan-50/50 scale-[1.02]'
                                            : 'bg-white border-slate-100 text-slate-700 hover:border-slate-200'
                                    }`}>
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-lg">{a.name}</span>
                                        {selectedAthleteId === a.id && <CheckCircle2 size={24} className="text-cyan-600" />}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Availability */}
                    {step.type === 'availability' && renderOptionCards(AVAILABILITY_OPTIONS, 'availability')}

                    {/* Health type — 4 options driving deep check routing */}
                    {step.type === 'health_type' && step.id === 'health_complaint' && renderOptionCards([
                        { value: 'no',      label: 'No',                      desc: 'No complaints today',                                      color: 'emerald' },
                        { value: 'injury',  label: 'Yes — Injury related',    desc: 'Physical pain, discomfort or musculoskeletal issue',        color: 'amber' },
                        { value: 'illness', label: 'Yes — Illness related',   desc: 'Cold, flu, fever or other non-musculoskeletal concern',     color: 'amber' },
                        { value: 'both',    label: 'Yes — Injury + Illness',  desc: 'Both physical pain and illness symptoms',                   color: 'rose' },
                    ], 'health_complaint')}

                    {/* Illness severity — shown when illness or both selected */}
                    {step.id === 'illness_severity' && renderOptionCards([
                        { value: 'mild',     label: 'Mild',     desc: 'Feeling off but able to train normally',            color: 'amber' },
                        { value: 'moderate', label: 'Moderate', desc: 'Noticeable symptoms, training may need adjustment', color: 'rose' },
                        { value: 'severe',   label: 'Severe',   desc: 'Significantly unwell, cannot train at full capacity', color: 'rose' },
                    ], 'illness_severity')}

                    {/* Negative scale (1=good, 10=bad): fatigue, soreness, stress */}
                    {step.type === 'scale_negative' && renderScale(step.id, false)}

                    {/* Positive scale (1=bad, 10=good): sleep quality, mood */}
                    {step.type === 'scale_positive' && renderScale(step.id, true)}

                    {/* Sleep hours */}
                    {step.type === 'number' && (
                        <div className="space-y-4">
                            <input
                                type="number"
                                inputMode="decimal"
                                min={0}
                                max={24}
                                step={0.5}
                                value={responses.sleep_hours || ''}
                                onChange={e => setVal('sleep_hours', parseFloat(e.target.value) || 0)}
                                placeholder="e.g. 7.5"
                                className="w-full text-center text-4xl font-bold bg-white border-2 border-slate-200 rounded-2xl py-6 outline-none focus:border-cyan-500 transition-colors"
                            />
                        </div>
                    )}

                    {/* Readiness */}
                    {/* Body map for complaint areas */}
                    {step.type === 'body_map' && (
                        <BodyMapSelector
                            value={responses.complaint_areas || []}
                            onChange={(areas) => setVal('complaint_areas', areas)}
                            config={DEFAULT_BODY_MAP_CONFIG}
                        />
                    )}

                    {/* Readiness */}
                    {step.type === 'readiness' && renderOptionCards(READINESS_OPTIONS, 'readiness')}
                </div>
            </main>

            {/* Navigation footer */}
            <footer className="sticky bottom-0 bg-white border-t border-slate-100 px-6 py-4 max-w-md mx-auto w-full">
                <div className="flex items-center gap-3">
                    {currentStep > 0 && (
                        <button onClick={handleBack}
                            className="p-3 bg-slate-100 text-slate-500 rounded-xl active:scale-95 transition-all">
                            <ChevronLeft size={20} />
                        </button>
                    )}
                    <button
                        onClick={isLastStep ? handleSubmit : handleNext}
                        disabled={!canContinue || submitting}
                        className={`flex-1 py-4 rounded-xl font-bold text-base transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
                            canContinue
                                ? isLastStep
                                    ? 'bg-emerald-500 text-white shadow-lg hover:bg-emerald-600'
                                    : 'bg-slate-900 text-white shadow-lg hover:bg-slate-800'
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}>
                        {submitting ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : isLastStep ? (
                            <><Send size={18} /> Submit</>
                        ) : (
                            <>Continue <ChevronRight size={18} /></>
                        )}
                    </button>
                </div>
            </footer>
        </div>
    );
};

export default FifaDailyWellnessForm;
