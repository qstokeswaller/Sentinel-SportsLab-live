// @ts-nocheck
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, Routes, Route, Navigate } from 'react-router-dom';
import { useAppState } from './context/AppStateContext';
import { SupabaseStorageService } from './services/storageService';
import PerformanceLab from './components/performance/PerformanceLab';
import ImportResolverModal from './components/performance/ImportResolverModal';
import WattbikeMapCalculator from './components/performance/WattbikeMapCalculator';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { RosterPage } from './pages/RosterPage';
import { PeriodizationPage } from './pages/PeriodizationPage';
import { ExerciseLibraryPage } from './pages/ExerciseLibraryPage';
import { AnalyticsHubPage } from './pages/AnalyticsHubPage';
import { ReportingHubPage } from './pages/ReportingHubPage';
import { ConditioningHubPage } from './pages/ConditioningHubPage';
import WorkoutPacketModal from './components/WorkoutPacketModal';

import {
    Activity as ActivityIcon,
    BadgeCheck as BadgeCheckIcon,
    BarChart as BarChartIcon,
    CalendarDays as CalendarDaysIcon,
    Dumbbell as DumbbellIcon,
    Filter as FilterIcon,
    Layers as LayersIcon,
    Printer as PrinterIcon,
    Search as SearchIcon,
    Settings as SettingsIcon,
    Table as TableIcon,
    UserPlus as UserPlusIcon,
    X as XIcon,
    Zap as ZapIcon
} from 'lucide-react';

// Extracted Components (None used directly in App.tsx)

// --- 3. App Component ---

// --- DATA PERSISTENCE SERVICE ---
// StorageService — replaced by Supabase implementation (docs/services/storageService.ts)
const StorageService = SupabaseStorageService;
StorageService.init();















// --- READINESS HUB COMPONENTS ---



















