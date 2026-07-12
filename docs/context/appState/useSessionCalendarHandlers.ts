// @ts-nocheck — moved verbatim from AppStateContext.tsx (restructure Phase 3,
// 2026-07-12). Typing is Phase 5 work; this step is pure movement.
// Session + calendar-event handlers (CRUD, scheduling, custom event types).
// State stays in the provider; this hook receives it as deps and returns the
// handlers — the context API is unchanged.
import { useRef, useEffect } from 'react';
import { DatabaseService } from '../../services/databaseService';
import { SupabaseStorageService as StorageService } from '../../services/storageService';

export const useSessionCalendarHandlers = ({
    calendarEvents,
    exercises,
    isAddEventModalOpen,
    isLoading,
    newSession,
    scheduledSessions,
    setAddSessionCategory,
    setAddSessionSearch,
    setAddSessionTab,
    setCalendarEvents,
    setCustomEventTypes,
    setIsAddEventModalOpen,
    setIsAddSessionModalOpen,
    setIsLoading,
    setNewSession,
    setPeriodizationPlans,
    setPlannedTonnageLog,
    setScheduledSessions,
    showToast,
}: any) => {
    const handleAddSession = async () => {
        if (!newSession.title || !newSession.targetId) {
            setAddSessionTab('info');
            return;
        }

        try {
            setIsLoading(true);
            const sessionData = {
                title: newSession.title,
                date: newSession.date,
                target_type: newSession.targetType,
                target_id: newSession.targetId,
                training_phase: newSession.trainingPhase,
                load: newSession.load,
                status: 'Scheduled',
                planned_duration: 60,
                exercises: newSession.exercises // Assuming the DB table can handle this JSONB or similar
            };

            const savedSession = await DatabaseService.createSession(sessionData);
            if (savedSession) {
                setScheduledSessions(prev => [...prev, {
                    ...savedSession,
                    trainingPhase: savedSession.training_phase,
                    targetType: savedSession.target_type,
                    targetId: savedSession.target_id,
                    plannedDuration: savedSession.planned_duration,
                }]);
            }

            setIsAddSessionModalOpen(false);
            setNewSession({
                title: '',
                date: new Date().toISOString().split('T')[0],
                targetType: 'Team',
                targetId: '',
                trainingPhase: 'Strength',
                load: 'Medium',
                exercises: []
            });
            setAddSessionTab('info');
            setAddSessionSearch('');
            setAddSessionCategory('All');
            showToast("Session created successfully", "success");
        } catch (err) {
            console.error("Error creating session:", err);
            showToast("Failed to create session", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const scheduleWorkoutSession = async (sessionPayload) => {
        try {
            setIsLoading(true);
            const savedSession = await DatabaseService.createSession(sessionPayload);
            if (savedSession) {
                setScheduledSessions(prev => [...prev, {
                    ...savedSession,
                    trainingPhase: savedSession.training_phase,
                    targetType: savedSession.target_type,
                    targetId: savedSession.target_id,
                    plannedDuration: savedSession.planned_duration,
                }]);
            }
            showToast("Workout scheduled successfully", "success");
            // Return the saved session so callers can write planned tonnage rows
            // referencing its id.
            return savedSession;
        } catch (err) {
            console.error("Error scheduling workout:", err);
            showToast("Failed to schedule workout", "error");
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateSession = async (sessionId, updates) => {
        // Compute date delta once so we can shift dependent rows (planned_tonnage_log
        // + the program's derived end-date) by the same number of days.
        const oldSession = scheduledSessions.find(s => s.id === sessionId);
        let deltaDays = 0;
        let newProgramEndDate: string | null = null;
        if (updates.date !== undefined && oldSession?.date && oldSession.date !== updates.date) {
            const oldD = new Date(oldSession.date + 'T00:00:00');
            const newD = new Date(updates.date + 'T00:00:00');
            deltaDays = Math.round((newD.getTime() - oldD.getTime()) / 86400000);
            // Programs: keep program_end_date in lockstep with the start so the
            // calendar popup ("ends X") stays truthful after the drag.
            if (oldSession.session_type === 'program' && oldSession.program_end_date) {
                const oldEnd = new Date(oldSession.program_end_date + 'T00:00:00');
                oldEnd.setDate(oldEnd.getDate() + deltaDays);
                newProgramEndDate = oldEnd.toISOString().split('T')[0];
            }
        }
        const isProgram = oldSession?.session_type === 'program' || !!oldSession?.program_id;
        const tonnageSourceId = isProgram ? oldSession?.program_id : sessionId;

        try {
            // Optimistic: update local state immediately
            setScheduledSessions(prev => prev.map(s => s.id === sessionId
                ? { ...s, ...updates, ...(newProgramEndDate ? { program_end_date: newProgramEndDate } : {}) }
                : s));
            // Optimistic: shift local tonnage rows so Tracking/Data Hub update instantly
            if (deltaDays !== 0 && tonnageSourceId) {
                setPlannedTonnageLog((prev: any[]) => prev.map(r => {
                    if (r.source_id !== tonnageSourceId) return r;
                    const d = new Date(r.date + 'T00:00:00');
                    d.setDate(d.getDate() + deltaDays);
                    return { ...r, date: d.toISOString().split('T')[0] };
                }));
            }
            // Map camelCase → snake_case for DB
            const dbUpdates: any = {};
            if (updates.date !== undefined) dbUpdates.date = updates.date;
            if (updates.time !== undefined) dbUpdates.time = updates.time;
            if (updates.title !== undefined) dbUpdates.title = updates.title;
            if (updates.trainingPhase !== undefined) dbUpdates.training_phase = updates.trainingPhase;
            if (updates.load !== undefined) dbUpdates.load = updates.load;
            if (updates.targetType !== undefined) dbUpdates.target_type = updates.targetType;
            if (updates.targetId !== undefined) dbUpdates.target_id = updates.targetId;
            if (updates.status !== undefined) dbUpdates.status = updates.status;
            if (newProgramEndDate) dbUpdates.program_end_date = newProgramEndDate;
            await DatabaseService.updateSession(sessionId, dbUpdates);
            // Shift DB tonnage rows. Non-fatal: a failure here leaves the calendar
            // accurate but the tonnage charts misaligned — we surface a warning
            // rather than rolling back the visible move.
            if (deltaDays !== 0 && tonnageSourceId) {
                try {
                    await DatabaseService.shiftTonnageDatesForSource(tonnageSourceId, deltaDays);
                } catch (tErr) {
                    console.warn('Tonnage date shift failed (non-fatal):', tErr);
                    showToast('Session moved — tonnage charts may need a refresh', 'info');
                    // Resync local tonnage with DB reality so we don't show shifted
                    // rows in memory while the DB still has the old dates.
                    try {
                        const tonnage = await DatabaseService.fetchPlannedTonnage();
                        if (tonnage) setPlannedTonnageLog(tonnage);
                    } catch (_) {}
                }
            }
            showToast("Session updated", "success");
        } catch (err) {
            console.error("Error updating session:", err);
            showToast("Failed to update session", "error");
            // Rollback: refetch sessions AND tonnage so optimistic shifts unwind
            try {
                const sessions = await DatabaseService.fetchSessions();
                if (sessions) setScheduledSessions(sessions.map(s => ({ ...s, trainingPhase: s.training_phase, targetType: s.target_type, targetId: s.target_id, plannedDuration: s.planned_duration })));
                const tonnage = await DatabaseService.fetchPlannedTonnage();
                if (tonnage) setPlannedTonnageLog(tonnage);
            } catch (_) {}
        }
    };

    const handleDeleteSession = async (sessionId) => {
        // Optimistic — no global isLoading toggle (which would flash the dashboard
        // skeletons, incl. the Performance Report, on every calendar delete).
        // Capture pre-delete shape so we know if this was a program assignment and
        // so we can roll back if the DB delete fails.
        const sessionBeingDeleted = scheduledSessions.find(s => s.id === sessionId);
        const prevSessions = scheduledSessions;
        setScheduledSessions(prev => prev.filter(s => s.id !== sessionId));
        try {
            await DatabaseService.deleteSession(sessionId);

            // Drop future-dated tonnage rows belonging to this session/program. Past
            // rows stay frozen as a historical record (per the "before the assigned
            // date" rule). Errors here are non-fatal — the session is already gone.
            try {
                const today = new Date();
                const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                const isProgram = sessionBeingDeleted?.session_type === 'program' || !!sessionBeingDeleted?.program_id;
                const sourceId = isProgram ? sessionBeingDeleted?.program_id : sessionId;
                if (sourceId) {
                    await DatabaseService.deleteFutureTonnageForSource(sourceId, todayStr);
                    // Optimistic local prune
                    setPlannedTonnageLog((prev: any[]) => prev.filter(r => !(r.source_id === sourceId && r.date > todayStr)));
                }
            } catch (tonnageErr) {
                console.warn('Tonnage cleanup on session delete failed (non-fatal):', tonnageErr);
            }

            showToast("Session deleted", "success");
        } catch (err) {
            console.error("Error deleting session:", err);
            showToast("Failed to delete session", "error");
            setScheduledSessions(prevSessions); // rollback the optimistic removal
        }
    };

    // --- CALENDAR EVENT HANDLERS ---
    const addEventModalGenRef = useRef(0); // increments each time modal opens — prevents stale close
    useEffect(() => {
        if (isAddEventModalOpen) addEventModalGenRef.current += 1;
    }, [isAddEventModalOpen]);

    // `options.silent` skips the built-in "Event created successfully" toast. The
    // drag-to-copy path uses it so the copy shows a single "Event copied" toast
    // instead of two (previously every copy fired both → "do 4 copies, get 8
    // notifications" from the demo feedback).
    const handleAddCalendarEvent = async (eventData, options = {}) => {
        const gen = addEventModalGenRef.current; // snapshot generation before async work
        try {
            const result = await DatabaseService.createCalendarEvent(eventData);
            // Optimistic: append to local state so calendar updates instantly
            if (result) {
                setCalendarEvents(prev => [...prev, ...(Array.isArray(result) ? result : [result])]);
            }
            if (!options.silent) showToast("Event created successfully", "success");
            // Close modal only if user hasn't reopened it since this save started
            if (addEventModalGenRef.current === gen) {
                setIsAddEventModalOpen(false);
            }
            // Refresh calendar events in background
            DatabaseService.fetchCalendarEvents().then(events => {
                if (events) setCalendarEvents(events);
            }).catch(() => {});
        } catch (err) {
            console.error("Error creating calendar event:", err);
            showToast("Failed to create event", "error");
        }
    };

    const handleUpdateCalendarEvent = async (id, updates) => {
        // Optimistic — mirror handleUpdateSession's pattern. The previous version
        // flipped the global isLoading flag which made every dashboard skeleton
        // (Performance Report, Wellness Summary, ACWR tiles…) blink during the
        // DB round-trip on every event drag. Local state moves first; DB catches
        // up; on failure we refetch to unwind the optimistic write.
        const prevSnapshot = calendarEvents;
        setCalendarEvents(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
        try {
            const updatedEvent = await DatabaseService.updateCalendarEvent(id, updates);
            if (updatedEvent) {
                setCalendarEvents(prev => prev.map(e => e.id === id ? { ...e, ...updatedEvent } : e));
            }
            showToast("Event updated", "success");
        } catch (err) {
            console.error("Error updating calendar event:", err);
            showToast("Failed to update event", "error");
            // Rollback the optimistic write
            setCalendarEvents(prevSnapshot);
        }
    };

    const handleDeleteCalendarEvent = async (id) => {
        // Optimistic — same pattern as handleUpdateCalendarEvent. The old version
        // flipped the global isLoading flag, which forced the Performance Report
        // skeleton to render (always in its expanded form + light background) for
        // the duration of the DB round-trip — so deleting an event made a collapsed
        // report flash open with a white tinge before snapping back. Removing the
        // isLoading toggle removes the flash; on failure we restore the snapshot.
        const prevSnapshot = calendarEvents;
        setCalendarEvents(prev => prev.filter(e => e.id !== id));
        try {
            await DatabaseService.deleteCalendarEvent(id);
            showToast("Event deleted", "success");
        } catch (err) {
            console.error("Error deleting calendar event:", err);
            showToast("Failed to delete event", "error");
            setCalendarEvents(prevSnapshot); // rollback
        }
    };

    const handleSaveCustomEventTypes = async (types) => {
        setCustomEventTypes(types);
        await StorageService.saveCustomEventTypes(types);
    };

    // --- PERIODIZATION PLAN CRUD HANDLERS ---

    return {
        handleAddSession,
        scheduleWorkoutSession,
        handleUpdateSession,
        handleDeleteSession,
        addEventModalGenRef,
        handleAddCalendarEvent,
        handleUpdateCalendarEvent,
        handleDeleteCalendarEvent,
        handleSaveCustomEventTypes,
    };
};

export default useSessionCalendarHandlers;
