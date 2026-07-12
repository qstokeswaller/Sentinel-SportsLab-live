// @ts-nocheck
import { supabase } from '../lib/supabase';
import { supabasePublic } from '../lib/supabasePublic';

export const DatabaseService = {
    // --- TEAMS ---
    // Teams are org-shared: any member of the organisation sees every team.
    // RLS (org_isolation policy) handles the scope; no app-level user_id filter.
    async fetchTeams() {
        const { data, error } = await supabase
            .from('teams')
            .select('*, athletes (*)');
        if (error) throw error;
        return data;
    },

    async createTeam(name: string, sport?: string, description?: string) {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('teams')
            .insert({
                name,
                sport,
                description,
                user_id: userData.user.id
            })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    // --- ATHLETES ---
    // Athletes are org-shared: every member of the organisation sees every athlete.
    // RLS (org_isolation policy) enforces the scope; no app-level user_id filter.
    async fetchAthletes() {
        const { data, error } = await supabase
            .from('athletes')
            .select('*');
        if (error) throw error;
        return data;
    },

    async deleteAthlete(athleteId: string) {
        const { error } = await supabase
            .from('athletes')
            .delete()
            .eq('id', athleteId);
        if (error) throw error;
    },

    async deleteTeam(teamId: string) {
        const { error } = await supabase
            .from('teams')
            .delete()
            .eq('id', teamId);
        if (error) throw error;
    },

    async createAthlete(athleteData: { name: string; team_id?: string; gender?: string; age?: number; height_cm?: number; weight_kg?: number; sport?: string; position?: string; goals?: string; notes?: string; image_url?: string }) {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('athletes')
            .insert({
                ...athleteData,
                user_id: userData.user.id
            })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async updateAthlete(athleteId: string, updates: Partial<{ name: string; team_id: string | null; gender: string; age: number; height_cm: number; weight_kg: number; sport: string; position: string; goals: string; notes: string; image_url: string | null }>) {
        const { data, error } = await supabase
            .from('athletes')
            .update(updates)
            .eq('id', athleteId)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    // --- ATHLETE SHARE LINKS ---
    async createAthleteShare(payload: {
        athleteId: string;
        athleteName: string;
        mode: 'snapshot' | 'live';
        snapshotData?: any;
        expiresAt?: string | null;
    }) {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('athlete_share_sessions')
            .insert({
                user_id: userData.user.id,
                athlete_id: payload.athleteId,
                athlete_name: payload.athleteName,
                mode: payload.mode,
                snapshot_data: payload.snapshotData ?? null,
                expires_at: payload.expiresAt ?? null,
            })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async listAthleteShares(athleteId: string) {
        const { data, error } = await supabase
            .from('athlete_share_sessions')
            .select('id, mode, expires_at, created_at')
            .eq('athlete_id', athleteId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    },

    async fetchAthleteShare(shareId: string) {
        const { data, error } = await supabase
            .from('athlete_share_sessions')
            .select('*')
            .eq('id', shareId)
            .maybeSingle();
        if (error) throw error;
        return data;
    },

    async deleteAthleteShare(shareId: string) {
        const { error } = await supabase
            .from('athlete_share_sessions')
            .delete()
            .eq('id', shareId);
        if (error) throw error;
    },

    // --- TEST REPORT SHARE LINKS ---
    // Backs the Testing → Team Comparison + Export & Print share flow.
    // share_type discriminates the snapshot shape on the public render page.
    async createTestShare(payload: {
        shareType: 'team-comparison' | 'export-summary';
        title: string;
        snapshotData: any;
        expiresAt?: string | null;
    }) {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('test_share_sessions')
            .insert({
                user_id: userData.user.id,
                share_type: payload.shareType,
                title: payload.title,
                snapshot_data: payload.snapshotData,
                expires_at: payload.expiresAt ?? null,
            })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async listTestShares(shareType?: 'team-comparison' | 'export-summary') {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return [];

        let q = supabase
            .from('test_share_sessions')
            .select('id, share_type, title, expires_at, created_at')
            .eq('user_id', userData.user.id)
            .order('created_at', { ascending: false });
        if (shareType) q = q.eq('share_type', shareType);

        const { data, error } = await q;
        if (error) throw error;
        return data || [];
    },

    async fetchTestShare(shareId: string) {
        const { data, error } = await supabase
            .from('test_share_sessions')
            .select('*')
            .eq('id', shareId)
            .maybeSingle();
        if (error) throw error;
        return data;
    },

    async deleteTestShare(shareId: string) {
        const { error } = await supabase
            .from('test_share_sessions')
            .delete()
            .eq('id', shareId);
        if (error) throw error;
    },

    async uploadAthleteAvatar(file: File): Promise<string> {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) throw new Error('User not authenticated');

        if (file.size > 5 * 1024 * 1024) throw new Error('Image must be under 5MB');

        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
        const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) ? ext : 'jpg';
        const rand = (typeof crypto !== 'undefined' && crypto.randomUUID)
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const path = `${userData.user.id}/${rand}.${safeExt}`;

        const { error: uploadError } = await supabase.storage
            .from('athlete-avatars')
            .upload(path, file, { upsert: false, contentType: file.type });
        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('athlete-avatars').getPublicUrl(path);
        return data.publicUrl;
    },

    // --- EXERCISES ---
    // Fetch the merged exercise catalogue: for each platform default we substitute the
    // current org's override row when one exists (keeping the default's id as canonical so
    // references in workouts/collections/personal_library continue to resolve), plus all
    // org-new exercises. RLS already restricts what we see to platform defaults + own org.
    async fetchExercises() {
        const { data, error } = await supabase
            .from('exercises')
            .select('*');
        if (error) throw error;
        const rows = data ?? [];

        const overridesBySource = new Map<string, any>();
        const orgNew: any[] = [];
        const platformDefaults: any[] = [];
        for (const r of rows) {
            if (r.organisation_id && r.source_id) overridesBySource.set(r.source_id, r);
            else if (r.organisation_id && !r.source_id) orgNew.push(r);
            else platformDefaults.push(r);
        }

        const merged: any[] = [];
        for (const def of platformDefaults) {
            const ovr = overridesBySource.get(def.id);
            if (ovr) {
                merged.push({
                    ...ovr,
                    id: def.id,                  // canonical id (refs stay stable)
                    __custom: true,
                    __original_id: def.id,
                    __override_id: ovr.id,
                });
            } else {
                merged.push({ ...def, __custom: false });
            }
        }
        for (const n of orgNew) {
            merged.push({ ...n, __custom: true, __override_id: n.id });
        }
        return merged;
    },

    // --- SESSIONS ---
    async fetchSessions() {
        // Only fetch sessions from the last 6 months + 1 month ahead to avoid loading entire history
        const from = new Date(Date.now() - 180 * 86400000).toISOString().split('T')[0];
        const to = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
        const { data, error } = await supabase
            .from('scheduled_sessions')
            .select('*')
            .gte('date', from)
            .lte('date', to)
            .order('date', { ascending: false })
            .limit(1000);
        if (error) throw error;
        return data;
    },

    async createSession(sessionData: any) {
        let { data: userData } = await supabase.auth.getUser();

        const userId = userData.user?.id;
        if (!userId) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('scheduled_sessions')
            .insert({
                ...sessionData,
                user_id: userId
            })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async updateSession(id: string, updates: any) {
        const { data, error } = await supabase
            .from('scheduled_sessions')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async deleteSession(id: string) {
        const { error } = await supabase
            .from('scheduled_sessions')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    // --- SESSION COMPLETION (Tonnage Tracking) ---

    async completeSession(id: string, actualResults: Record<string, any[]>, actualRpe: number | null) {
        const { data, error } = await supabase
            .from('scheduled_sessions')
            .update({
                status: 'Completed',
                actual_results: actualResults,
                actual_rpe: actualRpe,
            })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async fetchCompletedSessionResults() {
        const { data, error } = await supabase
            .from('scheduled_sessions')
            .select('*')
            .eq('status', 'Completed')
            .eq('track_tonnage', true)
            .not('actual_results', 'is', null)
            .order('date', { ascending: false });
        if (error) throw error;
        return data || [];
    },

    // --- WORKOUT PROGRAM EXERCISE IDs (for recently-used tracking) ---
    async fetchProgramExerciseIds(): Promise<string[]> {
        const { data, error } = await (supabase as any)
            .from('workout_day_exercises')
            .select('exercise_id')
            .limit(1000);
        if (error) throw error;
        return [...new Set((data || []).map((r: any) => r.exercise_id).filter(Boolean))];
    },

    // --- WORKOUT TEMPLATES (a.k.a. "Workout Packets" in the UI) ---
    // Personal by default; visibility='org' rows are visible to everyone in the org.
    // RLS already filters at this boundary, but we mirror the rule client-side so the
    // query result matches what users expect on Mine/Org filter toggles.
    async fetchWorkoutTemplates() {
        const { data, error } = await (supabase as any)
            .from('workout_templates')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(200);
        if (error) throw error;
        return data || [];
    },

    async createWorkoutTemplate(templateData: any) {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;
        if (!userId) throw new Error('User not authenticated');

        const { data, error } = await (supabase as any)
            .from('workout_templates')
            .insert({ ...templateData, user_id: userId })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async updateWorkoutTemplate(id: string, updates: any) {
        const { data, error } = await (supabase as any)
            .from('workout_templates')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async deleteWorkoutTemplate(id: string) {
        const { error } = await (supabase as any)
            .from('workout_templates')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    // --- CALENDAR EVENTS ---
    // Calendar events are PERSONAL — every user in an org keeps their own schedule.
    // Filter by user_id so colleagues never see each other's planner entries.
    async fetchCalendarEvents() {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;
        if (!userId) return [];
        const from = new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0];
        const to = new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0];
        const { data, error } = await (supabase as any)
            .from('calendar_events')
            .select('*')
            .eq('user_id', userId)
            .gte('start_date', from)
            .lte('start_date', to)
            .order('start_date', { ascending: true })
            .limit(500);
        if (error) throw error;
        return data || [];
    },

    async createCalendarEvent(eventData: any) {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;
        if (!userId) throw new Error('User not authenticated');

        const { data, error } = await (supabase as any)
            .from('calendar_events')
            .insert({ ...eventData, user_id: userId })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async updateCalendarEvent(id: string, updates: any) {
        const { data, error } = await (supabase as any)
            .from('calendar_events')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async deleteCalendarEvent(id: string) {
        const { error } = await (supabase as any)
            .from('calendar_events')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    // --- ASSESSMENTS ---
    async fetchAssessments(testType?: string) {
        // Limit to last 12 months of assessments to keep payload manageable
        const from = new Date(Date.now() - 365 * 86400000).toISOString().split('T')[0];
        let query = supabase.from('assessments').select('*').gte('date', from).order('date', { ascending: false });
        if (testType) query = query.eq('test_type', testType);
        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    async fetchRmAssessments() {
        // Last 2 years of 1RM data — older records are unlikely to reflect current strength
        const from = new Date(Date.now() - 730 * 86400000).toISOString().split('T')[0];
        const { data, error } = await supabase
            .from('assessments')
            .select('*')
            .in('test_type', ['1rm', 'rm_back_squat', 'rm_bench_press', 'rm_deadlift', 'rm_front_squat', 'rm_ohp'])
            .gte('date', from)
            .order('date', { ascending: false });
        if (error) throw error;
        return data;
    },

    async logAssessment(testType: string, athleteId: string, metrics: any, date?: string) {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('assessments')
            .insert({
                user_id: userData.user.id,
                athlete_id: athleteId,
                test_type: testType,
                metrics,
                date: date || new Date().toISOString().split('T')[0]
            })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async deleteAssessment(id: string) {
        const { error } = await supabase.from('assessments').delete().eq('id', id);
        if (error) throw error;
    },

    async fetchAssessmentsByAthlete(athleteId: string, testType?: string) {
        let query = supabase
            .from('assessments')
            .select('*')
            .eq('athlete_id', athleteId)
            .order('date', { ascending: false });

        if (testType) {
            query = query.eq('test_type', testType);
        }

        const { data, error } = await query;
        if (error) {
            console.error('fetchAssessmentsByAthlete error:', error);
            return [];
        }
        return data || [];
    },

    async fetchAssessmentsByTeam(teamPlayerIds: string[], testType?: string) {
        let query = supabase
            .from('assessments')
            .select('*')
            .in('athlete_id', teamPlayerIds)
            .order('date', { ascending: false });
        if (testType) query = query.eq('test_type', testType);
        const { data, error } = await query;
        if (error) { console.error('fetchAssessmentsByTeam error:', error); return []; }
        return data || [];
    },

    async batchLogAssessments(entries: { testType: string; athleteId: string; metrics: any; date?: string }[]) {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) throw new Error('User not authenticated');
        const rows = entries.map(e => ({
            user_id: userData.user.id,
            athlete_id: e.athleteId,
            test_type: e.testType,
            metrics: e.metrics,
            date: e.date || new Date().toISOString().split('T')[0],
        }));
        const { data, error } = await supabase.from('assessments').insert(rows).select();
        if (error) throw error;
        return data;
    },

    // --- QUESTIONNAIRE TEMPLATES ---
    // Cast as any: new tables not yet in generated Supabase types
    async fetchQuestionnaireTemplates(teamId?: string) {
        const db = supabase as any;
        let query = db
            .from('questionnaire_templates')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (teamId) {
            // Guard: teamId is interpolated into a PostgREST filter string, so
            // only accept a well-formed UUID — never raw/unchecked input.
            if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(teamId)) {
                console.error('fetchQuestionnaireTemplates: invalid teamId, ignoring filter:', teamId);
            } else {
                query = query.or(`team_id.eq.${teamId},team_id.is.null`);
            }
        }

        const { data, error } = await query;
        if (error) {
            console.error('fetchQuestionnaireTemplates error:', error);
            return [];
        }
        return data || [];
    },

    async saveQuestionnaireTemplate(template: {
        id?: string;
        name: string;
        description?: string;
        questions: any[];
        team_id?: string;
        is_default?: boolean;
    }) {
        const db = supabase as any;
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) throw new Error('User not authenticated');

        if (template.id) {
            const { data, error } = await db
                .from('questionnaire_templates')
                .update({
                    name: template.name,
                    description: template.description,
                    questions: template.questions,
                    team_id: template.team_id || null,
                    is_default: template.is_default || false,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', template.id)
                .eq('user_id', userData.user.id)
                .select()
                .single();
            if (error) throw error;
            return data;
        } else {
            const { data, error } = await db
                .from('questionnaire_templates')
                .insert({
                    user_id: userData.user.id,
                    name: template.name,
                    description: template.description,
                    questions: template.questions,
                    team_id: template.team_id || null,
                    is_default: template.is_default || false,
                })
                .select()
                .single();
            if (error) throw error;
            return data;
        }
    },

    async deleteQuestionnaireTemplate(templateId: string) {
        const db = supabase as any;
        const { error } = await db
            .from('questionnaire_templates')
            .update({ is_active: false })
            .eq('id', templateId);
        if (error) throw error;
    },

    // --- SHARE SESSIONS ---
    async createShareSession(templateId: string, teamId: string) {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) throw new Error('User not authenticated');
        const db = supabase as any;
        const { data, error } = await db
            .from('wellness_share_sessions')
            .insert({
                template_id: templateId,
                team_id: teamId,
                user_id: userData.user.id,
            })
            .select('id')
            .single();
        if (error) throw error;
        return data as { id: string };
    },

    async fetchLatestShareSession(teamId: string) {
        const db = supabase as any;
        const { data, error } = await db
            .from('wellness_share_sessions')
            .select('id, template_id, shared_at')
            .eq('team_id', teamId)
            .order('shared_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        if (error) { console.error('fetchLatestShareSession error:', error); return null; }
        return data as { id: string; template_id: string; shared_at: string } | null;
    },

    async fetchShareSessions(teamId: string, dateFrom?: string, dateTo?: string) {
        const db = supabase as any;
        let query = db
            .from('wellness_share_sessions')
            .select('id, template_id, shared_at')
            .eq('team_id', teamId)
            .order('shared_at', { ascending: false });

        if (dateFrom) query = query.gte('shared_at', `${dateFrom}T00:00:00`);
        if (dateTo) query = query.lte('shared_at', `${dateTo}T23:59:59`);

        const { data, error } = await query;
        if (error) { console.error('fetchShareSessions error:', error); return []; }
        return (data || []) as { id: string; template_id: string; shared_at: string }[];
    },

    // Resolve today's share session for a team+template (used by permalink auto-match)
    // Public form → anon client (never attaches a stale device session).
    async resolveShareSessionId(teamId: string, templateId: string): Promise<string | null> {
        const db = supabasePublic as any;
        const { data, error } = await db.rpc('resolve_share_session_id', {
            p_team_id: teamId,
            p_template_id: templateId,
        });
        if (error) { console.error('resolveShareSessionId error:', error); return null; }
        return data as string | null;
    },

    // Check if athlete completed a weekly health check recently + get date
    // Public form → anon client.
    async getRecentWeeklyInfo(athleteId: string, days = 7): Promise<{ hasRecent: boolean; lastDate: string | null }> {
        const db = supabasePublic as any;
        const { data, error } = await db.rpc('get_recent_weekly_info', { p_athlete_id: athleteId, p_days: days });
        if (error) { console.warn('getRecentWeeklyInfo error:', error); return { hasRecent: false, lastDate: null }; }
        return { hasRecent: !!data?.has_recent, lastDate: data?.last_date || null };
    },

    // --- WELLNESS RESPONSES ---
    async saveWellnessResponse(response: {
        athlete_id: string;
        team_id: string;
        questionnaire_template_id?: string;
        session_date: string;
        responses: Record<string, any>;
        rpe?: number;
        availability?: 'available' | 'modified' | 'unavailable';
        injury_report?: any;
        share_session_id?: string;
        tier?: 'daily' | 'weekly' | 'research';
        health_problem_flag?: boolean;
        readiness?: string;
    }) {
        // Public form submit → anon client, so the insert always uses the anon key
        // regardless of any (possibly stale) coach session on the device.
        const db = supabasePublic as any;
        // No .select() on insert — avoids INSERT...RETURNING triggering the SELECT RLS
        // policy check on anon users (PostgreSQL 15 throws rather than silently filtering).
        const { error } = await db
            .from('wellness_responses')
            .insert(response);
        if (error) throw error;

        // Fetch the ID of the row we just inserted (needed for injury classification linkage).
        // Uses a separate SELECT which goes through the authenticated SELECT policy (coach sessions)
        // or returns null for anon (injury classification will still save, just without the link).
        try {
            const { data: inserted } = await db
                .from('wellness_responses')
                .select('id')
                .eq('athlete_id', response.athlete_id)
                .eq('team_id', response.team_id)
                .eq('session_date', response.session_date)
                .order('submitted_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            return inserted ?? undefined;
        } catch {
            return undefined;
        }
    },

    // --- WELLNESS FLAGS ---
    async fetchWellnessFlags(teamId: string, pendingOnly = true) {
        const db = supabase as any;
        let query = db.from('wellness_flags').select('*').eq('team_id', teamId).order('created_at', { ascending: false });
        if (pendingOnly) query = query.eq('weekly_completed', false);
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    },

    async createWellnessFlag(flag: {
        athlete_id: string; team_id: string; flag_date: string;
        flag_type: string; trigger_field: string; trigger_value?: string;
        threshold_used?: string;
    }) {
        const { data: userData } = await supabase.auth.getUser();
        const db = supabase as any;
        const { data, error } = await db.from('wellness_flags').insert({
            ...flag, user_id: userData?.user?.id,
        }).select().single();
        if (error) throw error;
        return data;
    },

    async resolveWellnessFlag(flagId: string, weeklyResponseId?: string) {
        const db = supabase as any;
        const { error } = await db.from('wellness_flags').update({
            weekly_completed: true, weekly_response_id: weeklyResponseId || null,
        }).eq('id', flagId);
        if (error) throw error;
    },

    // --- INJURY CLASSIFICATIONS ---
    // Public form (weekly wellness deep-check) → anon client. Athletes have no
    // account, so user_id is intentionally null; the classification links via the
    // wellness response, not a user.
    async saveInjuryClassification(classification: any) {
        const db = supabasePublic as any;
        // No .select() — avoids INSERT...RETURNING RLS check on anon (PostgreSQL 15)
        const { error } = await db.from('injury_classifications').insert({
            ...classification, user_id: null,
        });
        if (error) throw error;
    },

    async fetchInjuryClassifications(athleteId?: string) {
        const db = supabase as any;
        let query = db.from('injury_classifications').select('*').order('classification_date', { ascending: false });
        if (athleteId) query = query.eq('athlete_id', athleteId);
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    },

    // Fetch all wellness responses across all of the user's teams (used for dashboard heatmap)
    async fetchAllWellnessResponses(dateFrom?: string, dateTo?: string) {
        const db = supabase as any;
        let query = db
            .from('wellness_responses')
            .select('*')
            .order('session_date', { ascending: false })
            .order('submitted_at', { ascending: false });
        if (dateFrom) query = query.gte('session_date', dateFrom);
        if (dateTo) query = query.lte('session_date', dateTo);
        const { data, error } = await query;
        if (error) {
            console.error('fetchAllWellnessResponses error:', error);
            return [];
        }
        return data || [];
    },

    async fetchWellnessResponses(teamId: string, dateFrom?: string, dateTo?: string) {
        const db = supabase as any;
        let query = db
            .from('wellness_responses')
            .select('*')
            .eq('team_id', teamId)
            .order('session_date', { ascending: false })
            .order('submitted_at', { ascending: false });

        if (dateFrom) query = query.gte('session_date', dateFrom);
        if (dateTo) query = query.lte('session_date', dateTo);

        const { data, error } = await query;
        if (error) {
            console.error('fetchWellnessResponses error:', error);
            return [];
        }
        return data || [];
    },

    // Public form (daily wellness repeat-detection) → anon client. This SELECT is
    // best-effort: anon has no read policy on wellness_responses, so it returns []
    // for real athletes — repeat detection simply doesn't fire, which is fine and
    // non-fatal (the submit already succeeded).
    async fetchWellnessResponsesByAthlete(athleteId: string, dateFrom?: string, dateTo?: string) {
        const db = supabasePublic as any;
        let query = db
            .from('wellness_responses')
            .select('*')
            .eq('athlete_id', athleteId)
            .order('session_date', { ascending: false });

        if (dateFrom) query = query.gte('session_date', dateFrom);
        if (dateTo) query = query.lte('session_date', dateTo);

        const { data, error } = await query;
        if (error) {
            console.error('fetchWellnessResponsesByAthlete error:', error);
            return [];
        }
        return data || [];
    },

    async deleteWellnessResponse(responseId: string) {
        const { error } = await (supabase as any)
            .from('wellness_responses')
            .delete()
            .eq('id', responseId);
        if (error) throw error;
    },

    // Called by FIFA daily/weekly form (anon) — fetches athlete names via SECURITY
    // DEFINER RPC. Anon client so a stale device session can't 401 the form load.
    async getTeamAthletes(teamId: string) {
        const db = supabasePublic as any;
        const { data, error } = await db.rpc('get_team_athletes', { p_team_id: teamId });
        if (error) throw error;
        return data as { athletes: { id: string; name: string }[] };
    },

    // Called by public form (anon) — fetches template + athlete names via SECURITY
    // DEFINER RPC. Anon client (see getTeamAthletes).
    async getWellnessFormData(templateId: string, teamId: string) {
        const db = supabasePublic as any;
        const { data, error } = await db
            .rpc('get_wellness_form_data', {
                p_template_id: templateId,
                p_team_id: teamId,
            });
        if (error) throw error;
        return data as { template: any; athletes: { id: string; name: string }[] };
    },

    // --- INJURY REPORTS ---

    // `isPublic` routes through the anon client (public injury form) and skips
    // .select() — anon has no SELECT policy on injury_reports, so INSERT...RETURNING
    // would throw for real athletes (PostgreSQL 15). The authenticated Injury Report
    // component keeps the shared client + returns the row it just wrote.
    async saveInjuryReport(report: {
        user_id?: string;
        team_id: string;
        athlete_id: string;
        athlete_name: string;
        date_of_injury: string;
        report_data: Record<string, any>;
    }, options: { isPublic?: boolean } = {}) {
        if (options.isPublic) {
            const db = supabasePublic as any;
            const { error } = await db.from('injury_reports').insert(report);
            if (error) throw error;
            return undefined;
        }
        const db = supabase as any;
        const { data, error } = await db
            .from('injury_reports')
            .insert(report)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async updateInjuryReport(id: string, updates: Record<string, any>) {
        const db = supabase as any;
        const { data, error } = await db
            .from('injury_reports')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async fetchInjuryReports(teamId?: string) {
        const db = supabase as any;
        // Last 12 months of injury reports
        const from = new Date(Date.now() - 365 * 86400000).toISOString().split('T')[0];
        let query = db
            .from('injury_reports')
            .select('*')
            .gte('created_at', from)
            .order('created_at', { ascending: false })
            .limit(200);

        if (teamId) query = query.eq('team_id', teamId);

        const { data, error } = await query;
        if (error) {
            console.error('fetchInjuryReports error:', error);
            return [];
        }
        return data || [];
    },

    async deleteInjuryReport(id: string) {
        const { error } = await (supabase as any)
            .from('injury_reports')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    // Called by public injury form (anon) — fetches athlete roster via SECURITY
    // DEFINER RPC. Anon client (see getTeamAthletes).
    async getInjuryFormData(teamId: string) {
        const db = supabasePublic as any;
        const { data, error } = await db
            .rpc('get_injury_form_data', {
                p_team_id: teamId,
            });
        if (error) throw error;
        return data as { athletes: { id: string; name: string }[] };
    },

    // --- SHARED WORKOUT VIEWS (public, anon) ---

    async getSharedWorkoutProgram(programId: string) {
        const db = supabase as any;
        const { data, error } = await db
            .rpc('get_shared_workout_program', {
                p_program_id: programId,
            });
        if (error) throw error;
        return data as { program: any } | null;
    },

    async getSharedWorkoutTemplate(templateId: string) {
        const db = supabase as any;
        const { data, error } = await db
            .rpc('get_shared_workout_template', {
                p_template_id: templateId,
            });
        if (error) throw error;
        return data as any;
    },

    async getSharedProtocol(protocolId: string) {
        const db = supabase as any;
        const { data, error } = await db
            .rpc('get_shared_protocol', {
                p_protocol_id: protocolId,
            });
        if (error) throw error;
        return data as any;
    },

    // --- PLANNED TONNAGE LOG ---
    // Written on packet/program schedule, read by Tracking Hub + Data Hub.
    async insertPlannedTonnageRows(rows: Array<{
        athlete_id: string;
        date: string;
        source_type: 'packet' | 'program';
        source_id: string;
        program_day_id?: string | null;
        total_tonnage: number;
        by_body_part: Record<string, number>;
    }>): Promise<void> {
        if (!rows || rows.length === 0) return;
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;
        if (!userId) throw new Error('Not authenticated');
        const payload = rows.map(r => ({ ...r, user_id: userId }));
        const { error } = await (supabase as any)
            .from('planned_tonnage_log')
            .insert(payload);
        if (error) throw error;
    },

    async deletePlannedTonnageForSource(sourceId: string): Promise<void> {
        const { error } = await (supabase as any)
            .rpc('delete_planned_tonnage_for_source', { p_source_id: sourceId });
        if (error) throw error;
    },

    /**
     * Bulk-shift every planned_tonnage_log row for a given source by N days.
     * Called when a coach drags a scheduled packet/program to a different
     * date — keeps Tracking Hub / Data Hub aligned with the new schedule.
     */
    async shiftTonnageDatesForSource(sourceId: string, deltaDays: number): Promise<void> {
        if (!deltaDays) return;
        const { error } = await (supabase as any)
            .rpc('shift_planned_tonnage_for_source', { p_source_id: sourceId, p_delta_days: deltaDays });
        if (error) throw error;
    },

    /**
     * Delete only FUTURE-dated tonnage rows for a source. Used on edit/delete
     * flows so historical (already-occurred) tonnage stays preserved as a
     * record — matches the user's "if its done before the assigned date" rule.
     * Cutoff is exclusive: rows with date > cutoff are removed, rows on cutoff
     * or earlier are kept. Pass today's local YYYY-MM-DD as cutoff.
     */
    async deleteFutureTonnageForSource(sourceId: string, cutoffDate: string): Promise<void> {
        const { error } = await (supabase as any)
            .from('planned_tonnage_log')
            .delete()
            .eq('source_id', sourceId)
            .gt('date', cutoffDate);
        if (error) throw error;
    },

    async fetchPlannedTonnage(dateFrom?: string, dateTo?: string): Promise<any[]> {
        // Returns this user's full planned tonnage history (limited to a sensible window).
        // Athletes filter happens client-side; one query per coach is fine at this scale.
        let q = (supabase as any).from('planned_tonnage_log').select('*');
        if (dateFrom) q = q.gte('date', dateFrom);
        if (dateTo)   q = q.lte('date', dateTo);
        q = q.order('date', { ascending: false }).limit(10000);
        const { data, error } = await q;
        if (error) { console.error('fetchPlannedTonnage error:', error); return []; }
        return data || [];
    },

    // --- DATA HUB SNAPSHOTS (shareable read-only views) ---
    async createDataHubSnapshot(name: string, payload: any): Promise<string> {
        const db = supabase as any;
        const { data, error } = await db.rpc('create_data_hub_snapshot', { p_name: name, p_data: payload });
        if (error) throw error;
        return data as string;
    },

    async getDataHubSnapshot(id: string): Promise<any | null> {
        const db = supabase as any;
        const { data, error } = await db.rpc('get_data_hub_snapshot', { p_id: id });
        if (error) throw error;
        return data ?? null;
    },

    // --- TRAINING ATTENDANCE ---

    async fetchAttendanceByTeam(teamId: string) {
        const { data, error } = await (supabase as any)
            .from('training_attendance')
            .select('*')
            .eq('team_id', teamId)
            .order('date', { ascending: false });
        if (error) throw error;
        return data as any[];
    },

    async saveAttendance(record: {
        session_id: string;
        team_id: string;
        date: string;
        absent_athlete_ids: string[];
        attendance_count: number;
        attendance_total: number;
        notes?: string;
    }) {
        const { data, error } = await (supabase as any)
            .from('training_attendance')
            .upsert(record, { onConflict: 'session_id,team_id' })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async deleteAttendance(id: string) {
        const { error } = await (supabase as any)
            .from('training_attendance')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    // --- TRAINING LOADS (ACWR) ---

    async fetchTrainingLoads(athleteId?: string) {
        // ACWR needs ~35 days of data (28-day chronic window + 7-day acute). Fetch 90 days for safety + trend visibility.
        const from = new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0];
        let query = (supabase as any).from('training_loads').select('*').gte('date', from).order('date', { ascending: false });
        if (athleteId) query = query.eq('athlete_id', athleteId);
        const { data, error } = await query;
        if (error) throw error;
        return data as any[];
    },

    async fetchTrainingLoadsByTeam(teamId: string) {
        const { data, error } = await (supabase as any)
            .from('training_loads')
            .select('*')
            .eq('team_id', teamId)
            .order('date', { ascending: false });
        if (error) throw error;
        return data as any[];
    },

    async saveTrainingLoad(record: {
        athlete_id: string;
        team_id?: string;
        date: string;
        metric_type: string;
        value: number;
        session_type?: string;
        rpe?: number;
        duration_minutes?: number;
        distance_metres?: number;
        sprint_distance_metres?: number;
        notes?: string;
    }) {
        const { data: { user } } = await supabase.auth.getUser();
        const withUser = { ...record, user_id: user?.id };
        const { data, error } = await (supabase as any)
            .from('training_loads')
            .upsert(withUser, { onConflict: 'user_id,athlete_id,date,metric_type,session_type' })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async saveTrainingLoadsBatch(records: any[]) {
        const { data: { user } } = await supabase.auth.getUser();
        const withUser = records.map(r => ({ ...r, user_id: user?.id }));
        const { data, error } = await (supabase as any)
            .from('training_loads')
            .upsert(withUser, { onConflict: 'user_id,athlete_id,date,metric_type,session_type' })
            .select();
        if (error) throw error;
        return data;
    },

    async deleteTrainingLoad(id: string) {
        const { error } = await (supabase as any)
            .from('training_loads')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    // --- ORGANISATIONS / MEMBERSHIP (Phase B) ---

    /**
     * Returns the signed-in user's organisation (id, name, tier, seat_cap, status)
     * plus their role inside it. NULL if not signed in or not yet a member.
     */
    async getCurrentOrgInfo() {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;
        if (!userId) return null;

        const { data, error } = await (supabase as any)
            .from('org_members')
            .select(`
                role,
                joined_at,
                organisation:organisations (
                    id, name, tier, seat_cap, subscription_status, subscription_period_end, created_at, settings
                )
            `)
            .eq('user_id', userId)
            .maybeSingle();

        if (error) throw error;
        if (!data) return null;

        // Count active members in the same org so AppState can decide whether
        // to render multi-user UI affordances (Mine/Org filter, Share toggle, creator badge).
        let memberCount = 1;
        if (data.organisation?.id) {
            const { count } = await (supabase as any)
                .from('org_members')
                .select('user_id', { count: 'exact', head: true })
                .eq('organisation_id', data.organisation.id);
            if (typeof count === 'number') memberCount = Math.max(1, count);
        }

        return {
            role: data.role as 'admin' | 'member',
            joined_at: data.joined_at as string,
            organisation: data.organisation,
            isAdmin: data.role === 'admin',
            memberCount,
        };
    },

    /**
     * Lists members of the caller's organisation via the SECURITY DEFINER RPC.
     * Includes auth.users email + signup metadata (full_name, first_name, surname).
     * Returns empty list if caller is not in any org.
     */
    async getOrgMembers() {
        const { data, error } = await (supabase as any).rpc('get_org_members_with_users');
        if (error) throw error;
        return (data || []) as Array<{
            member_id: string;
            user_id: string;
            role: 'admin' | 'member';
            joined_at: string;
            invited_by: string | null;
            email: string;
            full_name: string;
            first_name: string | null;
            surname: string | null;
        }>;
    },

    /**
     * Lists pending (non-accepted, non-revoked, non-expired) invitations
     * for the caller's organisation. RLS scopes this to current org.
     */
    async getOrgPendingInvitations() {
        const nowIso = new Date().toISOString();
        const { data, error } = await (supabase as any)
            .from('org_invitations')
            .select('id, email, role, created_at, expires_at')
            .is('accepted_at', null)
            .is('revoked_at', null)
            .gt('expires_at', nowIso)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []) as Array<{
            id: string;
            email: string;
            role: 'admin' | 'member';
            created_at: string;
            expires_at: string;
        }>;
    },

    /**
     * Updates the organisation name. RLS allows only admins of the caller's
     * own organisation; non-admins will get a permissions error from the DB.
     */
    /**
     * Admin-only. Creates a pending invitation for an email, returns the
     * token + expires_at so the caller can build/copy the magic-link URL.
     * Server-side validates: caller is admin, seat cap, no duplicate invite,
     * email isn't already in another org.
     */
    async createOrgInvitation(email: string, role: 'admin' | 'member' = 'member') {
        const { data, error } = await (supabase as any).rpc('create_org_invitation', {
            p_email: email,
            p_role: role,
        });
        if (error) throw error;
        const row = Array.isArray(data) ? data[0] : data;
        return row as { id: string; token: string; expires_at: string; organisation_id: string };
    },

    async revokeOrgInvitation(invitationId: string) {
        const { error } = await (supabase as any).rpc('revoke_org_invitation', {
            p_invitation_id: invitationId,
        });
        if (error) throw error;
    },

    /**
     * Pre-invite check (admin-only). Tells the caller whether the target email
     * already has an account + whether that account is already in another
     * organisation. Used by the invite UI to surface clear warnings BEFORE
     * we send the invite — otherwise the invitee may receive an invite that
     * fails to accept due to the one-user-one-org constraint.
     */
    async checkInviteEmail(email: string) {
        const { data, error } = await (supabase as any).rpc('check_invite_email', {
            p_email: email,
        });
        if (error) throw error;
        const row = Array.isArray(data) ? data[0] : data;
        return row as {
            user_exists: boolean;
            user_id: string | null;
            has_other_org: boolean;
            other_org_id: string | null;
            other_org_name: string | null;
            other_org_has_data: boolean;
        };
    },

    /**
     * Public — no auth required. Looks up an invitation by its token for the
     * accept-invite landing page. Returns is_valid + a reason if not.
     */
    async getInvitationInfo(token: string) {
        const { data, error } = await (supabase as any).rpc('get_invitation_info', {
            p_token: token,
        });
        if (error) throw error;
        const row = Array.isArray(data) ? data[0] : data;
        return row as {
            organisation_name: string | null;
            role: 'admin' | 'member' | null;
            email: string | null;
            expires_at: string | null;
            is_valid: boolean;
            invalid_reason: string | null;
        };
    },

    /**
     * Called by a signed-in user to redeem their invitation token. Server-side
     * validates: token still valid, email matches signed-in user, etc.
     */
    async acceptOrgInvitation(token: string) {
        const { data, error } = await (supabase as any).rpc('accept_org_invitation', {
            p_token: token,
        });
        if (error) throw error;
        const row = Array.isArray(data) ? data[0] : data;
        return row as { organisation_id: string; role: 'admin' | 'member' };
    },

    async removeOrgMember(memberId: string) {
        const { error } = await (supabase as any).rpc('remove_org_member', {
            p_member_id: memberId,
        });
        if (error) throw error;
    },

    async changeMemberRole(memberId: string, newRole: 'admin' | 'member') {
        const { error } = await (supabase as any).rpc('change_member_role', {
            p_member_id: memberId,
            p_new_role: newRole,
        });
        if (error) throw error;
    },

    async transferAdmin(toMemberId: string) {
        const { error } = await (supabase as any).rpc('transfer_admin', {
            p_to_member_id: toMemberId,
        });
        if (error) throw error;
    },

    /**
     * Admin-only. Uses the SECURITY DEFINER RPC update_org_name which:
     *   - re-validates admin permission server-side (defence in depth)
     *   - writes an entry to org_audit_log so the rename shows up in
     *     the Settings Activity panel
     */
    async updateOrgName(newName: string) {
        const trimmed = (newName || '').trim();
        if (!trimmed) throw new Error('Organisation name cannot be empty');
        const { error } = await (supabase as any).rpc('update_org_name', { p_new_name: trimmed });
        if (error) throw error;
        return { ok: true };
    },

    /**
     * Returns the most recent org_audit_log entries for the caller's
     * organisation. Used by the Settings → Organisation Activity panel.
     */
    async getOrgAuditLog(limit: number = 50) {
        const { data, error } = await (supabase as any).rpc('get_org_audit_log', { p_limit: limit });
        if (error) throw error;
        return (data || []) as Array<{
            id: string;
            action:
                | 'org_renamed'
                | 'invite_created'
                | 'invite_revoked'
                | 'invite_accepted'
                | 'member_removed'
                | 'role_changed'
                | 'admin_transferred';
            actor_user_id: string | null;
            actor_email: string | null;
            target_user_id: string | null;
            target_email: string | null;
            metadata: any;
            created_at: string;
        }>;
    },
};