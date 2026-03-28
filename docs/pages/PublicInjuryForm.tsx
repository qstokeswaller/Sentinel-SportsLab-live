// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { DatabaseService } from '../services/databaseService';
import { CheckCircle2, AlertCircle, Activity, ShieldAlertIcon, ChevronRight, ChevronLeft, Send, UploadCloudIcon, XIcon, Loader2 } from 'lucide-react';
import BodyMapSelector from '../components/wellness/BodyMapSelector';
import {
    INJURY_CLASSIFICATIONS, SEVERITY_GRADES, LATERALITY_OPTIONS,
    INJURY_ACTIVITIES, PAIN_KINDS, RANGE_OF_MOTION_OPTIONS,
    WEIGHT_BEARING_OPTIONS, TRAINING_STATUS_OPTIONS, TREATMENT_OPTIONS, RTP_PHASES
} from '../utils/mocks';
import { uploadQuestionImage } from '../utils/imageUpload';

// ─── Helpers ────────────────────────────────────────────────────────────────

const toggleMulti = (arr, value) => arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];

const PillRow = ({ options, value, onChange, colorMap }) => (
    <div className="flex flex-wrap gap-2">
        {options.map(opt => {
            const label = typeof opt === 'string' ? opt : opt.label;
            const val = typeof opt === 'string' ? opt : opt.value;
            const isActive = value === val;
            const activeColor = colorMap?.[val] || 'bg-cyan-600 text-white';
            return (
                <button key={val} type="button" onClick={() => onChange(isActive ? undefined : val)}
                    className={`px-3.5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${isActive ? activeColor + ' shadow-md' : 'bg-white border border-slate-200 text-slate-400 hover:bg-slate-50'}`}
                >{label}</button>
            );
        })}
    </div>
);

const MultiPillRow = ({ options, value = [], onChange }) => (
    <div className="flex flex-wrap gap-2">
        {options.map(opt => {
            const isActive = value.includes(opt);
            return (
                <button key={opt} type="button" onClick={() => onChange(toggleMulti(value, opt))}
                    className={`px-3.5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${isActive ? 'bg-cyan-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-400 hover:bg-slate-50'}`}
                >{opt}</button>
            );
        })}
    </div>
);

const Label = ({ children }) => (
    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 block">{children}</label>
);

// ─── Steps: 0=athlete, 1=body map, 2=classification, 3=clinical, 4=management, 5=notes, 6=review ──

const STEP_NAMES = ['Select Athlete', 'Injury Location', 'Classification', 'Clinical', 'Management', 'Notes & Attachments', 'Review & Submit'];

