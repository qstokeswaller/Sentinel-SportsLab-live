// @ts-nocheck
/**
 * FIFA-Aligned Weekly Deep Check Form (Tier 2)
 *
 * Triggered when a daily wellness flag is raised.
 * Full injury/illness classification per Waldén et al. (2023, BJSM).
 *
 * URL: /weekly-wellness/:teamId/:athleteId
 */

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { DatabaseService } from '../services/databaseService';
import { supabase } from '../lib/supabase';
import { CheckCircle2, AlertCircle, Activity, ChevronRight, ChevronLeft, Send, ShieldAlert } from 'lucide-react';
import BodyMapSelector from '../components/wellness/BodyMapSelector';
import type { BodyMapConfig } from '../types/types';
// DEFAULT_BODY_MAP_CONFIG retained in case other components need it, but this form uses FIFA_BODY_MAP_CONFIG


// FIFA-aligned body map config — areas match Waldén et al. (2023) Table 4
const FIFA_BODY_MAP_CONFIG: BodyMapConfig = {
    areas: [
        // Front
        { key: 'head',             label: 'Head',                       view: 'front', color: '#6366f1', hasSeverity: true },
        { key: 'neck',             label: 'Neck',                       view: 'front', color: '#6366f1', hasSeverity: true },
        { key: 'shoulder',         label: 'Shoulder',                   view: 'front', color: '#a855f7', hasSeverity: true },
        { key: 'arm_elbow',        label: 'Arm / Elbow',               view: 'front', color: '#a855f7', hasSeverity: true },
        { key: 'wrist_hand',       label: 'Wrist / Hand',              view: 'front', color: '#a855f7', hasSeverity: true },
        { key: 'hip',              label: 'Hip',                        view: 'front', color: '#ec4899', hasSeverity: true },
        { key: 'groin',            label: 'Groin (Adductor)',           view: 'front', color: '#ec4899', hasSeverity: true },
        { key: 'thigh_quadriceps', label: 'Thigh — Quadriceps',        view: 'front', color: '#eab308', hasSeverity: true },
        { key: 'knee',             label: 'Knee',                       view: 'front', color: '#3b82f6', hasSeverity: true },
        { key: 'ankle',            label: 'Ankle',                      view: 'front', color: '#3b82f6', hasSeverity: true },
        { key: 'foot',             label: 'Foot',                       view: 'front', color: '#3b82f6', hasSeverity: true },
        // Back
        { key: 'spine',            label: 'Spine (Thoracic / Lumbar)',  view: 'back',  color: '#f97316', hasSeverity: true },
        { key: 'thigh_hamstring',  label: 'Thigh — Hamstring',         view: 'back',  color: '#ec4899', hasSeverity: true },
        { key: 'lower_leg',        label: 'Lower Leg / Calf',          view: 'back',  color: '#22c55e', hasSeverity: true },
    ],
    severityLevels: [
        { value: 1, label: 'Minor — can train',     shortLabel: 'Minor',    style: 'bg-amber-400 border-amber-400 text-white',  legendColor: '#fbbf24' },
        { value: 2, label: 'Moderate — reduced',     shortLabel: 'Mod',      style: 'bg-orange-500 border-orange-500 text-white', legendColor: '#f97316' },
        { value: 3, label: 'Severe — cannot train',  shortLabel: 'Severe',   style: 'bg-red-600 border-red-600 text-white',       legendColor: '#dc2626' },
    ],
    referenceImageUrl: '/body-image.jpeg',
    instructionText: '1. Tap an area to mark it\n2. Tap again to increase severity\n3. Tap a third time to clear',
    subInputType: 'buttons',
};

// ═══════════════════════════════════════════════════════════════════════
// FIFA body areas (Waldén Table 4 — with hip/groin split)
// ═══════════════════════════════════════════════════════════════════════

const BODY_AREAS = [
    { key: 'head', label: 'Head' },
    { key: 'neck', label: 'Neck' },
    { key: 'shoulder', label: 'Shoulder' },
    { key: 'arm_elbow', label: 'Arm / Elbow' },
    { key: 'wrist_hand', label: 'Wrist / Hand' },
    { key: 'spine', label: 'Spine (Thoracic / Lumbar)' },
    { key: 'hip', label: 'Hip' },
    { key: 'groin', label: 'Groin (Adductor)' },
    { key: 'thigh_hamstring', label: 'Thigh — Hamstring' },
    { key: 'thigh_quadriceps', label: 'Thigh — Quadriceps' },
    { key: 'knee', label: 'Knee' },
    { key: 'lower_leg', label: 'Lower Leg / Calf' },
    { key: 'ankle', label: 'Ankle' },
    { key: 'foot', label: 'Foot' },
];

