// 2026-07-12). Typing is Phase 5 work; this step is pure movement.
// All periodization-plan CRUD handlers (plans, phases, blocks, weeks, sessions,
// targets, events). State stays in the provider; this hook receives it as deps
// and returns the handlers — the context API is unchanged.
import { shiftPlanDates } from '../../utils/periodizationUtils';

export const usePlanHandlers = ({
    _uid,
    activePlanId,
    periodizationPlans,
    savePlans,
    setActivePlanId,
    setEditingPlanBlock,
    setEditingPlanEvent,
    setEditingPlanPhase,
    setEditingPlanTarget,
    setIsCreatePlanModalOpen,
    setIsPlanBlockModalOpenNew,
    setIsPlanEventModalOpen,
    setIsPlanPhaseModalOpen,
    setIsPlanTargetModalOpen,
    setPlanDrillPath,
}: any) => {
    const handleCreatePlan = async (planData) => {
        const plan = {
            id: _uid(),
            name: planData.name || 'Untitled Plan',
            targetType: planData.targetType || 'Team',
            targetId: planData.targetId || '',
            startDate: planData.startDate || new Date().toISOString().split('T')[0],
            endDate: planData.endDate || undefined,
            status: planData.status || 'draft',
            viewMode: planData.viewMode || 'timeline',
            modalities: planData.modalities || ['Strength', 'Plyometrics', 'Speed', 'Conditioning', 'Loaded Power'],
            phases: [],
            events: [],
            volumeOverrides: {},
            intensityOverrides: {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        const updated = [...periodizationPlans, plan];
        await savePlans(updated);
        setActivePlanId(plan.id);
        setPlanDrillPath([]);
        setIsCreatePlanModalOpen(false);
        return plan;
    };

    const handleUpdatePlan = async (planId, updates) => {
        const updated = periodizationPlans.map(p =>
            p.id === planId ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
        );
        await savePlans(updated);
    };

    // Shift the whole plan — and every phase/block/week/session/event — by N days.
    const handleShiftPlan = async (planId, days) => {
        if (!days) return;
        const updated = periodizationPlans.map(p =>
            p.id === planId ? { ...shiftPlanDates(p, days), updatedAt: new Date().toISOString() } : p
        );
        await savePlans(updated);
    };

    const handleDeletePlan = async (planId) => {
        const updated = periodizationPlans.filter(p => p.id !== planId);
        await savePlans(updated);
        if (activePlanId === planId) {
            setActivePlanId(null);
            setPlanDrillPath([]);
        }
    };

    const _updateActivePlan = async (updater) => {
        const updated = periodizationPlans.map(p => {
            if (p.id !== activePlanId) return p;
            return { ...updater(p), updatedAt: new Date().toISOString() };
        });
        await savePlans(updated);
    };

    const handleAddPlanPhase = async (phaseData) => {
        const focuses = phaseData.focuses?.length ? phaseData.focuses : [phaseData.trainingPhase || 'General Preparation'];
        const phase = {
            id: _uid(),
            name: phaseData.name || 'New Phase',
            startDate: phaseData.startDate,
            endDate: phaseData.endDate,
            color: phaseData.color || '#6366f1',
            trainingPhase: focuses[0] || 'General Preparation',
            focuses,
            goals: phaseData.goals || '',
            notes: phaseData.notes || '',
            blocks: [],
        };
        await _updateActivePlan(p => ({ ...p, phases: [...p.phases, phase] }));
        setIsPlanPhaseModalOpen(false);
        setEditingPlanPhase(null);
    };

    const handleUpdatePlanPhase = async (phaseId, updates) => {
        await _updateActivePlan(p => ({
            ...p,
            phases: p.phases.map(ph => ph.id === phaseId ? { ...ph, ...updates } : ph)
        }));
        setIsPlanPhaseModalOpen(false);
        setEditingPlanPhase(null);
    };

    const handleDeletePlanPhase = async (phaseId) => {
        await _updateActivePlan(p => ({
            ...p,
            phases: p.phases.filter(ph => ph.id !== phaseId)
        }));
        setIsPlanPhaseModalOpen(false);
        setEditingPlanPhase(null);
    };

    const handleAddPlanBlock = async (phaseId, blockData) => {
        const startDate = new Date(blockData.startDate);
        const msPerWeek = 7 * 24 * 60 * 60 * 1000;
        const weekCount = blockData.endDate
            ? Math.max(1, Math.ceil((new Date(blockData.endDate).getTime() - startDate.getTime()) / msPerWeek))
            : 1;
        const weeks = Array.from({ length: weekCount }, (_, i) => {
            const wStart = new Date(startDate.getTime() + i * msPerWeek);
            return {
                id: _uid(),
                weekNumber: i + 1,
                startDate: wStart.toISOString().split('T')[0],
                intent: '',
                sessions: [],
            };
        });
        const block = {
            id: _uid(),
            name: blockData.name || 'New Period',
            label: blockData.label || '',
            intensityLevel: blockData.intensityLevel || 'Moderate',
            volumeLevel: blockData.volumeLevel || 'Moderate',
            startDate: blockData.startDate,
            endDate: blockData.endDate,
            color: blockData.color || '#8b5cf6',
            blockType: blockData.blockType || 'General',
            goals: blockData.goals || '',
            modalities: blockData.modalities || {},
            weeks,
        };
        await _updateActivePlan(p => ({
            ...p,
            phases: p.phases.map(ph => ph.id === phaseId
                ? { ...ph, blocks: [...ph.blocks, block] }
                : ph
            )
        }));
        setIsPlanBlockModalOpenNew(false);
        setEditingPlanBlock(null);
    };

    const handleUpdatePlanBlock = async (phaseId, blockId, updates) => {
        await _updateActivePlan(p => ({
            ...p,
            phases: p.phases.map(ph => ph.id === phaseId
                ? { ...ph, blocks: ph.blocks.map(b => b.id === blockId ? { ...b, ...updates } : b) }
                : ph
            )
        }));
        setIsPlanBlockModalOpenNew(false);
        setEditingPlanBlock(null);
    };

    const handleDeletePlanBlock = async (phaseId, blockId) => {
        await _updateActivePlan(p => ({
            ...p,
            phases: p.phases.map(ph => ph.id === phaseId
                ? { ...ph, blocks: ph.blocks.filter(b => b.id !== blockId) }
                : ph
            )
        }));
        setIsPlanBlockModalOpenNew(false);
        setEditingPlanBlock(null);
    };

    const handleAddPlanTarget = async (targetData) => {
        const target = { id: _uid(), ...targetData };
        await _updateActivePlan(p => ({ ...p, targets: [...(p.targets || []), target] }));
        setIsPlanTargetModalOpen(false);
        setEditingPlanTarget(null);
    };

    const handleUpdatePlanTarget = async (targetId, updates) => {
        await _updateActivePlan(p => ({
            ...p,
            targets: (p.targets || []).map(t => t.id === targetId ? { ...t, ...updates } : t),
        }));
        setIsPlanTargetModalOpen(false);
        setEditingPlanTarget(null);
    };

    const handleDeletePlanTarget = async (targetId) => {
        await _updateActivePlan(p => ({
            ...p,
            targets: (p.targets || []).filter(t => t.id !== targetId),
        }));
    };

    const handleUpdateBlockModality = async (phaseId, blockId, modality, value) => {
        await _updateActivePlan(p => ({
            ...p,
            phases: p.phases.map(ph => ph.id === phaseId
                ? {
                    ...ph, blocks: ph.blocks.map(b => b.id === blockId
                        ? { ...b, modalities: { ...b.modalities, [modality]: value } }
                        : b
                    )
                }
                : ph
            )
        }));
    };

    const handleUpdatePlanWeek = async (phaseId, blockId, weekId, updates) => {
        await _updateActivePlan(p => ({
            ...p,
            phases: p.phases.map(ph => ph.id === phaseId
                ? {
                    ...ph, blocks: ph.blocks.map(b => b.id === blockId
                        ? { ...b, weeks: b.weeks.map(w => w.id === weekId ? { ...w, ...updates } : w) }
                        : b
                    )
                }
                : ph
            )
        }));
    };

    const handleAddPlanWeek = async (phaseId, blockId) => {
        await _updateActivePlan(p => ({
            ...p,
            phases: p.phases.map(ph => ph.id === phaseId
                ? {
                    ...ph, blocks: ph.blocks.map(b => {
                        if (b.id !== blockId) return b;
                        const lastWeek = b.weeks[b.weeks.length - 1];
                        const nextStart = lastWeek
                            ? new Date(new Date(lastWeek.startDate).getTime() + 7 * 86400000).toISOString().split('T')[0]
                            : b.startDate;
                        const newWeek = {
                            id: _uid(),
                            weekNumber: (lastWeek?.weekNumber || 0) + 1,
                            startDate: nextStart,
                            intent: '',
                            sessions: [],
                        };
                        return { ...b, weeks: [...b.weeks, newWeek] };
                    })
                }
                : ph
            )
        }));
    };

    // Creates a week at weekStartDate if it doesn't exist, then adds the session
    const handleAddSessionWithWeek = async (phaseId, blockId, weekStartDate, sessionData) => {
        const session = {
            id: _uid(),
            date: sessionData.date,
            name: sessionData.name || 'New Session',
            sections: [],
            plannedDuration: sessionData.plannedDuration || null,
            plannedRPE: null,
            load: sessionData.load || null,
            modality: sessionData.modality || null,
            workoutTemplateId: null,
            notes: '',
        };
        await _updateActivePlan(p => ({
            ...p,
            phases: p.phases.map(ph => ph.id === phaseId
                ? {
                    ...ph, blocks: ph.blocks.map(b => {
                        if (b.id !== blockId) return b;
                        const existing = b.weeks.find(w => w.startDate === weekStartDate);
                        if (existing) {
                            return { ...b, weeks: b.weeks.map(w => w.id === existing.id ? { ...w, sessions: [...w.sessions, session] } : w) };
                        }
                        const newWeek = { id: _uid(), weekNumber: 0, startDate: weekStartDate, intent: '', sessions: [session] };
                        const sorted = [...b.weeks, newWeek].sort((a, z) => a.startDate.localeCompare(z.startDate));
                        return { ...b, weeks: sorted.map((w, i) => ({ ...w, weekNumber: i + 1 })) };
                    })
                }
                : ph
            )
        }));
    };

    const handleAddPlanSession = async (phaseId, blockId, weekId, sessionData) => {
        const session = {
            id: _uid(),
            date: sessionData.date,
            name: sessionData.name || 'New Session',
            sections: sessionData.sections || [],
            plannedDuration: sessionData.plannedDuration || null,
            plannedRPE: sessionData.plannedRPE || null,
            load: sessionData.load || null,
            modality: sessionData.modality || null,
            workoutTemplateId: sessionData.workoutTemplateId || null,
            notes: sessionData.notes || '',
        };
        await _updateActivePlan(p => ({
            ...p,
            phases: p.phases.map(ph => ph.id === phaseId
                ? {
                    ...ph, blocks: ph.blocks.map(b => b.id === blockId
                        ? { ...b, weeks: b.weeks.map(w => w.id === weekId ? { ...w, sessions: [...w.sessions, session] } : w) }
                        : b
                    )
                }
                : ph
            )
        }));
    };

    const handleUpdatePlanSession = async (phaseId, blockId, weekId, sessionId, updates) => {
        await _updateActivePlan(p => ({
            ...p,
            phases: p.phases.map(ph => ph.id === phaseId
                ? {
                    ...ph, blocks: ph.blocks.map(b => b.id === blockId
                        ? { ...b, weeks: b.weeks.map(w => w.id === weekId
                            ? { ...w, sessions: w.sessions.map(s => s.id === sessionId ? { ...s, ...updates } : s) }
                            : w
                        ) }
                        : b
                    )
                }
                : ph
            )
        }));
    };

    const handleDeletePlanSession = async (phaseId, blockId, weekId, sessionId) => {
        await _updateActivePlan(p => ({
            ...p,
            phases: p.phases.map(ph => ph.id === phaseId
                ? {
                    ...ph, blocks: ph.blocks.map(b => b.id === blockId
                        ? { ...b, weeks: b.weeks.map(w => w.id === weekId
                            ? { ...w, sessions: w.sessions.filter(s => s.id !== sessionId) }
                            : w
                        ) }
                        : b
                    )
                }
                : ph
            )
        }));
    };

    const handleAddPlanEvent = async (eventData) => {
        const event = { id: _uid(), ...eventData };
        await _updateActivePlan(p => ({ ...p, events: [...p.events, event] }));
        setIsPlanEventModalOpen(false);
        setEditingPlanEvent(null);
    };

    const handleUpdatePlanEvent = async (eventId, updates) => {
        await _updateActivePlan(p => ({
            ...p,
            events: p.events.map(e => e.id === eventId ? { ...e, ...updates } : e)
        }));
        setIsPlanEventModalOpen(false);
        setEditingPlanEvent(null);
    };

    const handleDeletePlanEvent = async (eventId) => {
        await _updateActivePlan(p => ({
            ...p,
            events: p.events.filter(e => e.id !== eventId)
        }));
        setIsPlanEventModalOpen(false);
        setEditingPlanEvent(null);
    };

    return {
        handleCreatePlan,
        handleUpdatePlan,
        handleShiftPlan,
        handleDeletePlan,
        handleAddPlanPhase,
        handleUpdatePlanPhase,
        handleDeletePlanPhase,
        handleAddPlanBlock,
        handleUpdatePlanBlock,
        handleDeletePlanBlock,
        handleAddPlanTarget,
        handleUpdatePlanTarget,
        handleDeletePlanTarget,
        handleUpdateBlockModality,
        handleUpdatePlanWeek,
        handleAddPlanWeek,
        handleAddSessionWithWeek,
        handleAddPlanSession,
        handleUpdatePlanSession,
        handleDeletePlanSession,
        handleAddPlanEvent,
        handleUpdatePlanEvent,
        handleDeletePlanEvent,
    };
};

export default usePlanHandlers;
