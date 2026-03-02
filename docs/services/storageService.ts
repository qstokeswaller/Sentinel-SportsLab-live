/**
 * SupabaseStorageService
 *
 * Drop-in replacement for the old StorageService (localStorage / Express API).
 * Stores all app data as JSONB blobs in the user_data table, keyed per user.
 * Falls back to localStorage if the user is not authenticated.
 *
 * The interface is identical to the original StorageService so App.tsx
 * requires no changes beyond importing this and swapping the reference.
 */
import { supabase } from '../lib/supabase';

const get = async (key: string): Promise<any[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      const raw = localStorage.getItem(`traineros_${key}`);
      return raw ? JSON.parse(raw) : [];
    }

    const { data, error } = await (supabase as any)
      .from('user_data')
      .select('value')
      .eq('user_id', user.id)
      .eq('key', key)
      .maybeSingle();

    if (error) {
      console.warn(`Supabase read error for key "${key}":`, error.message);
      const raw = localStorage.getItem(`traineros_${key}`);
      return raw ? JSON.parse(raw) : [];
    }

    return (data?.value as any[]) ?? [];
  } catch (err) {
    console.warn(`Critical error reading key "${key}" from Supabase:`, err);
    try {
      const raw = localStorage.getItem(`traineros_${key}`);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }
};

const save = async (key: string, value: any): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      localStorage.setItem(`traineros_${key}`, JSON.stringify(value));
      return;
    }

    const { error } = await (supabase as any)
      .from('user_data')
      .upsert(
        { user_id: user.id, key, value, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,key' }
      );

    if (error) {
      console.error(`Supabase save error for key "${key}":`, error.message);
      localStorage.setItem(`traineros_${key}`, JSON.stringify(value));
    }
  } catch (err) {
    console.error(`Critical error saving key "${key}" to Supabase:`, err);
    try { localStorage.setItem(`traineros_${key}`, JSON.stringify(value)); } catch { }
  }
};

export const SupabaseStorageService = {
  init: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    console.log(`StorageService: ${user ? 'Connected to Supabase ✓' : 'No user — using localStorage fallback'}`);
  },

  get,
  save,

  getTeams: () => get('teams'),
  saveTeams: (d: any) => save('teams', d),
  getExercises: () => get('exercises'),
  saveExercises: (d: any) => save('exercises', d),
  getSessions: () => get('sessions'),
  saveSessions: (d: any) => save('sessions', d),
  getProtocols: () => get('protocols'),
  saveProtocols: (d: any) => save('protocols', d),
  getQuestionnaires: () => get('questionnaires'),
  saveQuestionnaires: (d: any) => save('questionnaires', d),
  getGpsData: () => get('gps_data'),
  saveGpsData: (d: any) => save('gps_data', d),
  getWattbikeSessions: () => get('wattbike_sessions'),
  saveWattbikeSessions: (d: any) => save('wattbike_sessions', d),
  getMedicalReports: () => get('medical_reports'),
  saveMedicalReports: (d: any) => save('medical_reports', d),
  getLoadRecords: () => get('load_records'),
  saveLoadRecords: (d: any) => save('load_records', d),
  getWellnessData: () => get('wellness_data'),
  saveWellnessData: (d: any) => save('wellness_data', d),
  getBiometrics: () => get('biometrics'),
  saveBiometrics: (d: any) => save('biometrics', d),
  getWorkoutLog: () => get('workout_log'),
  saveWorkoutLog: (d: any) => save('workout_log', d),
};
