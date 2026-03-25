// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { useAppState } from '../context/AppStateContext';
import {
    CalendarDays, Plus, ChevronRight, ArrowLeft, Trash2,
    Users, User, GanttChart, LayoutGrid, Clock, Filter, X
} from 'lucide-react';
import { CreatePlanModal } from '../components/periodization/CreatePlanModal';
import { TimelineView } from '../components/periodization/TimelineView';
import { CardView } from '../components/periodization/CardView';
import { AddPhaseModal } from '../components/periodization/AddPhaseModal';
import { AddBlockModal } from '../components/periodization/AddBlockModal';
import { AddPlanEventModal } from '../components/periodization/AddPlanEventModal';
import { formatDateShort } from '../utils/periodizationUtils';

export const PeriodizationPage = () => {
    const {
        periodizationPlans, activePlanId, setActivePlanId,
        planDrillPath, setPlanDrillPath,
        isCreatePlanModalOpen, setIsCreatePlanModalOpen,
        handleDeletePlan, handleUpdatePlan, teams,
    } = useAppState();

    const activePlan = periodizationPlans.find(p => p.id === activePlanId);

    // Filter state for plan list
    const [filterType, setFilterType] = useState('all'); // 'all' | 'team' | 'individual'
    const [filterTargetId, setFilterTargetId] = useState('');

    const allAthletes = useMemo(() =>
        teams.flatMap(t => (t.players || []).map(p => ({ ...p, teamName: t.name }))),
        [teams]
    );

    // Resolve target name
    const getTargetName = (plan) => {
        if (plan.targetType === 'Team') {
            const team = teams.find(t => t.id === plan.targetId);
            return team?.name || 'Unknown Team';
        }
        const athlete = allAthletes.find(a => a.id === plan.targetId);
        return athlete?.name || 'Unknown Athlete';
    };

    // Filtered plans
    const filteredPlans = useMemo(() => {
        let plans = periodizationPlans;
        if (filterType === 'team') {
            plans = plans.filter(p => p.targetType === 'Team');
        } else if (filterType === 'individual') {
            plans = plans.filter(p => p.targetType === 'Individual');
        }
        if (filterTargetId) {
            plans = plans.filter(p => p.targetId === filterTargetId);
        }
        return plans;
    }, [periodizationPlans, filterType, filterTargetId]);

    // Unique targets for filter dropdown
    const targetOptions = useMemo(() => {
        const targets = periodizationPlans
            .filter(p => filterType === 'all' || (filterType === 'team' && p.targetType === 'Team') || (filterType === 'individual' && p.targetType === 'Individual'))
            .map(p => ({ id: p.targetId, type: p.targetType, name: getTargetName(p) }));
        const unique = [];
        const seen = new Set();
        for (const t of targets) {
            if (!seen.has(t.id)) {
                seen.add(t.id);
                unique.push(t);
            }
        }
        return unique;
    }, [periodizationPlans, filterType, teams]);

    // Breadcrumb segments from drill path
    const getBreadcrumbs = () => {
        if (!activePlan) return [];
        const crumbs = [{ label: activePlan.name, path: [] }];
        if (planDrillPath.length >= 1) {
            const phase = activePlan.phases.find(p => p.id === planDrillPath[0]);
            if (phase) crumbs.push({ label: phase.name, path: [planDrillPath[0]] });
        }
        if (planDrillPath.length >= 2) {
            const phase = activePlan.phases.find(p => p.id === planDrillPath[0]);
            const block = phase?.blocks.find(b => b.id === planDrillPath[1]);
            if (block) crumbs.push({ label: `${block.name}: ${block.label}`, path: [planDrillPath[0], planDrillPath[1]] });
        }
        if (planDrillPath.length >= 3) {
            crumbs.push({ label: `Week ${planDrillPath[2]}`, path: [...planDrillPath] });
        }
        return crumbs;
    };

    // ─── PLAN LIST VIEW ──────────────────────────────────────────────
    if (!activePlan) {
        const hasFilters = filterType !== 'all' || filterTargetId;

        return (
            <div className="space-y-4 animate-in fade-in duration-300">
                {/* Header */}
                <div className="flex justify-between items-center bg-white px-5 py-4 rounded-xl border border-slate-200 shadow-sm">
                    <div>
                        <div className="flex items-center gap-2">
                            <CalendarDays size={20} className="text-indigo-500" />
                            <h2 className="text-xl font-bold text-slate-900">The Planner</h2>
                        </div>
                        <p className="text-sm text-slate-500 mt-0.5 ml-7">Periodization Plans</p>
                    </div>
                    <button onClick={() => setIsCreatePlanModalOpen(true)}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-black transition-all">
                        <Plus size={14} /> New Plan
                    </button>
                </div>

                {/* Filter Bar */}
                {periodizationPlans.length > 0 && (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3">
                        <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-1.5 text-slate-400">
                                <Filter size={13} />
                                <span className="text-[10px] font-semibold uppercase tracking-wide">Filter</span>
                            </div>

                            {/* Type toggle */}
                            <div className="flex bg-slate-100 p-0.5 rounded-lg">
                                {[
                                    { key: 'all', label: 'All', icon: null },
                                    { key: 'team', label: 'Teams', icon: Users },
                                    { key: 'individual', label: 'Athletes', icon: User },
                                ].map(({ key, label, icon: Icon }) => (
                                    <button key={key}
                                        onClick={() => { setFilterType(key); setFilterTargetId(''); }}
                                        className={`px-3 py-1.5 rounded-md text-[10px] font-medium transition-all flex items-center gap-1 ${filterType === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                                        {Icon && <Icon size={10} />}
                                        {label}
                                    </button>
                                ))}
                            </div>

                            {/* Target dropdown */}
                            {targetOptions.length > 0 && (
                                <select
                                    className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={filterTargetId}
                                    onChange={e => setFilterTargetId(e.target.value)}>
                                    <option value="">
                                        {filterType === 'team' ? 'All Teams' : filterType === 'individual' ? 'All Athletes' : 'All Targets'}
                                    </option>
                                    {targetOptions.map(t => (
                                        <option key={t.id} value={t.id}>
                                            {t.type === 'Team' ? '👥' : '👤'} {t.name}
                                        </option>
                                    ))}
                                </select>
                            )}

                            {/* Clear filters */}
                            {hasFilters && (
                                <button onClick={() => { setFilterType('all'); setFilterTargetId(''); }}
                                    className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-red-500 transition-colors ml-1">
                                    <X size={10} /> Clear
                                </button>
                            )}

                            {/* Count */}
                            <span className="text-[10px] text-slate-400 ml-auto">
                                {filteredPlans.length} of {periodizationPlans.length} plan{periodizationPlans.length !== 1 ? 's' : ''}
                            </span>
                        </div>
                    </div>
                )}

                {/* Plan Cards */}
                {periodizationPlans.length === 0 ? (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
                        <CalendarDays size={40} className="text-slate-300 mx-auto mb-3" />
                        <h3 className="text-sm font-bold text-slate-600 mb-1">No Periodization Plans</h3>
                        <p className="text-xs text-slate-400 mb-4">Create your first plan to start designing training periodization for a team or athlete.</p>
                        <button onClick={() => setIsCreatePlanModalOpen(true)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-all">
                            <Plus size={13} /> Create Plan
                        </button>
                    </div>
                ) : filteredPlans.length === 0 ? (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
                        <Filter size={28} className="text-slate-300 mx-auto mb-2" />
                        <h3 className="text-sm font-bold text-slate-600 mb-1">No plans match your filter</h3>
                        <p className="text-xs text-slate-400 mb-3">Try changing the filter or create a new plan.</p>
                        <button onClick={() => { setFilterType('all'); setFilterTargetId(''); }}
                            className="text-xs text-indigo-600 font-semibold hover:underline">
                            Clear filters
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredPlans.map(plan => (
                            <div key={plan.id}
                                onClick={() => { setActivePlanId(plan.id); setPlanDrillPath([]); }}
                                className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 cursor-pointer hover:shadow-md hover:border-indigo-200 transition-all group">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        {plan.viewMode === 'timeline'
                                            ? <GanttChart size={16} className="text-indigo-500" />
                                            : <LayoutGrid size={16} className="text-violet-500" />
                                        }
                                        <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{plan.name}</h3>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); handleDeletePlan(plan.id); }}
                                        className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 text-slate-300 transition-all">
                                        <Trash2 size={12} />
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                        {plan.targetType === 'Team' ? <Users size={11} /> : <User size={11} />}
                                        <span className="font-medium">{getTargetName(plan)}</span>
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${plan.targetType === 'Team' ? 'bg-blue-50 text-blue-500' : 'bg-violet-50 text-violet-500'}`}>
                                            {plan.targetType}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                        <Clock size={11} />
                                        <span>
                                            {formatDateShort(plan.startDate)}
                                            {plan.endDate ? ` — ${formatDateShort(plan.endDate)}` : ' — Open-ended'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${plan.viewMode === 'timeline' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-violet-50 text-violet-600 border-violet-100'}`}>
                                            {plan.viewMode === 'timeline' ? 'Timeline' : 'Cards'}
                                        </span>
                                        <span className="text-[10px] text-slate-400">
                                            {plan.phases.length} phase{plan.phases.length !== 1 ? 's' : ''}
                                        </span>
                                        <span className="text-[10px] text-slate-400">
                                            {plan.phases.reduce((sum, ph) => sum + ph.blocks.length, 0)} block{plan.phases.reduce((sum, ph) => sum + ph.blocks.length, 0) !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Add Plan Card */}
                        <div onClick={() => setIsCreatePlanModalOpen(true)}
                            className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-5 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-all flex flex-col items-center justify-center min-h-[140px]">
                            <Plus size={20} className="text-slate-300 mb-2" />
                            <span className="text-xs font-semibold text-slate-400">New Plan</span>
                        </div>
                    </div>
                )}

                <CreatePlanModal />
            </div>
        );
    }

    // ─── ACTIVE PLAN VIEW ────────────────────────────────────────────
    const breadcrumbs = getBreadcrumbs();

    return (
        <div className="space-y-4 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex justify-between items-center bg-white px-5 py-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 min-w-0">
                    <button onClick={() => { setActivePlanId(null); setPlanDrillPath([]); }}
                        className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors shrink-0">
                        <ArrowLeft size={16} className="text-slate-500" />
                    </button>
                    <div className="min-w-0">
                        {/* Breadcrumb */}
                        <div className="flex items-center gap-1 flex-wrap">
                            {breadcrumbs.map((crumb, i) => (
                                <React.Fragment key={i}>
                                    {i > 0 && <ChevronRight size={10} className="text-slate-300 shrink-0" />}
                                    <button
                                        onClick={() => setPlanDrillPath(crumb.path)}
                                        className={`text-xs font-medium transition-colors truncate max-w-[150px] ${i === breadcrumbs.length - 1 ? 'text-slate-900 font-bold' : 'text-slate-400 hover:text-indigo-600'}`}>
                                        {crumb.label}
                                    </button>
                                </React.Fragment>
                            ))}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-slate-400">
                                {activePlan.targetType === 'Team' ? <Users size={9} className="inline mr-1" /> : <User size={9} className="inline mr-1" />}
                                {getTargetName(activePlan)}
                            </span>
                            <span className="text-[10px] text-slate-300">|</span>
                            <span className="text-[10px] text-slate-400">
                                {formatDateShort(activePlan.startDate)}{activePlan.endDate ? ` — ${formatDateShort(activePlan.endDate)}` : ' — Open'}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex bg-slate-100 p-0.5 rounded-lg">
                        {[{ mode: 'timeline', icon: GanttChart, label: 'Timeline' }, { mode: 'cards', icon: LayoutGrid, label: 'Cards' }].map(({ mode, icon: Icon, label }) => (
                            <button key={mode} onClick={() => handleUpdatePlan(activePlan.id, { viewMode: mode })}
                                className={`px-2.5 py-1.5 rounded-md text-[10px] font-medium transition-all flex items-center gap-1 ${activePlan.viewMode === mode ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                                <Icon size={11} />
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* View Router */}
            {activePlan.viewMode === 'timeline'
                ? <TimelineView plan={activePlan} />
                : <CardView plan={activePlan} />
            }

            {/* Modals */}
            <CreatePlanModal />
            <AddPhaseModal />
            <AddBlockModal />
            <AddPlanEventModal />
        </div>
    );
};