const MECHANISMS = [
    'Running', 'Change of direction', 'Kicking', 'Landing', 'Tackle', 'Collision', 'Jumping', 'Throwing', 'Other',
];

const CONTACT_TYPES = [
    { value: 'non_contact', label: 'Non-contact' },
    { value: 'indirect_contact', label: 'Indirect contact' },
    { value: 'direct_opponent', label: 'Direct — Opponent' },
    { value: 'direct_teammate', label: 'Direct — Teammate' },
    { value: 'direct_ball', label: 'Direct — Ball' },
    { value: 'direct_goalpost', label: 'Direct — Goal post' },
    { value: 'direct_other', label: 'Direct — Other object' },
];

const IMPACT_LEVELS = [
    { value: 'none', label: 'No Impact', desc: 'Can train and perform normally', color: 'emerald' },
    { value: 'minor', label: 'Minor', desc: 'Can fully train with awareness', color: 'lime' },
    { value: 'moderate', label: 'Moderate', desc: 'Reduced performance, needs modification', color: 'amber' },
    { value: 'severe', label: 'Severe', desc: 'Cannot complete training session', color: 'rose' },
];

const TIME_LOSS_BINS = [
    { value: '0', label: '0 days', desc: 'No time expected to be missed' },
    { value: '1-3', label: '1–3 days', desc: 'Minor — back within the week' },
    { value: '4-7', label: '4–7 days', desc: 'Moderate — may miss a match' },
    { value: '8-28', label: '8–28 days', desc: 'Significant — multiple weeks out' },
    { value: '29+', label: '29+ days', desc: 'Severe — month or more expected' },
];

const WELLNESS_TRENDS = ['Improving', 'Stable', 'Worsening'];
const STRESS_SOURCES = ['Football / Sport', 'Work / School', 'Personal', 'None'];

// ═══════════════════════════════════════════════════════════════════════
// Steps
// ═══════════════════════════════════════════════════════════════════════

const STEP_IDS = [
    'intro',
    'problem_type', 'onset', 'status',
    'body_area', 'body_side', 'mechanism', 'contact_type',
    'impact', 'time_loss',
    'urti_hoarseness', 'urti_blocked_nose', 'urti_runny_nose', 'urti_sinus_pressure',
    'urti_sneezing', 'urti_dry_cough', 'urti_wet_cough', 'urti_headache',
    'illness_impact', 'illness_time_loss',
    'fatigue_trend', 'sleep_trend',
    'nutrition', 'hydration', 'stress_sources',
];

// URTI illness symptom definitions (from existing mocks data)
const URTI_SYMPTOMS = [
    { key: 'urti_hoarseness',    label: 'Hoarseness (Voice roughness)' },
    { key: 'urti_blocked_nose',  label: 'Blocked / Plugged Nose' },
    { key: 'urti_runny_nose',    label: 'Runny Nose' },
    { key: 'urti_sinus_pressure',label: 'Sinus Pressure (Facial pressure)' },
    { key: 'urti_sneezing',      label: 'Sneezing' },
    { key: 'urti_dry_cough',     label: 'Dry Cough' },
    { key: 'urti_wet_cough',     label: 'Wet Cough (sputum / mucus)' },
    { key: 'urti_headache',      label: 'Headache' },
];
const URTI_OPTIONS = ['No Symptoms', 'Mild', 'Moderate', 'Severe'];

// ═══════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════

