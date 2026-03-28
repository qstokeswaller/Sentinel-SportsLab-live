import { supabase } from '../lib/supabase';

export const DatabaseService = {
    // --- TEAMS ---
    async fetchTeams() {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;
        let query = supabase.from('teams').select('*, athletes (*)');
        if (userId) query = query.eq('user_id', userId);
        const { data, error } = await query;
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
    async fetchAthletes() {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;
        let query = supabase.from('athletes').select('*');
        if (userId) query = query.eq('user_id', userId);
        const { data, error } = await query;
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

    async createAthlete(athleteData: { name: string; team_id?: string; gender?: string; age?: number; height_cm?: number; weight_kg?: number; sport?: string; position?: string; goals?: string; notes?: string }) {
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

    // --- EXERCISES ---
    async fetchExercises() {
        const { data, error } = await supabase
            .from('exercises')
            .select('*');
        if (error) throw error;
        return data;
    },

    // --- SESSIONS ---
    async fetchSessions() {
        const { data, error } = await supabase
            .from('scheduled_sessions')
            .select('*');
        console.log('[fetchSessions] data:', data?.length, 'error:', error);
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

    // --- WORKOUT TEMPLATES ---
    async fetchWorkoutTemplates() {
        const { data, error } = await (supabase as any)
            .from('workout_templates')
            .select('*')
            .order('created_at', { ascending: false });
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
    async fetchCalendarEvents() {
        const { data, error } = await (supabase as any)
            .from('calendar_events')
            .select('*')
            .order('start_date', { ascending: true });
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
        let query = supabase.from('assessments').select('*').order('date', { ascending: false });
        if (testType) query = query.eq('test_type', testType);
        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    async fetchRmAssessments() {
        const { data, error } = await supabase
            .from('assessments')
            .select('*')
            .in('test_type', ['1rm', 'rm_back_squat', 'rm_bench_press', 'rm_deadlift', 'rm_front_squat', 'rm_ohp'])
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
            query = query.or(`team_id.eq.${teamId},team_id.is.null`);
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
    async resolveShareSessionId(teamId: string, templateId: string): Promise<string | null> {
        const db = supabase as any;
        const { data, error } = await db.rpc('resolve_share_session_id', {
            p_team_id: teamId,
            p_template_id: templateId,
        });
        if (error) { console.error('resolveShareSessionId error:', error); return null; }
        return data as string | null;
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
    }) {
        const db = supabase as any;
        const { data, error } = await db
            .from('wellness_responses')
            .insert(response)
            .select()
            .single();
        if (error) throw error;
        return data;
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

    async fetchWellnessResponsesByAthlete(athleteId: string, dateFrom?: string, dateTo?: string) {
        const db = supabase as any;
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

    // Called by public form (anon) — fetches template + athlete names via SECURITY DEFINER RPC
    async getWellnessFormData(templateId: string, teamId: string) {
        const db = supabase as any;
        const { data, error } = await db
            .rpc('get_wellness_form_data', {
                p_template_id: templateId,
                p_team_id: teamId,
            });
        if (error) throw error;
        return data as { template: any; athletes: { id: string; name: string }[] };
    },

    // --- INJURY REPORTS ---

    async saveInjuryReport(report: {
        user_id?: string;
        team_id: string;
        athlete_id: string;
        athlete_name: string;
        date_of_injury: string;
        report_data: Record<string, any>;
    }) {
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
        let query = db
            .from('injury_reports')
            .select('*')
            .order('created_at', { ascending: false });

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

    // Called by public injury form (anon) — fetches athlete roster via SECURITY DEFINER RPC
    async getInjuryFormData(teamId: string) {
        const db = supabase as any;
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
};
