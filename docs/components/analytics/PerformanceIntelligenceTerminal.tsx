// @ts-nocheck
import React from 'react';
import { BrainIcon, TrendingUpIcon, AlertCircleIcon, ClockIcon, ZapIcon, SearchIcon, LayoutGridIcon, ActivityIcon } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';

export const PerformanceIntelligenceTerminal = ({
    insights = [],
    kpiDefinitions,
    kpiRecords,
    selectedAnalyticsAthleteId,
    subjectAthleteIds,
    analyticsStartDate,
    analyticsEndDate,
    watchedKpiIds,
    setWatchedKpiIds,
    setIsKpiWatchlistModalOpen
}) => {
    const { athleteAssessments } = useAppState();

    const calculateTrend = (curr, prev) => {
        if (!curr || !prev) return null;
        const c = parseFloat(curr);
        const p = parseFloat(prev);
        if (isNaN(c) || isNaN(p) || p === 0) return null;
        return (((c - p) / p) * 100).toFixed(1);
    };

    const athleteAssessmentsFiltered = athleteAssessments.filter(a => a.athlete_id === selectedAnalyticsAthleteId);

    const latest1RM = athleteAssessmentsFiltered.find(a => a.test_type === '1rm');
    const latestDSI = athleteAssessmentsFiltered.find(a => a.test_type === 'dsi');
    const latestRSI = athleteAssessmentsFiltered.find(a => a.test_type === 'rsi');
    const latestNordic = athleteAssessmentsFiltered.find(a => a.test_type === 'nordic' || a.test_type === 'hamstring');

    const prev1RM = athleteAssessmentsFiltered.filter(a => a.test_type === '1rm')[1];
    const prevDSI = athleteAssessmentsFiltered.filter(a => a.test_type === 'dsi')[1];
    const prevRSI = athleteAssessmentsFiltered.filter(a => a.test_type === 'rsi')[1];
    const prevNordic = athleteAssessmentsFiltered.filter(a => a.test_type === 'nordic' || a.test_type === 'hamstring')[1];

    const KPIAssessmentCard = ({ title, label, value, unit, trend, icon }) => (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/[0.07] transition-all group">
            <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                    {icon}
                </div>
                {trend !== null && (
                    <div className={`text-[10px] font-semibold px-2 py-1 rounded-lg ${trend >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        {trend >= 0 ? '+' : ''}{trend}%
                    </div>
                )}
            </div>
            <div className="space-y-1">
                <div className="text-[8px] font-semibold text-indigo-400 uppercase tracking-wide">{title}</div>
                <div className="flex items-baseline gap-1">
                    <div className="text-3xl font-semibold text-white">{value || '--'}</div>
                    <div className="text-xs font-bold text-white/30">{unit}</div>
                </div>
                <div className="text-[10px] font-bold text-white/40 uppercase tracking-tight">{label}</div>
            </div>
        </div>
    );

    return (
        <div className="bg-slate-900 p-12 rounded-xl shadow-2xl relative overflow-hidden border border-indigo-500/20">
            {/* Background Polish */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 blur-[100px] -mr-48 -mt-48 rounded-full"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-400/5 blur-[80px] -ml-32 -mb-32 rounded-full"></div>

            <div className="relative z-10 flex flex-col lg:flex-row gap-12">
                <div className="lg:w-1/3 space-y-8">
                    <div className="inline-flex items-center gap-3 px-4 py-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                        <BrainIcon className="text-indigo-400" size={18} />
                        <span className="text-[10px] font-semibold text-indigo-300 uppercase tracking-[0.2em]">Neural Insight Engine</span>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-5xl font-semibold text-white leading-[0.9] tracking-tighter">
                            PERFORMANCE<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">INTELLIGENCE</span>
                        </h2>
                        <p className="text-indigo-200/60 text-sm font-medium leading-relaxed max-w-sm">
                            Real-time multivariate analysis of biometric load, longitudinal trends, and neuromuscular readiness.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm">
                            <div className="text-[8px] font-semibold text-indigo-400 uppercase mb-1">System Confidence</div>
                            <div className="text-xl font-semibold text-white">98.4%</div>
                        </div>
                        <div className="p-4 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm">
                            <div className="text-[8px] font-semibold text-indigo-400 uppercase mb-1">Active Monitors</div>
                            <div className="text-xl font-semibold text-white">24</div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 space-y-4">
                    {insights.map((insight, idx) => (
                        <div key={idx} className="group p-8 bg-white/5 hover:bg-white/[0.08] transition-all duration-500 rounded-xl border border-white/10 flex items-center gap-8">
                            <div className={`w-16 h-16 rounded-xl flex items-center justify-center shrink-0 shadow-lg ${insight.type === 'risk' ? 'bg-rose-500/20 text-rose-400' :
                                insight.type === 'performance' ? 'bg-emerald-500/20 text-emerald-400' :
                                    'bg-amber-500/20 text-amber-400'
                                }`}>
                                {insight.type === 'risk' ? <AlertCircleIcon size={28} /> :
                                    insight.type === 'performance' ? <TrendingUpIcon size={28} /> :
                                        <ClockIcon size={28} />
                                }
                            </div>

                            <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-semibold uppercase tracking-wide text-indigo-400">{insight.category}</span>
                                    <div className="h-px flex-1 bg-white/10"></div>
                                    <span className="text-[10px] font-semibold text-white/40">{insight.timestamp}</span>
                                </div>
                                <h4 className="text-xl font-semibold text-white uppercase tracking-tight group-hover:text-indigo-300 transition-colors">{insight.title}</h4>
                                <p className="text-xs font-medium text-indigo-200/50 leading-relaxed">{insight.description}</p>
                            </div>

                            <button className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all border border-white/10">
                                <ZapIcon size={18} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* New Assessment Section */}
            <div className="mt-16 space-y-8 border-t border-white/5 pt-16 relative z-10">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-2xl font-semibold text-white uppercase tracking-tight">Strength & Force Assessments</h3>
                        <p className="text-indigo-200/40 text-xs font-medium uppercase tracking-wide mt-1">Longitudinal monitoring of neuromuscular output</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                    <KPIAssessmentCard
                        title="1RM Strength"
                        label={latest1RM?.metrics?.exerciseLabel || 'Max Strength'}
                        value={latest1RM?.metrics?.value}
                        unit="kg"
                        trend={calculateTrend(latest1RM?.metrics?.value, prev1RM?.metrics?.value)}
                        icon={<TrendingUpIcon size={18} />}
                    />
                    <KPIAssessmentCard
                        title="Dynamic Strength Index"
                        label={latestDSI?.metrics?.category || 'Athlete Profile'}
                        value={latestDSI?.metrics?.value}
                        unit=""
                        trend={calculateTrend(latestDSI?.metrics?.value, prevDSI?.metrics?.value)}
                        icon={<ZapIcon size={18} />}
                    />
                    <KPIAssessmentCard
                        title="Reactive Strength"
                        label="Elastic Efficiency"
                        value={latestRSI?.metrics?.value}
                        unit=""
                        trend={calculateTrend(latestRSI?.metrics?.value, prevRSI?.metrics?.value)}
                        icon={<LayoutGridIcon size={18} />}
                    />
                    <KPIAssessmentCard
                        title="Nordic Force"
                        label={latestNordic?.metrics?.riskText || 'Risk Profile'}
                        value={latestNordic?.metrics?.relativeStrength}
                        unit="N/kg"
                        trend={calculateTrend(latestNordic?.metrics?.relativeStrength, prevNordic?.metrics?.relativeStrength)}
                        icon={<SearchIcon size={18} />}
                    />
                </div>
            </div>
        </div>
    );
};
