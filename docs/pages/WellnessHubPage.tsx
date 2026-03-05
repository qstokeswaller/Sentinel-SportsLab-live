// @ts-nocheck
import React, { useState } from 'react';
import { ClipboardListIcon, StethoscopeIcon, ShieldAlertIcon, ArrowLeftIcon } from 'lucide-react';
import WellnessHub from '../components/performance/WellnessHub';
import MedicalReports from '../components/wellness/MedicalReports';
import InjuryReport from '../components/wellness/InjuryReport';

const SECTIONS = [
    { title: 'Questionnaire Data', desc: 'Wellness check-in responses, readiness scores & team trends', icon: ClipboardListIcon },
    { title: 'Medical Reports',    desc: 'Athlete opt-outs, medical status and strategic notes',       icon: StethoscopeIcon },
    { title: 'Injury Report',      desc: 'Injury tracking, body map analysis & return-to-play',        icon: ShieldAlertIcon },
];

export const WellnessHubPage: React.FC = () => {
    const [activeSection, setActiveSection] = useState<string | null>(null);

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
                </div>

                <div className="min-h-[600px]">
                    {activeSection === 'Questionnaire Data' && <WellnessHub />}
                    {activeSection === 'Medical Reports' && <MedicalReports />}
                    {activeSection === 'Injury Report' && <InjuryReport />}
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
