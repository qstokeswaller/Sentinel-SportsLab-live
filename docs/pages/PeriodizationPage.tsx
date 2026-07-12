// @ts-nocheck
import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppState } from '../context/AppStateContext';
import {
    CalendarDays, Plus, ArrowLeft, Trash2,
    Users, User, GanttChart, Clock, Filter, X,
    LayoutList, Layers2, BarChart3, Target, Crosshair
} from 'lucide-react';
import { CreatePlanModal } from '../components/periodization/CreatePlanModal';
import { TimelineView } from '../components/periodization/TimelineView';
import { AddPhaseModal } from '../components/periodization/AddPhaseModal';
import { AddBlockModal } from '../components/periodization/AddBlockModal';
import { AddPlanEventModal } from '../components/periodization/AddPlanEventModal';
import { OverviewTab } from '../components/periodization/OverviewTab';
import { PeriodsTab } from '../components/periodization/PeriodsTab';
import { BlocksTab } from '../components/periodization/BlocksTab';
import { MicrocyclesTab } from '../components/periodization/MicrocyclesTab';
import { TargetsTab } from '../components/periodization/TargetsTab';
import { AddTargetModal } from '../components/periodization/AddTargetModal';
import { formatDateShort } from '../utils/periodizationUtils';
import { CustomSelect } from '../components/ui/CustomSelect';
import { SkCard, SkBlock, SkText, SkListCards } from '../components/ui/Skeleton';

type TabId = 'overview' | 'timeline' | 'periods' | 'blocks' | 'microcycles' | 'targets';

const PLAN_STATUS_STYLES = {
    active:   'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/40',
    draft:    'bg-slate-100 dark:bg-[#1A2D48] text-slate-600 dark:text-[#CBD5E1] border-slate-200 dark:border-[#243A58]',
    upcoming: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/40',
    at_risk:  'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/40',
};
const PLAN_STATUS_LABELS = { active: 'Active', draft: 'Draft', upcoming: 'Upcoming', at_risk: 'At Risk' };

const TABS: { id: TabId; label: string; icon: React.FC<any> }[] = [
    { id: 'overview',    label: 'Overview',    icon: Target },
    { id: 'timeline',   label: 'Timeline',    icon: GanttChart },
    { id: 'periods',    label: 'Phases',      icon: LayoutList },
    { id: 'blocks',     label: 'Blocks',      icon: Layers2 },
    { id: 'microcycles',label: 'Microcycles', icon: BarChart3 },
    { id: 'targets',    label: 'Targets',     icon: Crosshair },
];

