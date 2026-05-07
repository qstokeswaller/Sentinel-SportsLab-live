// @ts-nocheck
import React, { useState, useMemo, useEffect } from 'react';
import { useAppState } from '../context/AppStateContext';
import {
    CalendarDays, Plus, ArrowLeft, Trash2,
    Users, User, GanttChart, Clock, Filter, X,
    LayoutList, Layers2, BarChart3, Target
} from 'lucide-react';
import { CreatePlanModal } from '../components/periodization/CreatePlanModal';
import { TimelineView } from '../components/periodization/TimelineView';
import { AddPhaseModal } from '../components/periodization/AddPhaseModal';
import { AddBlockModal } from '../components/periodization/AddBlockModal';
import { AddPlanEventModal } from '../components/periodization/AddPlanEventModal';
import { OverviewTab } from '../components/periodization/OverviewTab';
import { PeriodsTab } from '../components/periodization/PeriodsTab';
import { MicrocyclesTab } from '../components/periodization/MicrocyclesTab';
import { formatDateShort } from '../utils/periodizationUtils';
import { CustomSelect } from '../components/ui/CustomSelect';

type TabId = 'overview' | 'timeline' | 'periods' | 'microcycles';

const PLAN_STATUS_STYLES = {
    active:   'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/40',
    draft:    'bg-slate-100 dark:bg-[#1A2D48] text-slate-600 dark:text-[#94A3B8] border-slate-200 dark:border-[#243A58]',
    upcoming: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/40',
    at_risk:  'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/40',
};
const PLAN_STATUS_LABELS = { active: 'Active', draft: 'Draft', upcoming: 'Upcoming', at_risk: 'At Risk' };

const TABS: { id: TabId; label: string; icon: React.FC<any> }[] = [
    { id: 'overview',     label: 'Overview',     icon: Target },
    { id: 'timeline',     label: 'Timeline',     icon: GanttChart },
    { id: 'periods',      label: 'Periods',      icon: LayoutList },
    { id: 'microcycles',  label: 'Microcycles',  icon: BarChart3 },
];

