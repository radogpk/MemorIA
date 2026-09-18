import { createClient } from './client';
import { UserProfile, Subject, RecurrentClass, Activity, CreateSubjectInput, CreateActivityInput } from '@/types/database.types';

export const DEFAULT_PROFILES: UserProfile[] = [
  {
    id: 'prof-luis',
    name: 'Luis',
    nickname: 'Luis',
    avatar_color: '#3b82f6',
    role: 'owner',
    created_at: new Date().toISOString(),
  },
  {
    id: 'prof-novia',
    name: 'Mi Novia',
    nickname: 'Amor 💖',
    avatar_color: '#ec4899',
    role: 'partner',
    created_at: new Date().toISOString(),
  },
];

export async function fetchProfiles(): Promise<UserProfile[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.from('user_profiles').select('*').order('created_at', { ascending: true });
    if (error || !data || data.length === 0) {
      return DEFAULT_PROFILES;
    }
    return data as UserProfile[];
  } catch {
    return DEFAULT_PROFILES;
  }
}

export async function createProfile(profile: Omit<UserProfile, 'id' | 'created_at'>): Promise<UserProfile | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.from('user_profiles').insert(profile).select().single();
    if (error) throw error;
    return data as UserProfile;
  } catch (err) {
    console.warn('Error creating profile in Supabase:', err);
    return null;
  }
}

export async function syncSubjectToSupabase(subject: Subject) {
  try {
    const supabase = createClient();
    await supabase.from('subjects').upsert(subject);
  } catch (err) {
    console.warn('Error syncing subject to Supabase:', err);
  }
}

export async function deleteSubjectFromSupabase(id: string) {
  try {
    const supabase = createClient();
    await supabase.from('subjects').delete().eq('id', id);
  } catch (err) {
    console.warn('Error deleting subject from Supabase:', err);
  }
}

export async function syncRecurrentClassToSupabase(recurrentClass: RecurrentClass) {
  try {
    const supabase = createClient();
    await supabase.from('recurrent_classes').upsert(recurrentClass);
  } catch (err) {
    console.warn('Error syncing recurrent class to Supabase:', err);
  }
}

export async function deleteRecurrentClassFromSupabase(id: string) {
  try {
    const supabase = createClient();
    await supabase.from('recurrent_classes').delete().eq('id', id);
  } catch (err) {
    console.warn('Error deleting recurrent class from Supabase:', err);
  }
}

export async function syncActivityToSupabase(activity: Activity) {
  try {
    const supabase = createClient();
    await supabase.from('activities').upsert(activity);
  } catch (err) {
    console.warn('Error syncing activity to Supabase:', err);
  }
}

export async function deleteActivityFromSupabase(id: string) {
  try {
    const supabase = createClient();
    await supabase.from('activities').delete().eq('id', id);
  } catch (err) {
    console.warn('Error deleting activity from Supabase:', err);
  }
}

export async function fetchSubjectsFromSupabase(): Promise<Subject[] | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.from('subjects').select('*').order('created_at', { ascending: true });
    if (error || !data || data.length === 0) return null;
    return data as Subject[];
  } catch {
    return null;
  }
}

export async function fetchRecurrentClassesFromSupabase(): Promise<RecurrentClass[] | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('recurrent_classes')
      .select('*, subject:subjects(*)')
      .order('day_of_week', { ascending: true });
    if (error || !data || data.length === 0) return null;
    return data as RecurrentClass[];
  } catch {
    return null;
  }
}

export async function fetchActivitiesFromSupabase(): Promise<Activity[] | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('activities')
      .select('*, subject:subjects(*)')
      .order('start_datetime', { ascending: true });
    if (error || !data || data.length === 0) return null;
    return data as Activity[];
  } catch {
    return null;
  }
}