export const PeriodizationPage = () => {
    const location = useLocation();
    const {
        periodizationPlans, activePlanId, setActivePlanId,
        setPlanDrillPath,
        isCreatePlanModalOpen, setIsCreatePlanModalOpen,
        setIsPlanPhaseModalOpen, setEditingPlanPhase,
        setIsPlanBlockModalOpenNew, setEditingPlanBlock,
        setIsPlanEventModalOpen, setEditingPlanEvent,
        setIsPlanTargetModalOpen, setEditingPlanTarget,
        handleDeletePlan, teams, isLoading,
        isSecondaryLoading,
    } = useAppState();

    const activePlan = periodizationPlans.find(p => p.id === activePlanId);

    // Tab state — reset to overview whenever the active plan changes
    const [activeTab, setActiveTab] = useState<TabId>('overview');
    useEffect(() => { setActiveTab('overview'); }, [activePlanId]);

    // Cross-tab navigation: Periods → Microcycles, and return from WorkoutPackets
    const [microcyclesJump, setMicrocyclesJump] = useState<{ phaseId: string; blockId: string; weekStart?: string; selectedDate?: string } | null>(null);

    const handleViewInMicrocycles = (phaseId: string, blockId: string) => {
        setMicrocyclesJump({ phaseId, blockId });
        setActiveTab('microcycles');
    };

    // On mount: check if returning from WorkoutPackets with a specific week/day to reopen
    useEffect(() => {
        const ret = (location.state as any)?.returnToMicrocycles;
        if (ret) {
            setActiveTab('microcycles');
            setMicrocyclesJump({ phaseId: ret.phaseId, blockId: ret.blockId, weekStart: ret.weekStart, selectedDate: ret.selectedDate });
            window.history.replaceState({}, document.title);
        }
    }, []);

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

    // ─── SKELETON (Phase 2): plans are background-tier data — mirror the real
    // layout (header card + filter bar + plan cards) while they load ───────
    if (isSecondaryLoading && periodizationPlans.length === 0 && !activePlan) {
        return (
            <div className="space-y-4">
                <SkCard className="flex items-center justify-between px-5 py-4">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <SkBlock className="w-5 h-5 rounded" />
                            <SkBlock className="h-6 w-32" />
                        </div>
                        <SkText w="w-40" className="ml-7 h-2.5" />
                    </div>
                    <SkBlock className="h-10 w-28 rounded-lg" />
                </SkCard>
                <SkCard className="px-4 py-3">
                    <div className="flex items-center gap-3">
                        <SkText w="w-12" className="h-2.5" />
                        <SkBlock className="h-8 w-44 rounded-lg" />
                        <SkBlock className="h-8 w-36 rounded-lg" />
                    </div>
                </SkCard>
                <SkListCards count={3} />
            </div>
        );
    }

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
                        <p className="text-sm text-slate-500 dark:text-[#CBD5E1] mt-0.5 ml-7">Periodization Plans</p>
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
                            <div className="flex items-center gap-1.5 text-slate-400 dark:text-[#CBD5E1]">
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
                                        className={`px-3 py-1.5 rounded-md text-[10px] font-medium transition-all flex items-center gap-1 ${filterType === key ? 'bg-white dark:bg-[#132338] text-slate-900 dark:text-[#E2E8F0] shadow-sm' : 'text-slate-400 dark:text-[#CBD5E1] hover:text-slate-600'}`}>
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
                                    className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-[#CBD5E1] hover:text-red-500 transition-colors ml-1">
                                    <X size={10} /> Clear
                                </button>
                            )}
                            <span className="text-[10px] text-slate-400 dark:text-[#CBD5E1] ml-auto">
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
                        <p className="text-xs text-slate-400 dark:text-[#CBD5E1] mb-4">Create your first plan to start designing training periodization for a team or athlete.</p>
                        <button onClick={() => setIsCreatePlanModalOpen(true)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-500 transition-all">
                            <Plus size={13} /> Create Plan
                        </button>
                    </div>
                ) : filteredPlans.length === 0 ? (
                    <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-8 text-center">
                        <Filter size={28} className="text-slate-300 dark:text-[#475569] mx-auto mb-2" />
                        <h3 className="text-sm font-bold text-slate-600 dark:text-[#CBD5E1] mb-1">No plans match your filter</h3>
                        <p className="text-xs text-slate-400 dark:text-[#CBD5E1] mb-3">Try changing the filter or create a new plan.</p>
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
                                    className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-5 cursor-pointer hover:shadow-md hover:border-indigo-200 dark:border-indigo-800/50 transition-all group">
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
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-[#CBD5E1]">
                                            {plan.targetType === 'Team' ? <Users size={11} /> : <User size={11} />}
                                            <span className="font-medium truncate">{getTargetName(plan)}</span>
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full border shrink-0 ${plan.targetType === 'Team' ? 'bg-sky-50 dark:bg-sky-500/15 border-sky-200 dark:border-sky-500/30 text-sky-600 dark:text-sky-400' : 'bg-violet-50 dark:bg-violet-500/15 border-violet-200 dark:border-violet-500/30 text-violet-600 dark:text-violet-400'}`}>
                                                {plan.targetType}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-[#CBD5E1]">
                                            <Clock size={11} />
                                            <span>{formatDateShort(plan.startDate)}{plan.endDate ? ` — ${formatDateShort(plan.endDate)}` : ' — Open-ended'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 pt-1">
                                            <span className="text-[10px] text-slate-400 dark:text-[#CBD5E1]">
                                                {plan.phases.length} phase{plan.phases.length !== 1 ? 's' : ''}
                                            </span>
                                            <span className="text-slate-200 dark:text-[#243A58]">·</span>
                                            <span className="text-[10px] text-slate-400 dark:text-[#CBD5E1]">
                                                {periodCount} block{periodCount !== 1 ? 's' : ''}
                                            </span>
                                            {plan.modalities?.length > 0 && (
                                                <>
                                                    <span className="text-slate-200 dark:text-[#243A58]">·</span>
                                                    <span className="text-[10px] text-slate-400 dark:text-[#CBD5E1]">
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
                            <span className="text-xs font-semibold text-slate-400 dark:text-[#CBD5E1]">New Plan</span>
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
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors">
                        <Plus size={12} /> Event
                    </button>
                </div>
            );
        }
        if (activeTab === 'periods') {
            return (
                <button
                    onClick={() => { setEditingPlanPhase(null); setIsPlanPhaseModalOpen(true); }}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors">
                    <Plus size={12} /> Add Phase
                </button>
            );
        }
        if (activeTab === 'blocks') {
            return (
                <button
                    onClick={() => { setEditingPlanBlock(null); setIsPlanBlockModalOpenNew(true); }}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors">
                    <Plus size={12} /> Add Block
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
        if (activeTab === 'targets') {
            return (
                <button
                    onClick={() => { setEditingPlanTarget(null); setIsPlanTargetModalOpen(true); }}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors">
                    <Plus size={12} /> Add Target
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
                        <ArrowLeft size={16} className="text-slate-500 dark:text-[#CBD5E1]" />
                    </button>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-sm font-bold text-slate-900 dark:text-[#E2E8F0] truncate">{activePlan.name}</h2>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide border whitespace-nowrap ${statusStyle}`}>
                                {statusLabel}
                            </span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                            <span className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-[#CBD5E1]">
                                {activePlan.targetType === 'Team' ? <Users size={9} /> : <User size={9} />}
                                {getTargetName(activePlan)}
                            </span>
                            <span className="text-[10px] text-slate-300 dark:text-[#475569]">·</span>
                            <span className="text-[10px] text-slate-400 dark:text-[#CBD5E1]">
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
                                    : 'border-transparent text-slate-400 dark:text-[#CBD5E1] hover:text-slate-600 dark:hover:text-[#94A3B8]'
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
                    <span className="text-sm font-medium text-slate-500 dark:text-[#CBD5E1]">Loading plan...</span>
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
                    {activeTab === 'blocks' && (
                        <BlocksTab plan={activePlan} />
                    )}
                    {activeTab === 'microcycles' && (
                        <MicrocyclesTab
                            plan={activePlan}
                            initialPhaseId={microcyclesJump?.phaseId}
                            initialBlockId={microcyclesJump?.blockId}
                            initialWeekStart={microcyclesJump?.weekStart}
                            initialSelectedDate={microcyclesJump?.selectedDate}
                        />
                    )}
                    {activeTab === 'targets' && (
                        <TargetsTab plan={activePlan} />
                    )}
                </>
            )}

            {/* Modals */}
            <CreatePlanModal />
            <AddPhaseModal />
            <AddBlockModal />
            <AddPlanEventModal />
            <AddTargetModal />
        </div>
    );
};