export const PeriodizationPage = () => {
    const {
        periodizationPlans, activePlanId, setActivePlanId,
        setPlanDrillPath,
        isCreatePlanModalOpen, setIsCreatePlanModalOpen,
        setIsPlanPhaseModalOpen, setEditingPlanPhase,
        setIsPlanBlockModalOpenNew, setEditingPlanBlock,
        setIsPlanEventModalOpen, setEditingPlanEvent,
        handleDeletePlan, teams, isLoading,
    } = useAppState();

    const activePlan = periodizationPlans.find(p => p.id === activePlanId);

    // Tab state — reset to overview whenever the active plan changes
    const [activeTab, setActiveTab] = useState<TabId>('overview');
    useEffect(() => { setActiveTab('overview'); }, [activePlanId]);

    // Cross-tab navigation: Periods → Microcycles
    const [microcyclesJump, setMicrocyclesJump] = useState<{ phaseId: string; blockId: string } | null>(null);

    const handleViewInMicrocycles = (phaseId: string, blockId: string) => {
        setMicrocyclesJump({ phaseId, blockId });
        setActiveTab('microcycles');
    };

    // Filter state for plan list
    const [filterType, setFilterType] = useState('all');
    const [filterTargetId, setFilterTargetId] = useState('');

    const allAthletes = useMemo(() =>
        teams.flatMap(t => (t.players || []).map(p => ({ ...p, teamName: t.name }))),
        [teams]
    );

    const getTargetName = (plan) => {
        if (plan.targetType === 'Team') return teams.find(t => t.id === plan.targetId)?.name || 'Unknown Team';
        return allAthletes.find(a => a.id === plan.targetId)?.name || 'Unknown Athlete';
    };

    const filteredPlans = useMemo(() => {
        let plans = periodizationPlans;
        if (filterType === 'team')       plans = plans.filter(p => p.targetType === 'Team');
        else if (filterType === 'individual') plans = plans.filter(p => p.targetType === 'Individual');
        if (filterTargetId) plans = plans.filter(p => p.targetId === filterTargetId);
        return plans;
    }, [periodizationPlans, filterType, filterTargetId]);

    const targetOptions = useMemo(() => {
        const targets = periodizationPlans
            .filter(p => filterType === 'all' || (filterType === 'team' && p.targetType === 'Team') || (filterType === 'individual' && p.targetType === 'Individual'))
            .map(p => ({ id: p.targetId, type: p.targetType, name: getTargetName(p) }));
        const unique = [];
        const seen = new Set();
        for (const t of targets) {
            if (!seen.has(t.id)) { seen.add(t.id); unique.push(t); }
        }
        return unique;
    }, [periodizationPlans, filterType, teams]);

    // ─── PLAN LIST VIEW ──────────────────────────────────────────────
    if (!activePlan) {
        const hasFilters = filterType !== 'all' || filterTargetId;

        return (
            <div className="space-y-4 animate-in fade-in duration-300">
                {/* Header */}
                <div className="flex justify-between items-center bg-white dark:bg-[#132338] px-5 py-4 rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm">
                    <div>
                        <div className="flex items-center gap-2">
                            <CalendarDays size={20} className="text-indigo-500" />
                            <h2 className="text-xl font-bold text-slate-900 dark:text-[#E2E8F0]">The Planner</h2>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-[#94A3B8] mt-0.5 ml-7">Periodization Plans</p>
                    </div>
                    <button onClick={() => setIsCreatePlanModalOpen(true)}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-black transition-all">
                        <Plus size={14} /> New Plan
                    </button>
                </div>

                {/* Filter Bar */}
                {periodizationPlans.length > 0 && (
                    <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm px-4 py-3">
                        <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-1.5 text-slate-400 dark:text-[#64748B]">
                                <Filter size={13} />
                                <span className="text-[10px] font-semibold uppercase tracking-wide">Filter</span>
                            </div>
                            <div className="flex bg-slate-100 dark:bg-[#1A2D48] p-0.5 rounded-lg">
                                {[
                                    { key: 'all', label: 'All', icon: null },
                                    { key: 'team', label: 'Teams', icon: Users },
                                    { key: 'individual', label: 'Athletes', icon: User },
                                ].map(({ key, label, icon: Icon }) => (
                                    <button key={key}
                                        onClick={() => { setFilterType(key); setFilterTargetId(''); }}
                                        className={`px-3 py-1.5 rounded-md text-[10px] font-medium transition-all flex items-center gap-1 ${filterType === key ? 'bg-white dark:bg-[#132338] text-slate-900 dark:text-[#E2E8F0] shadow-sm' : 'text-slate-400 dark:text-[#64748B] hover:text-slate-600'}`}>
                                        {Icon && <Icon size={10} />}
                                        {label}
                                    </button>
                                ))}
                            </div>
                            {targetOptions.length > 0 && (
                                <CustomSelect value={filterTargetId} onChange={e => setFilterTargetId(e.target.value)} variant="filter" size="xs"
                                    placeholder={filterType === 'team' ? 'All Teams' : filterType === 'individual' ? 'All Athletes' : 'All Targets'}>
                                    <option value="">{filterType === 'team' ? 'All Teams' : filterType === 'individual' ? 'All Athletes' : 'All Targets'}</option>
                                    {targetOptions.map(t => <option key={t.id} value={t.id}>{t.type === 'Team' ? '👥' : '👤'} {t.name}</option>)}
                                </CustomSelect>
                            )}
                            {hasFilters && (
                                <button onClick={() => { setFilterType('all'); setFilterTargetId(''); }}
                                    className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-[#64748B] hover:text-red-500 transition-colors ml-1">
                                    <X size={10} /> Clear
                                </button>
                            )}
                            <span className="text-[10px] text-slate-400 dark:text-[#64748B] ml-auto">
                                {filteredPlans.length} of {periodizationPlans.length} plan{periodizationPlans.length !== 1 ? 's' : ''}
                            </span>
                        </div>
                    </div>
                )}

                {/* Plan Cards */}
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-5 space-y-3">
                                <div className="h-4 w-36 bg-slate-100 dark:bg-[#1A2D48] rounded animate-pulse" />
                                <div className="h-3 w-28 bg-slate-50 dark:bg-[#0F1C30] rounded animate-pulse" />
                                <div className="h-3 w-40 bg-slate-50 dark:bg-[#0F1C30] rounded animate-pulse" />
                            </div>
                        ))}
                    </div>
                ) : periodizationPlans.length === 0 ? (
                    <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-12 text-center">
                        <CalendarDays size={40} className="text-slate-300 dark:text-[#475569] mx-auto mb-3" />
                        <h3 className="text-sm font-bold text-slate-600 dark:text-[#CBD5E1] mb-1">No Periodization Plans</h3>
                        <p className="text-xs text-slate-400 dark:text-[#64748B] mb-4">Create your first plan to start designing training periodization for a team or athlete.</p>
                        <button onClick={() => setIsCreatePlanModalOpen(true)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-all">
                            <Plus size={13} /> Create Plan
                        </button>
                    </div>
                ) : filteredPlans.length === 0 ? (
                    <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-8 text-center">
                        <Filter size={28} className="text-slate-300 dark:text-[#475569] mx-auto mb-2" />
                        <h3 className="text-sm font-bold text-slate-600 dark:text-[#CBD5E1] mb-1">No plans match your filter</h3>
                        <p className="text-xs text-slate-400 dark:text-[#64748B] mb-3">Try changing the filter or create a new plan.</p>
                        <button onClick={() => { setFilterType('all'); setFilterTargetId(''); }}
                            className="text-xs text-indigo-600 dark:text-indigo-300 font-semibold hover:underline">Clear filters</button>
                    </div>
                ) : (
                    <div data-tour="planner-main" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredPlans.map(plan => {
                            const statusStyle = PLAN_STATUS_STYLES[plan.status] || PLAN_STATUS_STYLES.draft;
                            const statusLabel = PLAN_STATUS_LABELS[plan.status] || 'Draft';
                            const periodCount = plan.phases.reduce((s, ph) => s + ph.blocks.length, 0);
                            return (
                                <div key={plan.id}
                                    onClick={() => { setActivePlanId(plan.id); setPlanDrillPath([]); }}
                                    className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-5 cursor-pointer hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800/50 transition-all group">
                                    <div className="flex items-start justify-between mb-3">
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-[#E2E8F0] group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors leading-snug pr-2">{plan.name}</h3>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide border whitespace-nowrap ${statusStyle}`}>
                                                {statusLabel}
                                            </span>
                                            <button onClick={(e) => { e.stopPropagation(); handleDeletePlan(plan.id); }}
                                                className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 text-slate-300 dark:text-[#475569] transition-all">
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-[#94A3B8]">
                                            {plan.targetType === 'Team' ? <Users size={11} /> : <User size={11} />}
                                            <span className="font-medium truncate">{getTargetName(plan)}</span>
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full shrink-0 ${plan.targetType === 'Team' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-500 dark:text-blue-400' : 'bg-violet-50 dark:bg-violet-900/20 text-violet-500 dark:text-violet-400'}`}>
                                                {plan.targetType}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-[#64748B]">
                                            <Clock size={11} />
                                            <span>{formatDateShort(plan.startDate)}{plan.endDate ? ` — ${formatDateShort(plan.endDate)}` : ' — Open-ended'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 pt-1">
                                            <span className="text-[10px] text-slate-400 dark:text-[#64748B]">
                                                {plan.phases.length} phase{plan.phases.length !== 1 ? 's' : ''}
                                            </span>
                                            <span className="text-slate-200 dark:text-[#243A58]">·</span>
                                            <span className="text-[10px] text-slate-400 dark:text-[#64748B]">
                                                {periodCount} period{periodCount !== 1 ? 's' : ''}
                                            </span>
                                            {plan.modalities?.length > 0 && (
                                                <>
                                                    <span className="text-slate-200 dark:text-[#243A58]">·</span>
                                                    <span className="text-[10px] text-slate-400 dark:text-[#64748B]">
                                                        <Layers2 size={9} className="inline mr-0.5" />
                                                        {plan.modalities.length}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Add Plan Card */}
                        <div onClick={() => setIsCreatePlanModalOpen(true)}
                            className="bg-white dark:bg-[#132338] rounded-xl border-2 border-dashed border-slate-200 dark:border-[#243A58] p-5 cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-all flex flex-col items-center justify-center min-h-[140px]">
                            <Plus size={20} className="text-slate-300 dark:text-[#475569] mb-2" />
                            <span className="text-xs font-semibold text-slate-400 dark:text-[#64748B]">New Plan</span>
                        </div>
                    </div>
                )}

                <CreatePlanModal />
            </div>
        );
    }

    // ─── ACTIVE PLAN VIEW ────────────────────────────────────────────
    const statusStyle = PLAN_STATUS_STYLES[activePlan.status] || PLAN_STATUS_STYLES.draft;
    const statusLabel = PLAN_STATUS_LABELS[activePlan.status] || 'Draft';

    // Context-sensitive action button per tab
    const renderTabAction = () => {
        if (activeTab === 'timeline') {
            return (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => { setEditingPlanPhase(null); setIsPlanPhaseModalOpen(true); }}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-[#CBD5E1] bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-lg hover:bg-slate-50 dark:hover:bg-[#1A2D48] transition-colors">
                        <Plus size={12} /> Phase
                    </button>
                    <button
                        onClick={() => { setEditingPlanEvent(null); setIsPlanEventModalOpen(true); }}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">
                        <Plus size={12} /> Event
                    </button>
                </div>
            );
        }
        if (activeTab === 'periods') {
            return (
                <button
                    onClick={() => { setEditingPlanBlock(null); setIsPlanBlockModalOpenNew(true); }}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">
                    <Plus size={12} /> Add Period
                </button>
            );
        }
        if (activeTab === 'overview') {
            return (
                <button
                    onClick={() => { setEditingPlanPhase(null); setIsPlanPhaseModalOpen(true); }}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-[#CBD5E1] bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-lg hover:bg-slate-50 dark:hover:bg-[#1A2D48] transition-colors">
                    <Plus size={12} /> Add Phase
                </button>
            );
        }
        return null;
    };

    return (
        <div className="space-y-4 animate-in fade-in duration-300">
            {/* Header */}
            <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm overflow-hidden">
                {/* Top row: back + title + action */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-[#243A58]">
                    <button
                        onClick={() => { setActivePlanId(null); setPlanDrillPath([]); }}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1A2D48] transition-colors shrink-0">
                        <ArrowLeft size={16} className="text-slate-500 dark:text-[#94A3B8]" />
                    </button>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-sm font-bold text-slate-900 dark:text-[#E2E8F0] truncate">{activePlan.name}</h2>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide border whitespace-nowrap ${statusStyle}`}>
                                {statusLabel}
                            </span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                            <span className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-[#64748B]">
                                {activePlan.targetType === 'Team' ? <Users size={9} /> : <User size={9} />}
                                {getTargetName(activePlan)}
                            </span>
                            <span className="text-[10px] text-slate-300 dark:text-[#475569]">·</span>
                            <span className="text-[10px] text-slate-400 dark:text-[#64748B]">
                                {formatDateShort(activePlan.startDate)}{activePlan.endDate ? ` — ${formatDateShort(activePlan.endDate)}` : ' — Open'}
                            </span>
                        </div>
                    </div>
                    <div className="shrink-0">
                        {renderTabAction()}
                    </div>
                </div>

                {/* Tab bar */}
                <div className="flex items-center gap-1 px-5 py-0 overflow-x-auto scrollbar-none">
                    {TABS.map(({ id, label, icon: Icon }) => (
                        <button key={id}
                            onClick={() => setActiveTab(id)}
                            className={`flex items-center gap-1.5 px-3 py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-all ${
                                activeTab === id
                                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                    : 'border-transparent text-slate-400 dark:text-[#64748B] hover:text-slate-600 dark:hover:text-[#94A3B8]'
                            }`}>
                            <Icon size={12} />
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            {isLoading ? (
                <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-16 flex flex-col items-center justify-center">
                    <div className="w-8 h-8 border-2 border-indigo-200 dark:border-indigo-800/50 border-t-indigo-600 rounded-full animate-spin mb-4" />
                    <span className="text-sm font-medium text-slate-500 dark:text-[#94A3B8]">Loading plan...</span>
                </div>
            ) : (
                <>
                    {activeTab === 'overview' && (
                        <OverviewTab plan={activePlan} teams={teams} onSwitchToTab={setActiveTab} />
                    )}
                    {activeTab === 'timeline' && (
                        <TimelineView plan={activePlan} />
                    )}
                    {activeTab === 'periods' && (
                        <PeriodsTab plan={activePlan} onViewInMicrocycles={handleViewInMicrocycles} />
                    )}
                    {activeTab === 'microcycles' && (
                        <MicrocyclesTab
                            plan={activePlan}
                            initialPhaseId={microcyclesJump?.phaseId}
                            initialBlockId={microcyclesJump?.blockId}
                        />
                    )}
                </>
            )}

            {/* Modals */}
            <CreatePlanModal />
            <AddPhaseModal />
            <AddBlockModal />
            <AddPlanEventModal />
        </div>
    );
};
