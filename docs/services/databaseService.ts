import { supabase } from '../lib/supabase';

export const DatabaseService = {
    // --- TEAMS ---
    async fetchTeams() {
        const { data, error } = await supabase
            .from('teams')
            .select(`
        *,
        athletes (*)
      `);
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

    // --- ASSESSMENTS ---
    async fetchAssessments(testType?: string) {
        let query = supabase.from('assessments').select('*').order('date', { ascending: false });
        if (testType) query = query.eq('test_type', testType);
        const { data, error } = await query;
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
};
