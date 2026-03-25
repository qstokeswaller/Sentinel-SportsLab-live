// @ts-nocheck
import React, { useState } from 'react';
import { ClipboardListIcon, StethoscopeIcon, ShieldAlertIcon, ArrowLeftIcon, ActivityIcon, UserIcon, ChevronDownIcon } from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import WellnessHub from '../components/performance/WellnessHub';
import MedicalReports from '../components/wellness/MedicalReports';
import InjuryReport from '../components/wellness/InjuryReport';
import { ACWRMetricCard } from '../components/analytics/ACWRMetricCard';

const SECTIONS = [
    { title: 'Questionnaire Data', desc: 'Wellness check-in responses, readiness scores & team trends', icon: ClipboardListIcon },
    { title: 'Medical Reports',    desc: 'Athlete opt-outs, medical status and strategic notes',       icon: StethoscopeIcon },
    { title: 'Injury Report',      desc: 'Injury tracking, body map analysis & return-to-play',        icon: ShieldAlertIcon },
    { title: 'ACWR Monitoring',    desc: 'Track acute:chronic workload ratios to prevent overtraining and optimise load', icon: ActivityIcon },
];

export const WellnessHubPage: React.FC = () => {
    const { teams, loadRecords } = useAppState();
    const [activeSection, setActiveSection] = useState<string | null>(null);
    const [acwrSelectedAthleteId, setAcwrSelectedAthleteId] = useState('');

    const allPlayers = teams.flatMap(t => t.players || []);

    // Active section detail view
    if (activeSection) {
        return (
            <div className="space-y-5 animate-in fade-in duration-300">
                <div className="flex items-center justify-between bg-white px-5 py-3.5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setActiveSection(null)}
                            className="p-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-all"
                        >
                            <ArrowLeftIcon size={16} />
                        </button>
                        <div>
                            <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Wellness Hub</div>
                            <h2 className="text-base font-semibold text-slate-900">{activeSection}</h2>
                        </div>
                    </div>
                    {activeSection === 'ACWR Monitoring' && (
                        <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
                            <UserIcon size={14} className="text-slate-400" />
                            <select
                                value={acwrSelectedAthleteId}
                                onChange={(e) => setAcwrSelectedAthleteId(e.target.value)}
                                className="bg-transparent text-xs font-bold text-slate-700 outline-none uppercase"
                            >
                                <option value="">Select Athlete</option>
                                {allPlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                    )}
                </div>

                <div className="min-h-[600px]">
                    {activeSection === 'Questionnaire Data' && <WellnessHub />}
                    {activeSection === 'Medical Reports' && <MedicalReports />}
                    {activeSection === 'Injury Report' && <InjuryReport />}
                    {activeSection === 'ACWR Monitoring' && (
                        <div className="space-y-4 animate-in fade-in duration-300">
                            {!acwrSelectedAthleteId ? (
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center space-y-2">
                                    <ActivityIcon size={32} className="mx-auto text-slate-300" />
                                    <p className="text-sm font-medium text-slate-500">Select an athlete above to view their ACWR data.</p>
                                    <p className="text-xs text-slate-400">The Acute:Chronic Workload Ratio tracks injury risk based on training load patterns.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <ACWRMetricCard athleteId={acwrSelectedAthleteId} loadRecords={loadRecords} />
                                    <div className="bg-slate-800 text-white p-5 rounded-xl shadow-sm flex flex-col justify-center">
                                        <h4 className="text-sm font-semibold text-emerald-400 mb-3">Model Interpretation</h4>
                                        <p className="text-sm text-slate-300 leading-relaxed mb-3">
                                            The Acute:Chronic Workload Ratio (ACWR) compares short-term workload (7 days) to long-term workload (28 days).
                                        </p>
                                        <ul className="space-y-2 text-xs text-slate-400">
                                            <li className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> 0.8–1.3: Optimal Load (Low Risk)</li>
                                            <li className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-500"></div> 1.3–1.5: High Load (Caution)</li>
                                            <li className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-rose-500"></div> &gt;1.5: Excessive Load (High Risk)</li>
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Card grid selector
    return (
        <div className="space-y-5 animate-in fade-in duration-300">
            <div className="bg-white px-5 py-4 rounded-xl border border-slate-200 shadow-sm">
                <h2 className="text-xl font-semibold text-slate-900">Wellness Hub</h2>
                <p className="text-sm text-slate-500 mt-0.5">Athlete wellness monitoring, medical records & injury tracking.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {SECTIONS.map((section, i) => (
                    <button
                        key={i}
                        onClick={() => setActiveSection(section.title)}
                        className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group flex flex-col text-left h-[150px]"
                    >
                        <div className="flex items-start gap-4 h-full">
                            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-500 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-all shrink-0">
                                <section.icon size={20} />
                            </div>
                            <div className="flex flex-col justify-center h-full">
                                <h3 className="text-base font-semibold text-slate-900 mb-1 leading-tight">{section.title}</h3>
                                <p className="text-xs text-slate-500 leading-relaxed">{section.desc}</p>
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default WellnessHubPage;
