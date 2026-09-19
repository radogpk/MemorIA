import { createClient } from './client';
import { UserProfile, Subject, RecurrentClass, Activity, CreateSubjectInput, CreateActivityInput } from '@/types/database.types';

export const GERARDO_PROFILE_ID = '727db856-313b-4c91-91e4-7fac976dfc6d';
export const EVEBEBE_PROFILE_ID = '1e12d23b-f0b2-49d4-ae4b-b602226c7d14';

export const DEFAULT_PROFILES: UserProfile[] = [
  {
    id: GERARDO_PROFILE_ID,
    name: 'Gerardo',
    nickname: 'Gerardo',
    avatar_color: '#3b82f6',
    role: 'owner',
    created_at: new Date().toISOString(),
  },
  {
    id: EVEBEBE_PROFILE_ID,
    name: 'Evebebé',
    nickname: 'Evebebé 💖',
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
    // Only send flat columns, never nested joins
    const { created_at, updated_at, ...rest } = subject as any;
    await supabase.from('subjects').upsert({
      ...rest,
      created_at,
      updated_at,
    });
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
    // Strip nested subject object — only flat DB columns
    const { subject: _subject, ...flatClass } = recurrentClass;
    await supabase.from('recurrent_classes').upsert(flatClass);
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
    // Strip nested subject object — only flat DB columns
    const { subject: _subject, ...flatActivity } = activity;
    await supabase.from('activities').upsert(flatActivity);
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