const PublicInjuryForm = () => {
    const { teamId, athleteId: preselectedAthleteId } = useParams();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState(null);
    const [athletes, setAthletes] = useState([]);

    const [selectedAthleteId, setSelectedAthleteId] = useState(preselectedAthleteId || '');
    const [step, setStep] = useState(preselectedAthleteId ? 1 : 0);
    const [form, setForm] = useState({
        areas: [],
        classification: undefined,
        severityGrade: undefined,
        laterality: undefined,
        recurrence: undefined,
        activity: undefined,
        dateOfInjury: new Date().toISOString().split('T')[0],
        mechanism: '',
        painLevel: undefined,
        painKinds: [],
        hasSwelling: false,
        swellingSeverity: undefined,
        hasBruising: false,
        bruisingSeverity: undefined,
        rangeOfMotion: undefined,
        weightBearing: undefined,
        stoppedTraining: undefined,
        currentStatus: undefined,
        treatmentPrescribed: [],
        treatmentRecommendations: '',
        followUpDate: '',
        returnToPlayPhase: undefined,
        expectedTimeOut: '',
        comments: '',
        attachmentUrls: [],
    });
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef(null);

    const patch = (u) => setForm(p => ({ ...p, ...u }));

    useEffect(() => {
        const loadData = async () => {
            if (!teamId) return;
            try {
                const data = await DatabaseService.getInjuryFormData(teamId);
                setAthletes(data.athletes || []);
                if (preselectedAthleteId) {
                    setSelectedAthleteId(preselectedAthleteId);
                    setStep(1);
                }
            } catch (err) {
                console.error(err);
                setError('Failed to load form. The link may be expired or invalid.');
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [teamId, preselectedAthleteId]);

    const selectedAthlete = athletes.find(a => a.id === selectedAthleteId);

    const minStep = preselectedAthleteId ? 1 : 0;
    const handleNext = () => { setStep(s => Math.min(s + 1, STEP_NAMES.length - 1)); window.scrollTo(0, 0); };
    const handleBack = () => { setStep(s => Math.max(minStep, s - 1)); window.scrollTo(0, 0); };

    const canProgress = () => {
        if (step === 0) return !!selectedAthleteId;
        if (step === 1) return form.areas.length > 0;
        return true;
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const url = await uploadQuestionImage(file);
            patch({ attachmentUrls: [...(form.attachmentUrls || []), url] });
        } catch (err) { console.error('Upload failed:', err); }
        setUploading(false);
        if (fileRef.current) fileRef.current.value = '';
    };

    const handleSubmit = async () => {
        if (!selectedAthleteId || form.areas.length === 0) return;
        setSubmitting(true);
        try {
            await DatabaseService.saveInjuryReport({
                team_id: teamId,
                athlete_id: selectedAthleteId,
                athlete_name: selectedAthlete?.name || 'Unknown',
                date_of_injury: form.dateOfInjury,
                report_data: form,
            });
            setSubmitted(true);
        } catch (err) {
            console.error(err);
            alert('Failed to submit. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    // ─── STATES ─────────────────────────────────────────────────────────────

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <div className="text-center">
                <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-500 font-medium">Loading injury form...</p>
            </div>
        </div>
    );

    if (submitted) return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 animate-bounce">
                <CheckCircle2 size={40} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Report Submitted!</h1>
            <p className="text-slate-500 mb-8 max-w-xs">The injury report has been saved and sent to the coaching team.</p>
            <button onClick={() => window.location.reload()} className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold shadow-lg active:scale-95 transition-all">
                Submit Another Report
            </button>
        </div>
    );

    if (error) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
            <div className="p-8 bg-white rounded-3xl shadow-xl border border-slate-100 text-center max-w-sm">
                <AlertCircle size={48} className="text-rose-500 mx-auto mb-4" />
                <h1 className="text-xl font-bold text-slate-900 mb-2">Invalid Link</h1>
                <p className="text-slate-500 mb-6">{error}</p>
                <button onClick={() => window.location.reload()} className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-bold">Retry</button>
            </div>
        </div>
    );

    // ─── RENDER ─────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Header */}
            <header className="bg-white px-6 py-4 flex items-center justify-between border-b border-slate-100 sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center text-white">
                        <ShieldAlertIcon size={18} />
                    </div>
                    <span className="font-bold text-slate-900 tracking-tight">Injury Report</span>
                </div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    {step + 1} / {STEP_NAMES.length}
                </div>
            </header>

            {/* Progress */}
            <div className="h-1.5 w-full bg-slate-100">
                <div className="h-full bg-cyan-500 transition-all duration-500 ease-out" style={{ width: `${((step + 1) / STEP_NAMES.length) * 100}%` }} />
            </div>

            <main className="flex-1 p-6 max-w-lg mx-auto w-full flex flex-col">
                {/* Step 0: Athlete Selection (only when no athlete preselected in URL) */}
                {step === 0 && !preselectedAthleteId && (
                    <div className="flex-1">
                        <h2 className="text-2xl font-black text-slate-900 mb-2">Select Athlete</h2>
                        <p className="text-slate-500 mb-8 font-medium">Choose the athlete this injury report is for.</p>
                        <div className="space-y-3">
                            {athletes.map(a => (
                                <button key={a.id} onClick={() => setSelectedAthleteId(a.id)}
                                    className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${selectedAthleteId === a.id ? 'bg-cyan-50 border-cyan-500 shadow-md scale-[1.02]' : 'bg-white border-slate-100 hover:border-slate-200'}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-lg">{a.name}</span>
                                        {selectedAthleteId === a.id && <CheckCircle2 size={24} className="text-cyan-600" />}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Step 1: Body Map */}
                {step === 1 && (
                    <div className="flex-1 space-y-4">
                        {/* Locked athlete banner when preselected */}
                        {preselectedAthleteId && selectedAthlete && (
                            <div className="bg-cyan-50 border border-cyan-200 rounded-2xl p-4 flex items-center gap-3">
                                <div className="w-10 h-10 bg-cyan-600 rounded-xl flex items-center justify-center text-white font-black text-lg shrink-0">
                                    {selectedAthlete.name?.[0]?.toUpperCase() || '?'}
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-600">Injury report for</p>
                                    <p className="font-black text-slate-900 text-lg leading-tight">{selectedAthlete.name}</p>
                                </div>
                            </div>
                        )}
                        <h2 className="text-2xl font-black text-slate-900 mb-1">Injury Location</h2>
                        <p className="text-slate-500 font-medium mb-4">Tap the affected body areas and indicate severity.</p>
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                            <BodyMapSelector value={form.areas} onChange={areas => patch({ areas })} />
                        </div>
                        {form.areas.length > 0 && (
                            <div className="bg-white p-4 rounded-2xl border border-slate-100 space-y-2">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Selected</p>
                                {form.areas.map(a => (
                                    <div key={a.area} className="flex items-center justify-between text-sm">
                                        <span className="font-semibold text-slate-700 capitalize">{a.area.replace(/_/g, ' ')}</span>
                                        <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg ${a.severity === 3 ? 'bg-red-100 text-red-600' : a.severity === 2 ? 'bg-orange-100 text-orange-600' : 'bg-yellow-100 text-yellow-600'}`}>
                                            {a.severity === 3 ? 'Severe' : a.severity === 2 ? 'Moderate' : 'Mild'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Step 2: Classification & Context */}
                {step === 2 && (
                    <div className="flex-1 space-y-6">
                        <h2 className="text-2xl font-black text-slate-900 mb-1">Classification</h2>
                        <div><Label>Injury Type</Label>
                            <select value={form.classification || ''} onChange={e => patch({ classification: e.target.value || undefined })}
                                className="w-full p-4 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:border-cyan-500">
                                <option value="">Select...</option>
                                {INJURY_CLASSIFICATIONS.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div><Label>Severity Grade</Label>
                            <PillRow options={SEVERITY_GRADES} value={form.severityGrade} onChange={v => patch({ severityGrade: v })}
                                colorMap={{ 1: 'bg-yellow-500 text-white', 2: 'bg-orange-500 text-white', 3: 'bg-red-600 text-white' }} />
                        </div>
                        <div><Label>Laterality</Label>
                            <PillRow options={[...LATERALITY_OPTIONS]} value={form.laterality} onChange={v => patch({ laterality: v })} />
                        </div>
                        <div><Label>Recurrence</Label>
                            <PillRow options={['New', 'Recurrence']} value={form.recurrence} onChange={v => patch({ recurrence: v })} />
                        </div>
                        <div><Label>Activity</Label>
                            <PillRow options={[...INJURY_ACTIVITIES]} value={form.activity} onChange={v => patch({ activity: v })} />
                        </div>
                    </div>
                )}

                {/* Step 3: Clinical */}
                {step === 3 && (
                    <div className="flex-1 space-y-6">
                        <h2 className="text-2xl font-black text-slate-900 mb-1">Clinical Assessment</h2>
                        <div><Label>Date of Injury</Label>
                            <input type="date" value={form.dateOfInjury} onChange={e => patch({ dateOfInjury: e.target.value })}
                                className="w-full p-4 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:border-cyan-500" />
                        </div>
                        <div><Label>Mechanism — How did it happen?</Label>
                            <textarea placeholder="Describe..." value={form.mechanism} onChange={e => patch({ mechanism: e.target.value })}
                                className="w-full p-4 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:border-cyan-500 h-24 resize-none placeholder:font-medium" />
                        </div>
                        <div><Label>Perceived Pain (0–10)</Label>
                            <div className="flex gap-1.5 flex-wrap">
                                {Array.from({ length: 11 }, (_, i) => (
                                    <button key={i} type="button" onClick={() => patch({ painLevel: form.painLevel === i ? undefined : i })}
                                        className={`w-10 h-10 rounded-lg text-sm font-black transition-all ${form.painLevel === i
                                            ? (i <= 3 ? 'bg-emerald-500 text-white shadow-md' : i <= 6 ? 'bg-amber-500 text-white shadow-md' : 'bg-red-600 text-white shadow-md')
                                            : 'bg-white border border-slate-200 text-slate-400'}`}
                                    >{i}</button>
                                ))}
                            </div>
                        </div>
                        <div><Label>Kind of Pain</Label>
                            <MultiPillRow options={[...PAIN_KINDS]} value={form.painKinds} onChange={v => patch({ painKinds: v })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><Label>Swelling</Label>
                                <PillRow options={['Yes', 'No']} value={form.hasSwelling === true ? 'Yes' : form.hasSwelling === false ? 'No' : undefined}
                                    onChange={v => patch({ hasSwelling: v === 'Yes', swellingSeverity: v === 'No' ? undefined : form.swellingSeverity })} />
                                {form.hasSwelling && <div className="mt-2"><PillRow options={['Mild', 'Moderate', 'Severe']} value={form.swellingSeverity} onChange={v => patch({ swellingSeverity: v })}
                                    colorMap={{ 'Mild': 'bg-yellow-500 text-white', 'Moderate': 'bg-orange-500 text-white', 'Severe': 'bg-red-600 text-white' }} /></div>}
                            </div>
                            <div><Label>Bruising</Label>
                                <PillRow options={['Yes', 'No']} value={form.hasBruising === true ? 'Yes' : form.hasBruising === false ? 'No' : undefined}
                                    onChange={v => patch({ hasBruising: v === 'Yes', bruisingSeverity: v === 'No' ? undefined : form.bruisingSeverity })} />
                                {form.hasBruising && <div className="mt-2"><PillRow options={['Mild', 'Moderate', 'Severe']} value={form.bruisingSeverity} onChange={v => patch({ bruisingSeverity: v })}
                                    colorMap={{ 'Mild': 'bg-yellow-500 text-white', 'Moderate': 'bg-orange-500 text-white', 'Severe': 'bg-red-600 text-white' }} /></div>}
                            </div>
                        </div>
                        <div><Label>Range of Motion</Label>
                            <PillRow options={[...RANGE_OF_MOTION_OPTIONS]} value={form.rangeOfMotion} onChange={v => patch({ rangeOfMotion: v })}
                                colorMap={{ 'Full': 'bg-emerald-500 text-white', 'Limited': 'bg-amber-500 text-white', 'None': 'bg-red-600 text-white' }} />
                        </div>
                        <div><Label>Weight Bearing</Label>
                            <PillRow options={[...WEIGHT_BEARING_OPTIONS]} value={form.weightBearing} onChange={v => patch({ weightBearing: v })}
                                colorMap={{ 'Full': 'bg-emerald-500 text-white', 'Partial': 'bg-amber-500 text-white', 'Non-weight-bearing': 'bg-red-600 text-white' }} />
                        </div>
                        <div><Label>Stopped Training?</Label>
                            <PillRow options={['Yes', 'No']} value={form.stoppedTraining === true ? 'Yes' : form.stoppedTraining === false ? 'No' : undefined}
                                onChange={v => patch({ stoppedTraining: v === 'Yes' })} colorMap={{ 'Yes': 'bg-red-600 text-white', 'No': 'bg-emerald-500 text-white' }} />
                        </div>
                    </div>
                )}

                {/* Step 4: Management */}
                {step === 4 && (
                    <div className="flex-1 space-y-6">
                        <h2 className="text-2xl font-black text-slate-900 mb-1">Management</h2>
                        <div><Label>Current Status</Label>
                            <PillRow options={[...TRAINING_STATUS_OPTIONS]} value={form.currentStatus} onChange={v => patch({ currentStatus: v })}
                                colorMap={{ 'Full Training': 'bg-emerald-500 text-white', 'Modified Training': 'bg-amber-500 text-white', 'Rehab Only': 'bg-orange-500 text-white', 'Complete Rest': 'bg-red-600 text-white' }} />
                        </div>
                        <div><Label>Treatment Prescribed</Label>
                            <MultiPillRow options={[...TREATMENT_OPTIONS]} value={form.treatmentPrescribed} onChange={v => patch({ treatmentPrescribed: v })} />
                        </div>
                        <div><Label>Recommendations</Label>
                            <textarea placeholder="Rehab protocol, restrictions..." value={form.treatmentRecommendations} onChange={e => patch({ treatmentRecommendations: e.target.value })}
                                className="w-full p-4 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:border-cyan-500 h-24 resize-none placeholder:font-medium" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><Label>Follow-up Date</Label>
                                <input type="date" value={form.followUpDate} onChange={e => patch({ followUpDate: e.target.value })}
                                    className="w-full p-4 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:border-cyan-500" />
                            </div>
                            <div><Label>Expected Time Out</Label>
                                <input type="text" placeholder="e.g. 2-3 weeks" value={form.expectedTimeOut} onChange={e => patch({ expectedTimeOut: e.target.value })}
                                    className="w-full p-4 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:border-cyan-500 placeholder:font-medium" />
                            </div>
                        </div>
                        <div><Label>Return-to-Play Phase</Label>
                            <div className="flex gap-1">
                                {RTP_PHASES.map((phase, i) => {
                                    const idx = RTP_PHASES.indexOf(form.returnToPlayPhase);
                                    const isActive = form.returnToPlayPhase === phase;
                                    const isPast = idx >= 0 && i < idx;
                                    return (
                                        <button key={phase} type="button" onClick={() => patch({ returnToPlayPhase: isActive ? undefined : phase })}
                                            className={`flex-1 py-3 text-[9px] font-black uppercase tracking-widest transition-all ${i === 0 ? 'rounded-l-xl' : ''} ${i === RTP_PHASES.length - 1 ? 'rounded-r-xl' : ''}
                                                ${isActive ? 'bg-cyan-600 text-white shadow-md' : isPast ? 'bg-cyan-100 text-cyan-500' : 'bg-white border border-slate-200 text-slate-400'}`}
                                        >{phase.split(' - ')[1] || phase}</button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 5: Notes & Attachments */}
                {step === 5 && (
                    <div className="flex-1 space-y-6">
                        <h2 className="text-2xl font-black text-slate-900 mb-1">Notes & Attachments</h2>
                        <div><Label>Comments / Evaluation</Label>
                            <textarea placeholder="Clinical observations, prognosis..." value={form.comments} onChange={e => patch({ comments: e.target.value })}
                                className="w-full p-4 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:border-cyan-500 h-32 resize-none placeholder:font-medium" />
                        </div>
                        <div>
                            <Label>Scans / Imaging</Label>
                            <input ref={fileRef} type="file" accept="image/*,.pdf" onChange={handleFileUpload} className="hidden" />
                            {(form.attachmentUrls || []).length > 0 && (
                                <div className="grid grid-cols-3 gap-2 mb-3">
                                    {form.attachmentUrls.map((url, i) => (
                                        <div key={i} className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-50 h-24">
                                            <img src={url} alt="" className="w-full h-full object-cover" />
                                            <button type="button" onClick={() => patch({ attachmentUrls: form.attachmentUrls.filter(u => u !== url) })}
                                                className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <XIcon size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                                className="w-full py-4 border-2 border-dashed border-slate-200 rounded-xl text-[11px] font-bold uppercase tracking-widest text-slate-400 hover:border-cyan-300 hover:text-cyan-500 transition-all flex items-center justify-center gap-2">
                                {uploading ? <><Loader2 size={14} className="animate-spin" /> Uploading...</> : <><UploadCloudIcon size={14} /> Upload Image</>}
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 6: Review & Submit */}
                {step === 6 && (
                    <div className="flex-1 space-y-4">
                        <h2 className="text-2xl font-black text-slate-900 mb-1">Review & Submit</h2>
                        <p className="text-slate-500 font-medium mb-4">Confirm the details below before submitting.</p>

                        <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-100">
                            <div className="p-4 flex justify-between"><span className="text-slate-400 text-xs font-bold uppercase">Athlete</span><span className="font-bold text-slate-900">{selectedAthlete?.name}</span></div>
                            <div className="p-4 flex justify-between"><span className="text-slate-400 text-xs font-bold uppercase">Date</span><span className="font-bold text-slate-900">{form.dateOfInjury}</span></div>
                            <div className="p-4 flex justify-between"><span className="text-slate-400 text-xs font-bold uppercase">Areas</span><span className="font-bold text-slate-900 capitalize">{form.areas.map(a => a.area.replace(/_/g, ' ')).join(', ') || '—'}</span></div>
                            <div className="p-4 flex justify-between"><span className="text-slate-400 text-xs font-bold uppercase">Classification</span><span className="font-bold text-slate-900">{form.classification || '—'}</span></div>
                            <div className="p-4 flex justify-between"><span className="text-slate-400 text-xs font-bold uppercase">Severity</span><span className="font-bold text-slate-900">{form.severityGrade ? `Grade ${form.severityGrade}` : '—'}</span></div>
                            <div className="p-4 flex justify-between"><span className="text-slate-400 text-xs font-bold uppercase">Status</span><span className="font-bold text-slate-900">{form.currentStatus || '—'}</span></div>
                            <div className="p-4 flex justify-between"><span className="text-slate-400 text-xs font-bold uppercase">RTP Phase</span><span className="font-bold text-slate-900">{form.returnToPlayPhase || '—'}</span></div>
                            {form.mechanism && <div className="p-4"><span className="text-slate-400 text-xs font-bold uppercase block mb-1">Mechanism</span><span className="font-medium text-slate-700 text-sm">{form.mechanism}</span></div>}
                            {form.comments && <div className="p-4"><span className="text-slate-400 text-xs font-bold uppercase block mb-1">Comments</span><span className="font-medium text-slate-700 text-sm">{form.comments}</span></div>}
                        </div>
                    </div>
                )}

                {/* Navigation */}
                <div className="flex items-center gap-3 pt-8 mt-auto">
                    {step > 0 && (
                        <button onClick={handleBack} className="px-5 py-3.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all flex items-center gap-1">
                            <ChevronLeft size={16} /> Back
                        </button>
                    )}
                    {step < STEP_NAMES.length - 1 ? (
                        <button onClick={handleNext} disabled={!canProgress()}
                            className="flex-1 py-3.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-black transition-all disabled:opacity-30 flex items-center justify-center gap-2">
                            Next <ChevronRight size={16} />
                        </button>
                    ) : (
                        <button onClick={handleSubmit} disabled={submitting || form.areas.length === 0}
                            className="flex-1 py-3.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all disabled:opacity-30 flex items-center justify-center gap-2">
                            {submitting ? 'Submitting...' : <><Send size={16} /> Submit Report</>}
                        </button>
                    )}
                </div>
            </main>
        </div>
    );
};

export default PublicInjuryForm;
