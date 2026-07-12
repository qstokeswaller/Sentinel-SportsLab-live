// @ts-nocheck — moved verbatim from AppStateContext.tsx (restructure Phase 3,
// 2026-07-12). Typing is Phase 5 work; this step is pure movement.
// KPI-metric handlers: import commit, save (typed + generic), delete + undo.
import { DatabaseService } from '../../services/databaseService';

export const useMetricHandlers = ({
    calculateHamstringResults,
    hamAggregate,
    hamAssessmentMode,
    hamAthleteId,
    hamBodyWeight,
    hamLeft,
    hamRight,
    importStaging,
    recentDeletions,
    setAthleteAssessments,
    setImportStaging,
    setIsImportResolverOpen,
    setRecentDeletions,
    setTeams,
    showSaveStatus,
    showToast,
    teams,
}: any) => {
    // Legacy 1RM / DSI / RSI branches of handleSaveMetricWithType reference form
    // state that was NEVER declared in the provider (pre-existing dead code —
    // calling those types would have thrown ReferenceError in production too;
    // the only UI caller uses type 'hamstring'). Declared undefined here so the
    // guards (`if (!oneRmAthleteId ...) return showSaveStatus('error')`) fail
    // safely instead of crashing. Remove the branches in Phase 5.
    const dsiAthleteId = undefined, dsiBallistic = undefined, dsiCategory = undefined, dsiIsometric = undefined, dsiScore = undefined, oneRepMax = undefined, oneRmAthleteId = undefined, oneRmExerciseId = undefined, rsiAthleteId = undefined, rsiContactTime = undefined, rsiHeight = undefined, rsiScore = undefined;
    const handleCommitImport = () => {
        let successCount = 0;
        importStaging.forEach(item => {
            let targetId = item.matchedId;
            if (targetId && item.data) {
                handleSaveMetric(targetId, item.data);
                successCount++;
            }
        });
        setIsImportResolverOpen(false);
        setImportStaging([]);
        showToast(`Successfully imported ${successCount} records.`);
    };

    const handleSaveMetricWithType = (type) => {
        let data = null;
        let athleteId = null;

        if (type === '1rm') {
            if (!oneRmAthleteId || !oneRmExerciseId || !oneRepMax) return showSaveStatus('error');
            athleteId = oneRmAthleteId;
            data = { type: '1rm', exerciseId: oneRmExerciseId, value: oneRepMax };
        } else if (type === 'dsi') {
            if (!dsiAthleteId || !dsiScore) return showSaveStatus('error');
            athleteId = dsiAthleteId;
            data = { type: 'dsi', value: dsiScore, ballistic: dsiBallistic, isometric: dsiIsometric, category: dsiCategory.label };
        } else if (type === 'rsi') {
            if (!rsiAthleteId || !rsiScore) return showSaveStatus('error');
            athleteId = rsiAthleteId;
            data = { type: 'rsi', value: rsiScore, height: rsiHeight, contactTime: rsiContactTime };
        } else if (type === 'hamstring') {
            const hamResults = calculateHamstringResults();
            if (!hamAthleteId || !hamResults) return showSaveStatus('error');
            athleteId = hamAthleteId;
            if (hamAssessmentMode === 'split') {
                data = {
                    type: 'hamstring',
                    mode: 'split',
                    left: hamLeft,
                    right: hamRight,
                    asymmetry: hamResults.asymmetry,
                    avgForce: hamResults.avg.toFixed(1),
                    bodyWeight: hamBodyWeight,
                    relativeStrength: hamResults.relativeStrength
                };
            } else {
                data = {
                    type: 'hamstring',
                    mode: 'aggregate',
                    aggregate: hamAggregate,
                    avgForce: hamResults.avg.toFixed(1),
                    bodyWeight: hamBodyWeight,
                    relativeStrength: hamResults.relativeStrength
                };
            }
        }

        if (athleteId && data) {
            handleSaveMetric(athleteId, data);
            showSaveStatus('success');
        }
    };

    const handleSaveMetric = async (athleteId: string, data: any) => {
        if (!athleteId) {
            showToast("No athlete selected. Please select an athlete first.", 'error');
            return;
        }
        try {
            const saved = await DatabaseService.logAssessment(data.type, athleteId, data);
            // Reload assessments for this athlete
            const records = await DatabaseService.fetchAssessmentsByAthlete(athleteId);
            setAthleteAssessments(records);

            // Also update local teams state so AnalysisTab/views reflect the new data immediately
            const newMetric = {
                ...data,
                id: saved?.id || `local_${Date.now()}`,
                date: data.date || new Date().toISOString().split('T')[0],
                type: data.type,
            };
            setTeams(prev => prev.map(t => ({
                ...t,
                players: t.players.map(p => {
                    if (p.id !== athleteId) return p;
                    return {
                        ...p,
                        performanceMetrics: [newMetric, ...(p.performanceMetrics || [])],
                    };
                }),
            })));

            showToast?.(`${data.type.toUpperCase()} saved successfully`);
        } catch (err) {
            console.error("Error saving metric:", err);
            showToast("Failed to save metric. Check your connection.", 'error');
        }
    };

    const handleDeleteMetric = async (athleteId, metricId) => {
        if (!metricId)
            return;
        // Find the record to delete and store it in history
        const athlete = teams.flatMap(t => t.players).find(p => p.id === athleteId);
        const recordToDelete = athlete?.performanceMetrics?.find(m => m.id === metricId);
        if (recordToDelete) {
            setRecentDeletions(prev => [{ athleteId, ...recordToDelete }, ...prev].slice(0, 10));
            showToast(`Deleted ${recordToDelete.metric || recordToDelete.type}`, 'Undo', handleUndoDelete);
        }
        // Remove from local state
        const newTeams = teams.map(t => ({
            ...t,
            players: t.players.map(p => {
                if (p.id === athleteId) {
                    return {
                        ...p,
                        performanceMetrics: (p.performanceMetrics || []).filter(m => m.id && m.id !== metricId)
                    };
                }
                return p;
            })
        }));
        setTeams(newTeams);
        // Also delete from Supabase so it doesn't return on refresh
        try {
            await DatabaseService.deleteAssessment(metricId);
        } catch (err) {
            console.warn('Failed to delete assessment from DB:', err);
        }
    };

    const handleUndoDelete = () => {
        if (recentDeletions.length === 0)
            return;
        const lastDeleted = recentDeletions[0];
        const { athleteId, ...record } = lastDeleted;
        const newTeams = teams.map(t => ({
            ...t,
            players: t.players.map(p => {
                if (p.id === athleteId) {
                    return {
                        ...p,
                        performanceMetrics: [...(p.performanceMetrics || []), record].sort((a, b) => new Date(b.date) - new Date(a.date))
                    };
                }
                return p;
            })
        }));
        setTeams(newTeams);
        setRecentDeletions(prev => prev.slice(1));
    };

    return {
        handleCommitImport,
        handleSaveMetricWithType,
        handleSaveMetric,
        handleDeleteMetric,
        handleUndoDelete,
    };
};

export default useMetricHandlers;