const FifaWeeklyWellnessForm: React.FC = () => {
    const { teamId, athleteId: urlAthleteId } = useParams<{ teamId: string; athleteId?: string }>();
    const [searchParams] = useSearchParams();
    // complaint param passed from daily form: 'injury' | 'illness' | 'both'
    const preFilledComplaint = searchParams.get('complaint') || null;

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [athletes, setAthletes] = useState<{ id: string; name: string }[]>([]);
    const [selectedAthleteId, setSelectedAthleteId] = useState(urlAthleteId || '');
    const [athleteName, setAthleteName] = useState('');
    const [currentStep, setCurrentStep] = useState(0);
    // Pre-fill problem_type from daily form if passed via URL
    const [responses, setResponses] = useState<Record<string, any>>(
        preFilledComplaint ? { problem_type: preFilledComplaint } : {}
    );

    // Team-wide mode: no athleteId in URL → athlete selects name first
    const isTeamMode = !urlAthleteId;
    const athleteId = urlAthleteId || selectedAthleteId;

    // Public form: clear any stale/expired session from localStorage so the anon key is used.
    // Without this, devices that previously had a coach session stored will send an expired JWT → 401.
    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            if (!data.session) supabase.auth.signOut({ scope: 'local' });
        });
    }, []);

    useEffect(() => {
        const load = async () => {
            if (!teamId) { setError('Invalid link.'); setLoading(false); return; }
            try {
                const data = await DatabaseService.getTeamAthletes(teamId);
                setAthletes(data.athletes || []);
                if (urlAthleteId) {
                    const athlete = (data.athletes || []).find(a => a.id === urlAthleteId);
                    setAthleteName(athlete?.name || 'Athlete');
                }
            } catch (err) {
                setError('Failed to load. Please try again.');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [teamId, athleteId]);

    const setVal = (key: string, val: any) => setResponses(prev => ({ ...prev, [key]: val }));

    // Update athlete name when selected in team mode
    const handleSelectAthlete = (id: string) => {
        setSelectedAthleteId(id);
        const a = athletes.find(a => a.id === id);
        setAthleteName(a?.name || 'Athlete');
    };

    // Conditional step visibility — add athlete_select step for team mode
    const allSteps = isTeamMode ? ['athlete_select', ...STEP_IDS] : STEP_IDS;
    const isInjury = responses.problem_type === 'injury' || responses.problem_type === 'both';
    const isIllness = responses.problem_type === 'illness' || responses.problem_type === 'both';
    const visibleSteps = allSteps.filter(id => {
        // Skip problem_type if already pre-filled from daily form
        if (id === 'problem_type') return !preFilledComplaint;
        // Injury-only steps
        if (['onset', 'status', 'impact', 'time_loss'].includes(id)) return isInjury;
        // body_area and body_side: only show when injury and NOT triggered from daily (daily already captured area)
        if (id === 'body_area' || id === 'body_side') return isInjury && !preFilledComplaint;
        if (id === 'mechanism' || id === 'contact_type') return isInjury && responses.onset === 'sudden';
        // Illness-only steps
        if (['urti_hoarseness', 'urti_blocked_nose', 'urti_runny_nose', 'urti_sinus_pressure',
             'urti_sneezing', 'urti_dry_cough', 'urti_wet_cough', 'urti_headache',
             'illness_impact', 'illness_time_loss'].includes(id)) return isIllness;
        return true;
    });

    const stepId = visibleSteps[currentStep];
    const totalSteps = visibleSteps.length;
    const progress = ((currentStep + 1) / totalSteps) * 100;
    const isLastStep = currentStep === totalSteps - 1;

    const canContinue = (() => {
        if (stepId === 'athlete_select') return !!selectedAthleteId;
        if (stepId === 'intro') return true;
        if (stepId === 'body_area') return (responses.body_areas || []).length > 0;
        if (stepId === 'stress_sources') return (responses.stress_sources || []).length > 0;
        if (stepId === 'nutrition' || stepId === 'hydration') return responses[stepId] >= 1;
        if (URTI_SYMPTOMS.some(s => s.key === stepId)) return responses[stepId] !== undefined;
        if (stepId === 'illness_impact') return responses.illness_impact !== undefined && responses.illness_impact !== '';
        if (stepId === 'illness_time_loss') return responses.illness_time_loss !== undefined && responses.illness_time_loss !== '';
        return responses[stepId] !== undefined && responses[stepId] !== null && responses[stepId] !== '';
    })();

    const handleNext = () => { if (canContinue) { setCurrentStep(prev => Math.min(totalSteps - 1, prev + 1)); window.scrollTo(0, 0); } };
    const handleBack = () => setCurrentStep(prev => Math.max(0, prev - 1));

    const handleSubmit = async () => {
        if (!athleteId || !teamId) return;
        setSubmitting(true);
        try {
            const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();

            // Save wellness response (weekly tier) — includes both injury and illness metric data
            const wellnessResponse = await DatabaseService.saveWellnessResponse({
                athlete_id: athleteId,
                team_id: teamId,
                session_date: today,
                responses: {
                    fatigue_trend: responses.fatigue_trend,
                    sleep_trend: responses.sleep_trend,
                    nutrition: responses.nutrition,
                    hydration: responses.hydration,
                    stress_sources: responses.stress_sources,
                    // illness symptom data (URTI)
                    ...(isIllness && {
                        urti_hoarseness: responses.urti_hoarseness,
                        urti_blocked_nose: responses.urti_blocked_nose,
                        urti_runny_nose: responses.urti_runny_nose,
                        urti_sinus_pressure: responses.urti_sinus_pressure,
                        urti_sneezing: responses.urti_sneezing,
                        urti_dry_cough: responses.urti_dry_cough,
                        urti_wet_cough: responses.urti_wet_cough,
                        urti_headache: responses.urti_headache,
                        illness_impact: responses.illness_impact,
                        illness_time_loss: responses.illness_time_loss,
                    }),
                },
                tier: 'weekly',
                injury_report: responses.body_areas?.length > 0 ? { areas: responses.body_areas } : undefined,
            });

            // Only save injury classification when problem involves a physical injury
            if (isInjury) {
                await DatabaseService.saveInjuryClassification({
                    athlete_id: athleteId,
                    wellness_response_id: wellnessResponse?.id,
                    problem_type: responses.problem_type,
                    onset: responses.onset,
                    status: responses.status,
                    body_area: responses.body_area,
                    body_side: responses.body_side,
                    mechanism: responses.mechanism,
                    contact_type: responses.contact_type,
                    performance_impact: responses.impact,
                    time_loss_category: responses.time_loss,
                    classification_date: today,
                });
            }

            setSubmitted(true);
        } catch (err) {
            console.error(err);
            alert('Failed to submit. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    // ═══════════════════════════════════════════════════════���═══════════
    // Render helpers
    // ═══════════════════════════════════════════════════════════════════

    const OptionButton = ({ value, label, desc, isSelected, onClick, color = 'slate' }) => {
        const colorMap = {
            emerald: { sel: 'bg-emerald-500 border-emerald-500 text-white shadow-lg scale-[1.02]', un: 'bg-emerald-50 border-emerald-200' },
            lime: { sel: 'bg-lime-500 border-lime-500 text-white shadow-lg scale-[1.02]', un: 'bg-lime-50 border-lime-200' },
            amber: { sel: 'bg-amber-500 border-amber-500 text-white shadow-lg scale-[1.02]', un: 'bg-amber-50 border-amber-200' },
            rose: { sel: 'bg-rose-500 border-rose-500 text-white shadow-lg scale-[1.02]', un: 'bg-rose-50 border-rose-200' },
            slate: { sel: 'bg-slate-900 border-slate-900 text-white shadow-lg scale-[1.02]', un: 'bg-white border-slate-100' },
        };
        const c = colorMap[color] || colorMap.slate;
        return (
            <button type="button" onClick={onClick}
                className={`w-full p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.98] ${isSelected ? c.sel : `${c.un} text-slate-700 hover:border-slate-300`}`}>
                <div className="font-bold text-base">{label}</div>
                {desc && <div className={`text-xs mt-0.5 ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>{desc}</div>}
            </button>
        );
    };

    const SCALE_COLORS_POSITIVE = {
        1:  { sel: 'bg-red-600 border-red-600 text-white shadow-lg scale-[1.02]',         un: 'bg-red-50 border-red-200 text-red-700' },
        2:  { sel: 'bg-red-500 border-red-500 text-white shadow-lg scale-[1.02]',         un: 'bg-red-50 border-red-200 text-red-700' },
        3:  { sel: 'bg-orange-500 border-orange-500 text-white shadow-lg scale-[1.02]',   un: 'bg-orange-50 border-orange-200 text-orange-700' },
        4:  { sel: 'bg-amber-500 border-amber-500 text-white shadow-lg scale-[1.02]',     un: 'bg-amber-50 border-amber-200 text-amber-700' },
        5:  { sel: 'bg-yellow-400 border-yellow-400 text-white shadow-lg scale-[1.02]',   un: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
        6:  { sel: 'bg-yellow-400 border-yellow-400 text-white shadow-lg scale-[1.02]',   un: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
        7:  { sel: 'bg-lime-500 border-lime-500 text-white shadow-lg scale-[1.02]',       un: 'bg-lime-50 border-lime-200 text-lime-700' },
        8:  { sel: 'bg-lime-500 border-lime-500 text-white shadow-lg scale-[1.02]',       un: 'bg-lime-50 border-lime-200 text-lime-700' },
        9:  { sel: 'bg-emerald-500 border-emerald-500 text-white shadow-lg scale-[1.02]', un: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
        10: { sel: 'bg-emerald-500 border-emerald-500 text-white shadow-lg scale-[1.02]', un: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
    };

    const renderScale110 = (id: string) => {
        const labels = { 1: 'Very poor', 2: 'Poor', 3: 'Below average', 4: 'Fair', 5: 'Moderate', 6: 'Above average', 7: 'Good', 8: 'Very good', 9: 'Excellent', 10: 'Outstanding' };
        return (
            <div className="space-y-1.5">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(val => {
                    const isSelected = responses[id] === val;
                    const c = SCALE_COLORS_POSITIVE[val];
                    return (
                        <button key={val} type="button" onClick={() => setVal(id, val)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 font-bold transition-all active:scale-[0.98] ${
                                isSelected ? c.sel : c.un
                            }`}>
                            <span className="text-lg font-bold w-7 text-center shrink-0">{val}</span>
                            <span className="text-sm">{labels[val]}</span>
                        </button>
                    );
                })}
            </div>
        );
    };

    // ═══════════════════════════════════════════════════════════════════
    // State screens
    // ═══════════════════════════════════════════════════════════════════

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <div className="text-center">
                <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-500 font-medium">Loading...</p>
            </div>
        </div>
    );

    if (submitted) return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 animate-bounce">
                <CheckCircle2 size={40} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Deep Check Complete</h1>
            <p className="text-slate-500 mb-8 max-w-xs">Thank you for the detail. Your coaching staff will review this and adjust your program accordingly.</p>
            {preFilledComplaint ? (
                /* Triggered from daily — send back to the daily check-in */
                <a
                    href={`/daily-wellness/${teamId}`}
                    className="px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-lg active:scale-95 transition-all text-sm"
                >
                    Back to Daily Check-in
                </a>
            ) : isTeamMode ? (
                /* Team-wide direct link — reload to athlete picker */
                <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-lg active:scale-95 transition-all text-sm"
                >
                    Submit for Another Athlete
                </button>
            ) : (
                /* Individual direct link — reload to same athlete's intro */
                <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-lg active:scale-95 transition-all text-sm"
                >
                    Submit Again
                </button>
            )}
        </div>
    );

    if (error) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
            <div className="p-8 bg-white rounded-3xl shadow-xl border border-slate-100 text-center max-w-sm">
                <AlertCircle size={48} className="text-rose-500 mx-auto mb-4" />
                <p className="text-slate-500 mb-6">{error}</p>
                <button onClick={() => window.location.reload()} className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-bold">Retry</button>
            </div>
        </div>
    );

    // ═══════════════════════════════════════════════════════════════════
    // Step content
    // ═══════════════════════════════════════════════════════════════════

    const complaintLabel = preFilledComplaint === 'injury' ? 'injury'
        : preFilledComplaint === 'illness' ? 'illness'
        : preFilledComplaint === 'both' ? 'injury and illness'
        : null;

    const stepHeadings: Record<string, { heading: string; instruction: string }> = {
        athlete_select: { heading: 'Who are you?', instruction: 'Select your name to begin.' },
        intro: {
            heading: `Hi ${athleteName.split(' ')[0] || ''}`,
            instruction: complaintLabel
                ? `Your coaching staff want a bit more detail to help manage your ${complaintLabel} better. This takes between 2–5 minutes.`
                : 'Your coaching staff have sent you this form to better understand your current health and wellbeing. This takes between 2–5 minutes.',
        },
        problem_type: { heading: 'Type of Problem', instruction: 'What best describes your current issue?' },
        onset: { heading: 'How Did It Start?', instruction: 'Was it a specific event or has it built up gradually?' },
        status: { heading: 'Is This New?', instruction: 'Has this happened before in the same area?' },
        body_area: { heading: 'Where Is It?', instruction: 'Select the primary area affected.' },
        body_side: { heading: 'Which Side?', instruction: 'Select the side that\'s affected.' },
        mechanism: { heading: 'What Were You Doing?', instruction: 'What activity caused or triggered it?' },
        contact_type: { heading: 'Was There Contact?', instruction: 'Did this involve contact with a person or object?' },
        impact: { heading: 'Impact on Performance', instruction: 'How much is this affecting your ability to train?' },
        time_loss: { heading: 'Expected Time Out', instruction: 'How long do you expect this to affect your availability?' },
        urti_hoarseness:    { heading: 'Hoarseness', instruction: 'Rate any voice roughness or hoarseness you\'re experiencing.' },
        urti_blocked_nose:  { heading: 'Blocked / Plugged Nose', instruction: 'Rate how blocked or plugged your nose feels.' },
        urti_runny_nose:    { heading: 'Runny Nose', instruction: 'Rate any runny nose you\'re experiencing.' },
        urti_sinus_pressure:{ heading: 'Sinus Pressure', instruction: 'Rate any facial pressure or sinus pain you\'re experiencing.' },
        urti_sneezing:      { heading: 'Sneezing', instruction: 'Rate how frequently you\'re sneezing.' },
        urti_dry_cough:     { heading: 'Dry Cough', instruction: 'Rate any dry, unproductive cough you\'re experiencing.' },
        urti_wet_cough:     { heading: 'Wet Cough', instruction: 'Rate any cough that produces mucus or sputum.' },
        urti_headache:      { heading: 'Headache', instruction: 'Rate any headache you\'re currently experiencing.' },
        illness_impact:     { heading: 'Impact on Performance', instruction: 'How much is this illness affecting your ability to train?' },
        illness_time_loss:  { heading: 'Expected Time Out', instruction: 'How long do you expect this illness to affect your availability?' },
        fatigue_trend: { heading: 'Fatigue Trend', instruction: 'Over the past week, how has your fatigue been trending?' },
        sleep_trend: { heading: 'Sleep Trend', instruction: 'Over the past week, how has your sleep quality been trending?' },
        nutrition: { heading: 'Nutrition', instruction: 'Rate your nutritional consistency this week.' },
        hydration: { heading: 'Hydration', instruction: 'Rate your hydration consistency this week.' },
        stress_sources: { heading: 'Stress Sources', instruction: 'What are your main stress sources right now? Select all that apply.' },
    };

    const sh = stepHeadings[stepId] || { heading: '', instruction: '' };

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
                    <span className="text-[9px] text-slate-400 tracking-wide uppercase">Deep Health Check</span>
                </div>
                <div className="px-6 py-2 flex items-center justify-between">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{sh.heading}</div>
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{currentStep + 1} / {totalSteps}</div>
                </div>
            </header>

            <div className="h-1.5 w-full bg-slate-100">
                <div className="h-full bg-amber-500 transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
            </div>

            <main className="flex-1 overflow-y-auto p-6 pb-2 max-w-md mx-auto w-full">
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h2 className="text-2xl font-bold text-slate-900 leading-tight">{sh.heading}</h2>
                    <p className="text-slate-500 font-medium mt-1 mb-6">{sh.instruction}</p>

                    {/* Intro */}
                    {/* Athlete selection (team-wide mode) */}
                    {stepId === 'athlete_select' && (
                        <div className="space-y-2.5">
                            {athletes.map(a => (
                                <button key={a.id} onClick={() => handleSelectAthlete(a.id)}
                                    className={`w-full p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.98] ${
                                        selectedAthleteId === a.id
                                            ? 'bg-amber-50 border-amber-500 shadow-md ring-4 ring-amber-50/50 scale-[1.02]'
                                            : 'bg-white border-slate-100 text-slate-700 hover:border-slate-200'
                                    }`}>
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-lg">{a.name}</span>
                                        {selectedAthleteId === a.id && <CheckCircle2 size={24} className="text-amber-600" />}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {stepId === 'intro' && (
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
                            <div className="flex items-center gap-2">
                                <ShieldAlert size={18} className="text-amber-600" />
                                <span className="font-semibold text-amber-800">Why am I seeing this?</span>
                            </div>
                            <p className="text-sm text-amber-700 leading-relaxed">
                                {complaintLabel
                                    ? `Your daily check-in flagged a ${complaintLabel === 'injury and illness' ? 'health concern (injury and illness)' : complaintLabel}. Your coaching staff want to understand it better so they can adjust your training and recovery plan accordingly.`
                                    : 'Your coaching staff have shared this form to get a better picture of your current health and wellbeing. It covers injury, illness, and how you\'ve been feeling overall.'
                                }
                            </p>
                            <p className="text-sm text-amber-600 font-medium">It's not a test — just honest answers help us help you.</p>
                        </div>
                    )}

                    {/* Problem type */}
                    {stepId === 'problem_type' && (
                        <div className="space-y-2.5">
                            <OptionButton value="injury" label="Injury" desc="Musculoskeletal issue (muscle, joint, bone)" isSelected={responses.problem_type === 'injury'} onClick={() => setVal('problem_type', 'injury')} />
                            <OptionButton value="illness" label="Illness" desc="Non-musculoskeletal (cold, flu, stomach, etc.)" isSelected={responses.problem_type === 'illness'} onClick={() => setVal('problem_type', 'illness')} />
                            <OptionButton value="both" label="Injury + Illness" desc="I have both physical pain and illness symptoms" isSelected={responses.problem_type === 'both'} onClick={() => setVal('problem_type', 'both')} />
                        </div>
                    )}

                    {/* URTI illness symptom steps — one per screen */}
                    {URTI_SYMPTOMS.some(s => s.key === stepId) && (
                        <div className="space-y-2.5">
                            {URTI_OPTIONS.map((opt, idx) => {
                                const isSelected = responses[stepId] === idx;
                                return (
                                    <OptionButton
                                        key={opt}
                                        value={idx}
                                        label={opt}
                                        isSelected={isSelected}
                                        onClick={() => setVal(stepId, idx)}
                                        color={idx === 0 ? 'emerald' : idx === 1 ? 'lime' : idx === 2 ? 'amber' : 'rose'}
                                    />
                                );
                            })}
                        </div>
                    )}

                    {/* Illness impact — reuse IMPACT_LEVELS */}
                    {stepId === 'illness_impact' && (
                        <div className="space-y-2.5">
                            {IMPACT_LEVELS.map(il => (
                                <OptionButton key={il.value} value={il.value} label={il.label} desc={il.desc} color={il.color}
                                    isSelected={responses.illness_impact === il.value}
                                    onClick={() => setVal('illness_impact', il.value)} />
                            ))}
                        </div>
                    )}

                    {/* Illness time loss — reuse TIME_LOSS_BINS */}
                    {stepId === 'illness_time_loss' && (
                        <div className="space-y-2.5">
                            {TIME_LOSS_BINS.map(tl => (
                                <OptionButton key={tl.value} value={tl.value} label={tl.label} desc={tl.desc}
                                    isSelected={responses.illness_time_loss === tl.value}
                                    onClick={() => setVal('illness_time_loss', tl.value)} />
                            ))}
                        </div>
                    )}

                    {/* Onset */}
                    {stepId === 'onset' && (
                        <div className="space-y-2.5">
                            <OptionButton value="sudden" label="Sudden Onset" desc="Specific event or moment you can identify" isSelected={responses.onset === 'sudden'} onClick={() => setVal('onset', 'sudden')} />
                            <OptionButton value="gradual" label="Gradual Onset" desc="Built up over time, no single event" isSelected={responses.onset === 'gradual'} onClick={() => setVal('onset', 'gradual')} />
                        </div>
                    )}

                    {/* Status */}
                    {stepId === 'status' && (
                        <div className="space-y-2.5">
                            <OptionButton value="new" label="New Problem" desc="First time experiencing this" isSelected={responses.status === 'new'} onClick={() => setVal('status', 'new')} />
                            <OptionButton value="recurrence" label="Recurrence" desc="Same injury, but it fully healed before" isSelected={responses.status === 'recurrence'} onClick={() => setVal('status', 'recurrence')} />
                            <OptionButton value="exacerbation" label="Exacerbation" desc="Same injury — it never fully went away" isSelected={responses.status === 'exacerbation'} onClick={() => setVal('status', 'exacerbation')} />
                        </div>
                    )}

                    {/* Body area */}
                    {stepId === 'body_area' && (
                        <BodyMapSelector
                            value={responses.body_areas || []}
                            onChange={(areas) => {
                                setVal('body_areas', areas);
                                // Also set primary body_area from first selected area for classification
                                if (areas.length > 0) setVal('body_area', areas[0].area);
                                else setVal('body_area', '');
                            }}
                            config={FIFA_BODY_MAP_CONFIG}
                        />
                    )}

                    {/* Body side */}
                    {stepId === 'body_side' && (
                        <div className="space-y-2.5">
                            {['Left', 'Right', 'Bilateral (both)', 'Central'].map(side => (
                                <OptionButton key={side} value={side.toLowerCase().split(' ')[0]} label={side}
                                    isSelected={responses.body_side === side.toLowerCase().split(' ')[0]}
                                    onClick={() => setVal('body_side', side.toLowerCase().split(' ')[0])} />
                            ))}
                        </div>
                    )}

                    {/* Mechanism */}
                    {stepId === 'mechanism' && (
                        <div className="space-y-1.5">
                            {MECHANISMS.map(m => (
                                <button key={m} type="button" onClick={() => setVal('mechanism', m.toLowerCase())}
                                    className={`w-full p-3.5 rounded-xl border-2 text-left font-semibold transition-all active:scale-[0.98] ${
                                        responses.mechanism === m.toLowerCase()
                                            ? 'bg-slate-900 border-slate-900 text-white shadow-lg scale-[1.02]'
                                            : 'bg-white border-slate-100 text-slate-700 hover:border-slate-200'
                                    }`}>
                                    {m}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Contact type */}
                    {stepId === 'contact_type' && (
                        <div className="space-y-1.5">
                            {CONTACT_TYPES.map(ct => (
                                <OptionButton key={ct.value} value={ct.value} label={ct.label}
                                    isSelected={responses.contact_type === ct.value}
                                    onClick={() => setVal('contact_type', ct.value)} />
                            ))}
                        </div>
                    )}

                    {/* Impact */}
                    {stepId === 'impact' && (
                        <div className="space-y-2.5">
                            {IMPACT_LEVELS.map(il => (
                                <OptionButton key={il.value} value={il.value} label={il.label} desc={il.desc} color={il.color}
                                    isSelected={responses.impact === il.value}
                                    onClick={() => setVal('impact', il.value)} />
                            ))}
                        </div>
                    )}

                    {/* Time loss */}
                    {stepId === 'time_loss' && (
                        <div className="space-y-2.5">
                            {TIME_LOSS_BINS.map(tl => (
                                <OptionButton key={tl.value} value={tl.value} label={tl.label} desc={tl.desc}
                                    isSelected={responses.time_loss === tl.value}
                                    onClick={() => setVal('time_loss', tl.value)} />
                            ))}
                        </div>
                    )}

                    {/* Wellness trends */}
                    {(stepId === 'fatigue_trend' || stepId === 'sleep_trend') && (
                        <div className="space-y-2.5">
                            {WELLNESS_TRENDS.map(t => (
                                <OptionButton key={t} value={t.toLowerCase()} label={t}
                                    isSelected={responses[stepId] === t.toLowerCase()}
                                    onClick={() => setVal(stepId, t.toLowerCase())} />
                            ))}
                        </div>
                    )}

                    {/* Nutrition / Hydration (1-10 scale) */}
                    {(stepId === 'nutrition' || stepId === 'hydration') && (
                        <div>
                            {renderScale110(stepId)}
                        </div>
                    )}

                    {/* Stress sources (multi-select) */}
                    {stepId === 'stress_sources' && (
                        <div className="space-y-2">
                            {STRESS_SOURCES.map(s => {
                                const selected = (responses.stress_sources || []).includes(s);
                                return (
                                    <button key={s} type="button"
                                        onClick={() => {
                                            const current = responses.stress_sources || [];
                                            setVal('stress_sources', selected ? current.filter(x => x !== s) : [...current, s]);
                                        }}
                                        className={`w-full p-4 rounded-2xl border-2 text-left font-bold transition-all active:scale-[0.98] ${
                                            selected
                                                ? 'bg-cyan-500 border-cyan-500 text-white shadow-lg scale-[1.02]'
                                                : 'bg-white border-slate-100 text-slate-700 hover:border-slate-200'
                                        }`}>
                                        {s}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>

            {/* Navigation footer */}
            <footer className="sticky bottom-0 bg-white border-t border-slate-100 px-6 py-4 max-w-md mx-auto w-full">
                <div className="flex items-center gap-3">
                    {currentStep > 0 && (
                        <button onClick={handleBack} className="p-3 bg-slate-100 text-slate-500 rounded-xl active:scale-95 transition-all">
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

export default FifaWeeklyWellnessForm;