const AddAthleteModal = () => {
    const {
        isAddAthleteModalOpen,
        setIsAddAthleteModalOpen,
        addAthleteMode,
        setAddAthleteMode,
        newAthleteName,
        setNewAthleteName,
        newAthleteTeam,
        setNewAthleteTeam,
        newAthleteProfile,
        setNewAthleteProfile,
        newTeamName,
        setNewTeamName,
        teams,
        handleAddAthlete,
        handleAddTeam
    } = useAppState();

    const [step, setStep] = useState(1);

    if (!isAddAthleteModalOpen) return null;

    const setProfile = (key, val) => setNewAthleteProfile(prev => ({ ...prev, [key]: val }));

    const canProceed = newAthleteName.trim().length > 0;

    const handleClose = () => { setIsAddAthleteModalOpen(false); setStep(1); };

    const INPUT = "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500 transition-colors";
    const LABEL = "text-[10px] font-black uppercase text-slate-400 tracking-widest";

    return (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 border-t-8 border-t-indigo-600">

                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                            <UserPlusIcon size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black uppercase tracking-tighter leading-none">
                                {addAthleteMode === 'athlete' ? 'Add New Athlete' : 'Create New Team'}
                            </h3>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                {addAthleteMode === 'athlete' ? (step === 1 ? 'Step 1 of 2 — Identity' : 'Step 2 of 2 — Profile') : 'Team Setup'}
                            </span>
                        </div>
                    </div>
                    <button onClick={handleClose} className="p-3 hover:bg-slate-100 rounded-full text-slate-400 transition-all"><XIcon size={24} /></button>
                </div>

                {/* Mode toggle */}
                <div className="px-6 pt-5">
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button onClick={() => { setAddAthleteMode('athlete'); setStep(1); }}
                            className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${addAthleteMode === 'athlete' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                            Athlete
                        </button>
                        <button onClick={() => { setAddAthleteMode('team'); setStep(1); }}
                            className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${addAthleteMode === 'team' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                            Team
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4 flex-1 overflow-y-auto no-scrollbar">

                    {/* TEAM mode */}
                    {addAthleteMode === 'team' && (
                        <div className="space-y-2">
                            <label className={LABEL}>Team Name</label>
                            <input type="text" value={newTeamName} onChange={e => setNewTeamName(e.target.value)}
                                className={INPUT} placeholder="Enter team name..." />
                        </div>
                    )}

                    {/* ATHLETE step 1 — identity */}
                    {addAthleteMode === 'athlete' && step === 1 && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className={LABEL}>Full Name</label>
                                <input type="text" value={newAthleteName} onChange={e => setNewAthleteName(e.target.value)}
                                    className={INPUT} placeholder="Enter full name..." autoFocus />
                            </div>
                            <div className="space-y-2">
                                <label className={LABEL}>Assign to Team</label>
                                <select value={newAthleteTeam} onChange={e => setNewAthleteTeam(e.target.value)} className={INPUT}>
                                    <option value="">No Team (Individual)</option>
                                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* ATHLETE step 2 — profile */}
                    {addAthleteMode === 'athlete' && step === 2 && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className={LABEL}>Age</label>
                                    <input type="number" min="10" max="80" value={newAthleteProfile.age}
                                        onChange={e => setProfile('age', e.target.value)}
                                        className={INPUT} placeholder="e.g. 24" />
                                </div>
                                <div className="space-y-2">
                                    <label className={LABEL}>Gender</label>
                                    <select value={newAthleteProfile.gender} onChange={e => setProfile('gender', e.target.value)} className={INPUT}>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                        <option value="">Prefer not to say</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className={LABEL}>Height (cm)</label>
                                    <input type="number" min="100" max="250" value={newAthleteProfile.height_cm}
                                        onChange={e => setProfile('height_cm', e.target.value)}
                                        className={INPUT} placeholder="e.g. 182" />
                                </div>
                                <div className="space-y-2">
                                    <label className={LABEL}>Weight (kg)</label>
                                    <input type="number" min="30" max="200" value={newAthleteProfile.weight_kg}
                                        onChange={e => setProfile('weight_kg', e.target.value)}
                                        className={INPUT} placeholder="e.g. 78" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className={LABEL}>Sport</label>
                                <input type="text" value={newAthleteProfile.sport}
                                    onChange={e => setProfile('sport', e.target.value)}
                                    className={INPUT} placeholder="e.g. Rugby, Athletics, Football..." />
                            </div>
                            <div className="space-y-2">
                                <label className={LABEL}>Position / Event</label>
                                <input type="text" value={newAthleteProfile.position}
                                    onChange={e => setProfile('position', e.target.value)}
                                    className={INPUT} placeholder="e.g. Prop, Sprinter, Midfielder..." />
                            </div>
                            <div className="space-y-2">
                                <label className={LABEL}>Training Goals</label>
                                <textarea value={newAthleteProfile.goals}
                                    onChange={e => setProfile('goals', e.target.value)}
                                    className={INPUT + " resize-none h-20"} placeholder="e.g. Increase power, reduce injury risk, improve speed..." />
                            </div>
                            <div className="space-y-2">
                                <label className={LABEL}>Notes</label>
                                <textarea value={newAthleteProfile.notes}
                                    onChange={e => setProfile('notes', e.target.value)}
                                    className={INPUT + " resize-none h-20"} placeholder="Any relevant background, history, or flags..." />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 bg-white flex justify-between items-center gap-3 shrink-0">
                    <button onClick={handleClose} className="px-5 py-3 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors uppercase tracking-wider">
                        Cancel
                    </button>
                    <div className="flex gap-3">
                        {addAthleteMode === 'athlete' && step === 2 && (
                            <button onClick={() => setStep(1)} className="px-5 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors uppercase tracking-wider">
                                Back
                            </button>
                        )}
                        {addAthleteMode === 'athlete' && step === 1 && (
                            <button onClick={() => setStep(2)} disabled={!canProceed}
                                className="px-8 py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-40">
                                Next — Profile
                            </button>
                        )}
                        {(addAthleteMode === 'team' || (addAthleteMode === 'athlete' && step === 2)) && (
                            <button
                                onClick={addAthleteMode === 'athlete' ? handleAddAthlete : handleAddTeam}
                                className="px-8 py-3 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-xl hover:bg-black transition-all active:scale-95 flex items-center gap-2"
                            >
                                <UserPlusIcon size={16} /> {addAthleteMode === 'athlete' ? 'Add Athlete' : 'Create Team'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const App = () => {
    const {
        isPerformanceLabOpen, setIsPerformanceLabOpen,
    } = useAppState();
    return (
        <div className="flex h-screen bg-[#F8F9FF] text-slate-900 font-sans selection:bg-indigo-500/30 overflow-hidden relative">
            <Sidebar />
            <main className="flex-1 overflow-y-auto no-scrollbar relative min-h-screen pb-24 md:pb-0">
                <div className="max-w-7xl mx-auto px-6 py-8">
                    <Routes>
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                        <Route path="/dashboard" element={<DashboardPage />} />
                        <Route path="/periodization" element={<PeriodizationPage />} />
                        <Route path="/clients" element={<RosterPage />} />
                        <Route path="/library" element={<ExerciseLibraryPage />} />
                        <Route path="/conditioning" element={<ConditioningHubPage />} />
                        <Route path="/analytics" element={<AnalyticsHubPage />} />
                        <Route path="/reports" element={<ReportingHubPage />} />
                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                </div>
            </main>
            <AddAthleteModal />
            <AthleteProfileModal />
            <ACWRDetailModal />
            <AddSessionModal />
            <SessionModal />
            <WorkoutPacketModal />
            <WeightroomSheetModal />
            <PerformanceLab isOpen={isPerformanceLabOpen} onClose={() => setIsPerformanceLabOpen(false)} />
            <WattbikeMapCalculator />
        </div>
    );
};


const WeightroomSheetModal = () => {
    const { isWeightroomSheetModalOpen, setIsWeightroomSheetModalOpen, teams, exercises } = useAppState();
    const [wrSelectedTeam, setWrSelectedTeam] = useState('All');
    const [wsMode, setWsMode] = useState('basic');
    const [wsColumns, setWsColumns] = useState([
        { id: 'c1', label: 'Exercise 1', type: 'blank', exerciseId: '', metric: '' },
        { id: 'c2', label: 'Exercise 2', type: 'blank', exerciseId: '', metric: '' },
    ]);

    if (!isWeightroomSheetModalOpen) return null;

    return (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[2rem] w-full max-w-5xl max-h-[90vh] shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 border-t-8 border-t-slate-900">
                <div className="p-8 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white"><TableIcon size={24} /></div>
                        <h3 className="text-3xl font-black uppercase tracking-tighter">Weightroom Sheets</h3>
                    </div>
                    <button onClick={() => setIsWeightroomSheetModalOpen(false)} className="p-3 hover:bg-slate-100 rounded-full text-slate-400 transition-all"><XIcon size={24} /></button>
                </div>
                <div className="flex-1 p-10 bg-slate-50/20 overflow-y-auto no-scrollbar space-y-8">
                    <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Select Target Group</label>
                            <select value={wrSelectedTeam} onChange={(e) => setWrSelectedTeam(e.target.value)} className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold outline-none shadow-sm">
                                <option value="All">Full Roster</option>
                                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
                <div className="p-8 border-t border-slate-100 bg-white flex justify-end gap-4 shrink-0">
                    <button onClick={() => window.print()} className="px-10 py-4 bg-slate-900 text-white rounded-xl text-[11px] font-black uppercase shadow-xl hover:bg-black transition-all flex items-center gap-2">
                        <PrinterIcon size={16} /> Print Sheet
                    </button>
                </div>
            </div>
        </div>
    );
};


const AddSessionModal = () => {
    const {
        isAddSessionModalOpen, setIsAddSessionModalOpen,
        addSessionTab, setAddSessionTab,
        addSessionSearch, setAddSessionSearch,
        addSessionCategory, setAddSessionCategory,
        newSession, setNewSession,
        handleAddSession,
        teams, exercises, exerciseCategories
    } = useAppState();

    if (!isAddSessionModalOpen) return null;

    return (
        <div className="fixed inset-0 z-[700] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 border-t-8 border-t-slate-900">
                <div className="p-8 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-50 text-slate-900 rounded-2xl flex items-center justify-center"><CalendarDaysIcon size={24} /></div>
                        <div>
                            <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">New Session</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Quick Schedule</p>
                        </div>
                    </div>
                    <button onClick={() => setIsAddSessionModalOpen(false)} className="p-3 hover:bg-slate-100 rounded-full text-slate-400 transition-all"><XIcon size={24} /></button>
                </div>

                {/* TAB SWITCHER */}
                <div className="flex px-8 pt-4 bg-white border-b border-slate-100">
                    <button
                        onClick={() => setAddSessionTab('info')}
                        className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest border-b-4 transition-all ${addSessionTab === 'info' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                    >
                        1. Basic Info
                    </button>
                    <button
                        onClick={() => setAddSessionTab('exercises')}
                        className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest border-b-4 transition-all ${addSessionTab === 'exercises' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                    >
                        2. Exercises ({newSession.exercises.length})
                    </button>
                </div>

                <div className="p-8 space-y-6 overflow-y-auto no-scrollbar max-h-[50vh]">
                    {addSessionTab === 'info' ? (
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Session Title</label>
                                <input
                                    type="text"
                                    value={newSession.title}
                                    onChange={(e) => setNewSession({ ...newSession, title: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none"
                                    placeholder="e.g. Upper Body Power"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Date</label>
                                    <input
                                        type="date"
                                        value={newSession.date}
                                        onChange={(e) => setNewSession({ ...newSession, date: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Phase</label>
                                    <select
                                        value={newSession.trainingPhase}
                                        onChange={(e) => setNewSession({ ...newSession, trainingPhase: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none appearance-none"
                                    >
                                        {['Strength', 'Power', 'Hypertrophy', 'Speed', 'Conditioning', 'Recovery', 'Technical', 'GPP'].map(p => (
                                            <option key={p} value={p}>{p}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Target Type</label>
                                    <div className="flex bg-slate-100 p-1 rounded-xl">
                                        {['Team', 'Individual'].map(t => (
                                            <button
                                                key={t}
                                                onClick={() => setNewSession({ ...newSession, targetType: t, targetId: '' })}
                                                className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${newSession.targetType === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
                                            >
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Target</label>
                                    <select
                                        value={newSession.targetId}
                                        onChange={(e) => setNewSession({ ...newSession, targetId: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none appearance-none"
                                    >
                                        <option value="" disabled>Select {newSession.targetType}</option>
                                        {newSession.targetType === 'Team' ? (
                                            teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)
                                        ) : (
                                            teams.flatMap(t => t.players).map(p => <option key={p.id} value={p.id}>{p.name}</option>)
                                        )}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Expected Load</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {['Low', 'Medium', 'High'].map(l => (
                                        <button
                                            key={l}
                                            onClick={() => setNewSession({ ...newSession, load: l })}
                                            className={`py-3 rounded-xl border-2 text-[10px] font-black uppercase transition-all ${newSession.load === l
                                                ? (l === 'High' ? 'bg-red-50 border-red-500 text-red-600' : l === 'Medium' ? 'bg-amber-50 border-amber-500 text-amber-600' : 'bg-emerald-50 border-emerald-500 text-emerald-600')
                                                : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                                                }`}
                                        >
                                            {l}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* SEARCH & FILTER */}
                            <div className="flex gap-3">
                                <div className="flex-1 relative">
                                    <SearchIcon size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search library..."
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-slate-900/10"
                                        value={addSessionSearch}
                                        onChange={(e) => setAddSessionSearch(e.target.value)}
                                    />
                                </div>
                                <div className="relative w-32">
                                    <FilterIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <select
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-[10px] font-black uppercase tracking-widest outline-none appearance-none"
                                        value={addSessionCategory}
                                        onChange={(e) => setAddSessionCategory(e.target.value)}
                                    >
                                        <option>All</option>
                                        {exerciseCategories.map(c => <option key={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* EXERCISE LIST */}
                            <div className="space-y-4">
                                {exercises
                                    .filter(ex => {
                                        const matchesSearch = (ex.name || "").toLowerCase().includes(addSessionSearch.toLowerCase());
                                        const matchesCategory = addSessionCategory === 'All' || (ex.categories || []).includes(addSessionCategory);
                                        return matchesSearch && matchesCategory;
                                    })
                                    .map(ex => {
                                        const selectedEx = newSession.exercises.find(e => e.id === ex.id);
                                        const isSelected = !!selectedEx;
                                        return (
                                            <div key={ex.id} className={`p-4 rounded-2xl border transition-all ${isSelected ? 'bg-slate-50 border-indigo-200 ring-1 ring-indigo-500/20' : 'bg-white border-slate-100'}`}>
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400'}`}>
                                                            <DumbbellIcon size={18} />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-xs font-black text-slate-900">{ex.name}</h4>
                                                            <p className="text-[10px] font-bold text-slate-400">{(ex.categories || [])[0] || 'Strength'}</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            const newExList = isSelected
                                                                ? newSession.exercises.filter(e => e.id !== ex.id)
                                                                : [...newSession.exercises, { id: ex.id, name: ex.name, sets: 3, reps: '10', weight: '-', rpe: 8, notes: '' }];
                                                            setNewSession({ ...newSession, exercises: newExList });
                                                        }}
                                                        className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${isSelected ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                                    >
                                                        {isSelected ? 'Selected' : 'Add'}
                                                    </button>
                                                </div>

                                                {/* INPUTS FOR SETS/REPS IF SELECTED */}
                                                {isSelected && (
                                                    <div className="grid grid-cols-4 gap-3 border-t border-slate-200 pt-3 animate-in slide-in-from-top-2">
                                                        <div>
                                                            <label className="text-[8px] font-black uppercase text-slate-400 block mb-1">Sets</label>
                                                            <input type="number" value={selectedEx.sets} onChange={(e) => {
                                                                const updated = newSession.exercises.map(item => item.id === ex.id ? { ...item, sets: parseInt(e.target.value) } : item);
                                                                setNewSession({ ...newSession, exercises: updated });
                                                            }} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold outline-none text-center" />
                                                        </div>
                                                        <div>
                                                            <label className="text-[8px] font-black uppercase text-slate-400 block mb-1">Reps</label>
                                                            <input type="text" value={selectedEx.reps} onChange={(e) => {
                                                                const updated = newSession.exercises.map(item => item.id === ex.id ? { ...item, reps: e.target.value } : item);
                                                                setNewSession({ ...newSession, exercises: updated });
                                                            }} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold outline-none text-center" />
                                                        </div>
                                                        <div>
                                                            <label className="text-[8px] font-black uppercase text-slate-400 block mb-1">RPE</label>
                                                            <input type="number" value={selectedEx.rpe} onChange={(e) => {
                                                                const updated = newSession.exercises.map(item => item.id === ex.id ? { ...item, rpe: parseInt(e.target.value) } : item);
                                                                setNewSession({ ...newSession, exercises: updated });
                                                            }} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold outline-none text-center" />
                                                        </div>
                                                        <div>
                                                            <label className="text-[8px] font-black uppercase text-slate-400 block mb-1">Config</label>
                                                            <button onClick={() => {
                                                                const updated = newSession.exercises.filter(item => item.id !== ex.id);
                                                                setNewSession({ ...newSession, exercises: updated });
                                                            }} className="w-full bg-red-50 text-red-500 border border-red-100 rounded-lg py-1.5 text-[9px] font-black uppercase hover:bg-red-100">Remove</button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    )}
                </div>
                <div className="p-8 border-t border-slate-100 bg-white flex gap-4">
                    <button onClick={() => setIsAddSessionModalOpen(false)} className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-xl text-[11px] font-black uppercase hover:bg-slate-100 transition-all">Cancel</button>
                    <button
                        onClick={handleAddSession}
                        className="flex-1 py-4 bg-slate-900 text-white rounded-xl text-[11px] font-black uppercase shadow-xl hover:bg-black transition-all"
                    >
                        Create Session
                    </button>
                </div>
            </div>
        </div>
    );
};

const SessionModal = () => {
    const {
        viewingSession,
        setViewingSession,
        resolveTargetName,
        exercises,
        BORG_RPE_SCALE,
        kpiDefinitions,
        scheduledSessions,
        setScheduledSessions,
        loadRecords,
        setLoadRecords
    } = useAppState();

    if (!viewingSession) return null;

    const handleSave = async () => {
        try {
            // 1. Update the session status to Completed
            await DatabaseService.updateSession(viewingSession.id, {
                status: 'Completed',
                actual_duration: viewingSession.actualDuration || viewingSession.plannedDuration || 60,
                // actualRPE? We might need to add a field to the schema or store in metrics
                notes: `Actual RPE: ${viewingSession.actualRPE}. ` + (viewingSession.notes || '')
            });

            // 2. Log the load assessment for the athlete
            const athleteId = viewingSession.targetType === 'Individual' ? viewingSession.targetId : 'p1';
            const sRPE = (viewingSession.actualRPE || 0) * (viewingSession.actualDuration || viewingSession.plannedDuration || 60);

            await DatabaseService.logAssessment('sRPE_load', athleteId, {
                sessionId: viewingSession.id,
                perceivedLoad: viewingSession.actualRPE,
                sRPE: sRPE,
                date: viewingSession.date
            });

            // 3. Refresh global state
            await initData();
            setViewingSession(null);
            showToast("Session completed and diagnostics logged");
        } catch (err) {
            console.error("Error saving session diagnostic:", err);
            showToast("Failed to save. Ensure schema is applied.", "error");
        }
    };

    return (
        <div className="fixed inset-0 z-[700] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] w-full max-w-3xl max-h-[90vh] shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 border-t-8 border-t-slate-900">
                <div className="p-8 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
                    <div>
                        <h3 className="text-2xl font-black uppercase tracking-tighter">{viewingSession.title}</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Post-Session Diagnostics</p>
                    </div>
                    <button onClick={() => setViewingSession(null)} className="p-3 hover:bg-slate-100 rounded-full text-slate-400 transition-all"><XIcon size={24} /></button>
                </div>
                <div className="p-10 space-y-8 overflow-y-auto no-scrollbar">
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Date</span>
                                <span className="text-sm font-black text-slate-900">{viewingSession.date}</span>
                            </div>
                            <div>
                                <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Load</span>
                                <span className={`text-sm font-black ${viewingSession.load === 'High' ? 'text-red-600' : viewingSession.load === 'Medium' ? 'text-amber-600' : 'text-green-600'}`}>{viewingSession.load}</span>
                            </div>
                            <div>
                                <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Target</span>
                                <span className="text-sm font-black text-slate-900">{resolveTargetName(viewingSession.targetId, viewingSession.targetType)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-lg font-black uppercase tracking-tight border-b border-slate-100 pb-3">Exercise Prescription</h4>
                        <div className="space-y-3">
                            {viewingSession.exercises ? viewingSession.exercises.map((exObj, idx) => {
                                const ex = exercises.find(e => e.id === exObj.id);
                                return ex ? (
                                    <div key={idx} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-black">{idx + 1}</div>
                                            <div>
                                                <span className="font-bold text-sm uppercase block leading-none">{ex.name}</span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{ex.categories[0]}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs font-black text-slate-900 block">{exObj.sets} Sets x {exObj.reps} Reps</span>
                                            <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">
                                                {exObj.weight && exObj.weight !== '-' ? `@ ${exObj.weight}` : 'Bodyweight'} {exObj.rpe ? `// RPE ${exObj.rpe}` : ''}
                                            </span>
                                        </div>
                                    </div>
                                ) : null;
                            }) : viewingSession.exerciseIds?.map((eid, idx) => {
                                const ex = exercises.find(e => e.id === eid);
                                return ex ? (
                                    <div key={idx} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-black">{idx + 1}</div>
                                            <span className="font-bold text-sm uppercase">{ex.name}</span>
                                        </div>
                                        <span className="text-xs font-black text-slate-400 italic">3 Sets x 8-10 Reps</span>
                                    </div>
                                ) : null;
                            })}
                        </div>
                    </div>

                    <div className="space-y-6">
                        <h4 className="text-lg font-black uppercase tracking-tight border-b border-slate-100 pb-3">Log Diagnostics</h4>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <div className="flex justify-between items-end">
                                    <label className="text-[10px] font-black uppercase text-slate-400">sRPE (Borg CR10)</label>
                                    <span className={`text-xs font-black uppercase ${BORG_RPE_SCALE[viewingSession.actualRPE || 5]?.color || 'text-slate-500'}`}>
                                        {BORG_RPE_SCALE[viewingSession.actualRPE || 5]?.label || 'Moderate'}
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="0" max="10"
                                    step="1"
                                    value={viewingSession.actualRPE || 5}
                                    onChange={(e) => setViewingSession({ ...viewingSession, actualRPE: parseInt(e.target.value) })}
                                    className="w-full accent-slate-900"
                                />
                                <div className="flex justify-between text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">
                                    <span>Rest</span>
                                    <span>Maximal</span>
                                </div>

                                <div className="mt-4 p-4 bg-slate-900 rounded-2xl border border-slate-800 shadow-inner">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[9px] font-black text-slate-400 uppercase">Calculated Load</span>
                                        <span className="text-xl font-black text-white">
                                            {(viewingSession.actualRPE || 0) * (viewingSession.actualDuration || viewingSession.plannedDuration || 60)} <span className="text-[10px] text-slate-500">AU</span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400">Actual Duration (mins)</label>
                                    <input
                                        type="number"
                                        value={viewingSession.actualDuration || viewingSession.plannedDuration || 60}
                                        onChange={(e) => setViewingSession({ ...viewingSession, actualDuration: parseInt(e.target.value) })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-slate-900/10"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400">Body Weight (kg)</label>
                                    <input type="number" placeholder="kg" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 text-sm font-bold outline-none" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400">Session-Specific KPIs</label>
                            <div className="grid grid-cols-2 gap-4">
                                {(kpiDefinitions || []).slice(0, 4).map(kpi => (
                                    <div key={kpi.id} className="space-y-1">
                                        <label className="text-[9px] font-bold text-slate-500">{kpi.name} ({kpi.unit})</label>
                                        <input type="number" placeholder={kpi.unit} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold outline-none" />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400">Session Notes</label>
                            <textarea placeholder="Any observations, injuries, or performance notes..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 text-sm font-bold outline-none h-24 resize-none"></textarea>
                        </div>
                    </div>
                </div>
                <div className="p-8 border-t border-slate-100 bg-white flex justify-end gap-4 shrink-0">
                    <button onClick={() => setViewingSession(null)} className="px-8 py-4 bg-slate-100 text-slate-700 rounded-xl text-[11px] font-black uppercase hover:bg-slate-200 transition-all">Cancel</button>
                    <button onClick={handleSave} className="px-10 py-4 bg-slate-900 text-white rounded-xl text-[11px] font-black uppercase shadow-xl hover:bg-black transition-all">Save Diagnostics & Load</button>
                </div>
            </div>
        </div>
    );
};

const AthleteProfileModal = () => {
    const { viewingPlayer, setViewingPlayer } = useAppState();
    if (!viewingPlayer) return null;

    const p = viewingPlayer;
    const initials = p.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    const StatCard = ({ label, value }: { label: string; value: any }) => (
        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
            <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</div>
            <div className="text-lg font-black text-slate-900 leading-tight">{value || <span className="text-slate-300">—</span>}</div>
        </div>
    );

    const bmi = p.height_cm && p.weight_kg
        ? (p.weight_kg / ((p.height_cm / 100) ** 2)).toFixed(1)
        : null;

    return (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-900/90 backdrop-blur-xl p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[2rem] w-full max-w-3xl max-h-[90vh] shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-500 border-t-8 border-t-indigo-600 text-slate-900">

                {/* Header */}
                <div className="p-8 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-xl font-black shadow-lg">
                            {initials}
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">{p.name}</h2>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-[10px] font-black uppercase text-emerald-500 flex items-center gap-1">
                                    <BadgeCheckIcon size={12} /> Athlete Profile
                                </span>
                                {p.sport && <span className="text-[10px] font-bold text-slate-400 uppercase">{p.sport}</span>}
                                {p.position && <span className="text-[9px] bg-indigo-50 text-indigo-600 font-black px-2 py-0.5 rounded uppercase">{p.position}</span>}
                            </div>
                        </div>
                    </div>
                    <button onClick={() => setViewingPlayer(null)} className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100 transition-all">
                        <XIcon size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-8 no-scrollbar space-y-8">

                    {/* Physical stats row */}
                    <div>
                        <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3">Physical Profile</div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <StatCard label="Age" value={p.age ? `${p.age} yrs` : null} />
                            <StatCard label="Gender" value={p.gender} />
                            <StatCard label="Height" value={p.height_cm ? `${p.height_cm} cm` : null} />
                            <StatCard label="Weight" value={p.weight_kg ? `${p.weight_kg} kg` : null} />
                        </div>
                    </div>

                    {/* Sport & BMI row */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <StatCard label="Sport" value={p.sport} />
                        <StatCard label="Position / Event" value={p.position} />
                        <StatCard label="BMI" value={bmi ? `${bmi}` : null} />
                    </div>

                    {/* Goals */}
                    <div className="bg-indigo-50 rounded-2xl p-5 border border-indigo-100">
                        <div className="text-[9px] font-black uppercase tracking-widest text-indigo-400 mb-2">Training Goals</div>
                        {p.goals
                            ? <p className="text-sm font-medium text-slate-700 leading-relaxed">{p.goals}</p>
                            : <p className="text-sm text-slate-300 italic">No goals recorded.</p>
                        }
                    </div>

                    {/* Notes */}
                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                        <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Notes</div>
                        {p.notes
                            ? <p className="text-sm font-medium text-slate-600 leading-relaxed">{p.notes}</p>
                            : <p className="text-sm text-slate-300 italic">No notes recorded.</p>
                        }
                    </div>

                    {/* Adherence pill if available */}
                    {p.adherence != null && (
                        <div className="bg-white rounded-2xl p-5 border border-slate-200 flex items-center justify-between">
                            <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">Session Adherence</div>
                            <div className="text-2xl font-black text-slate-900">{p.adherence}%</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const ACWRDetailModal = () => {
    const { acwrDetailAthlete, setAcwrDetailAthlete } = useAppState();
    if (!acwrDetailAthlete) return null;

    // These would normally be calculated by utility functions, using placeholders for now
    const status = { status: 'Optimal', color: 'text-emerald-600', bgColor: 'bg-emerald-100', risk: 'Sweet spot' };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[500] p-8 animate-in fade-in duration-300">
            <div className="bg-white rounded-[3rem] shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col text-slate-900">
                <div className="p-10 border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white">
                    <div className="flex justify-between items-start">
                        <div className="space-y-2">
                            <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">{acwrDetailAthlete.name}</h2>
                            <p className="text-sm text-slate-400 font-bold uppercase">{acwrDetailAthlete.subsection} • ACWR Analysis</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className={`px-6 py-3 rounded-2xl ${status.bgColor} border-2 ${status.color.replace('text-', 'border-')}`}>
                                <span className={`text-lg font-black uppercase ${status.color}`}>{status.status}</span>
                            </div>
                            <button onClick={() => setAcwrDetailAthlete(null)} className="w-12 h-12 bg-slate-100 hover:bg-slate-900 hover:text-white rounded-2xl flex items-center justify-center transition-all">
                                <XIcon size={20} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-10 space-y-8 no-scrollbar">
                    <div className="grid grid-cols-3 gap-6">
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                            <span className="text-[10px] font-black uppercase text-slate-400 block mb-2">Current ACWR</span>
                            <span className="text-4xl font-black text-slate-900">1.12</span>
                        </div>
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                            <span className="text-[10px] font-black uppercase text-slate-400 block mb-2">Acute Load (7d)</span>
                            <span className="text-4xl font-black text-slate-900">420</span>
                        </div>
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                            <span className="text-[10px] font-black uppercase text-slate-400 block mb-2">Chronic Load (28d)</span>
                            <span className="text-4xl font-black text-slate-900">375</span>
                        </div>
                    </div>

                    <div className={`p-6 rounded-2xl ${status.bgColor} border-2 ${status.color.replace('text-', 'border-')}`}>
                        <h4 className={`text-sm font-black uppercase mb-2 ${status.color}`}>Risk Assessment</h4>
                        <p className="text-sm font-medium text-slate-700">{status.risk} - Athlete is in the sweet spot for adaptation and performance gains.</p>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                        <h4 className="text-sm font-black uppercase text-slate-400 mb-4">Load Progression (Last 28 Days)</h4>
                        <div className="h-48 flex items-center justify-center text-slate-300 font-bold italic">
                            Terminal processing telemetry...
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default App;
