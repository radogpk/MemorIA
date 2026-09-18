'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  Subject,
  RecurrentClass,
  Activity,
  CreateSubjectInput,
  CreateActivityInput,
  UserProfile,
} from '@/types/database.types';
import { DuoViewMode } from '@/lib/calendar/types';
import {
  DEFAULT_PROFILES,
  fetchProfiles,
  fetchSubjectsFromSupabase,
  fetchRecurrentClassesFromSupabase,
  fetchActivitiesFromSupabase,
  syncSubjectToSupabase,
  deleteSubjectFromSupabase,
  syncRecurrentClassToSupabase,
  deleteRecurrentClassFromSupabase,
  syncActivityToSupabase,
  deleteActivityFromSupabase,
} from '@/lib/supabase/data';
import { INITIAL_SUBJECTS, INITIAL_RECURRENT_CLASSES, getInitialActivities } from './initial-data';

interface MemoriaContextType {
  subjects: Subject[];
  recurrentClasses: RecurrentClass[];
  activities: Activity[];
  isLoaded: boolean;

  // Duo / Multi-user profile management
  profiles: UserProfile[];
  activeProfile: UserProfile;
  partnerProfile?: UserProfile;
  viewMode: DuoViewMode; // 'mine' | 'partner' | 'both'
  setActiveProfile: (profile: UserProfile) => void;
  setViewMode: (mode: DuoViewMode) => void;
  updateProfile: (id: string, updates: Partial<UserProfile>) => void;

  // Data operations
  addSubject: (
    input: CreateSubjectInput,
    scheduleSlots?: Array<{ day_of_week: number; start_time: string; end_time: string; classroom?: string }>,
    profileId?: string
  ) => Subject;
  updateSubject: (id: string, input: Partial<CreateSubjectInput>) => void;
  deleteSubject: (id: string) => void;
  addRecurrentClass: (classData: Omit<RecurrentClass, 'id' | 'user_id' | 'created_at'>) => void;
  deleteRecurrentClass: (id: string) => void;
  addActivity: (input: CreateActivityInput) => Activity;
  updateActivity: (id: string, input: Partial<CreateActivityInput>) => void;
  deleteActivity: (id: string) => void;
  toggleActivityStatus: (id: string) => void;
}

const MemoriaContext = createContext<MemoriaContextType | null>(null);

export function MemoriaProvider({ children }: { children: React.ReactNode }) {
  const [profiles, setProfiles] = useState<UserProfile[]>(DEFAULT_PROFILES);
  const [activeProfile, setActiveProfileState] = useState<UserProfile>(DEFAULT_PROFILES[0]);
  const [viewMode, setViewModeState] = useState<DuoViewMode>('both');

  const [subjects, setSubjects] = useState<Subject[]>(INITIAL_SUBJECTS);
  const [recurrentClasses, setRecurrentClasses] = useState<RecurrentClass[]>(INITIAL_RECURRENT_CLASSES);
  const [activities, setActivities] = useState<Activity[]>(getInitialActivities());
  const [isLoaded, setIsLoaded] = useState(false);

  // Partner profile helper
  const partnerProfile = useMemo(() => {
    return profiles.find((p) => p.id !== activeProfile.id) || profiles[1];
  }, [profiles, activeProfile]);

  // Load from localStorage or defaults, and fetch Supabase profiles in background
  useEffect(() => {
    try {
      // 1. Profiles & Active profile
      const storedProfiles = localStorage.getItem('memoria_profiles');
      const storedActiveId = localStorage.getItem('memoria_active_profile_id');
      const storedViewMode = localStorage.getItem('memoria_duo_view_mode') as DuoViewMode | null;

      let currentProfiles = DEFAULT_PROFILES;
      if (storedProfiles) {
        try {
          const parsed = JSON.parse(storedProfiles);
          const hasOldData = parsed.some((p: any) => p.name === 'Luis' || p.id === 'prof-luis');
          if (Array.isArray(parsed) && parsed.length > 0 && !hasOldData) {
            currentProfiles = parsed;
          } else {
            localStorage.removeItem('memoria_profiles');
            localStorage.removeItem('memoria_active_profile_id');
          }
        } catch {}
      }
      setProfiles(currentProfiles);

      if (storedActiveId) {
        const found = currentProfiles.find((p) => p.id === storedActiveId);
        if (found) setActiveProfileState(found);
        else setActiveProfileState(currentProfiles[0]);
      } else {
        setActiveProfileState(currentProfiles[0]);
      }

      if (storedViewMode && ['mine', 'partner', 'both'].includes(storedViewMode)) {
        setViewModeState(storedViewMode);
      }

      // 2. Subjects, classes & activities
      const storedSubs = localStorage.getItem('memoria_v3_subjects');
      const storedClasses = localStorage.getItem('memoria_v3_classes');
      const storedActivities = localStorage.getItem('memoria_v3_activities');

      if (storedSubs && storedClasses && storedActivities) {
        setSubjects(JSON.parse(storedSubs));
        setRecurrentClasses(JSON.parse(storedClasses));
        setActivities(JSON.parse(storedActivities));
      } else {
        setSubjects(INITIAL_SUBJECTS);
        setRecurrentClasses(INITIAL_RECURRENT_CLASSES);
        setActivities(getInitialActivities());
      }
    } catch (e) {
      console.warn('Could not read from localStorage, using defaults', e);
      setSubjects(INITIAL_SUBJECTS);
      setRecurrentClasses(INITIAL_RECURRENT_CLASSES);
      setActivities(getInitialActivities());
    } finally {
      setIsLoaded(true);
    }

    // Try background fetch of profiles, subjects, classes and activities from Supabase
    fetchProfiles().then((remoteProfiles) => {
      if (remoteProfiles && remoteProfiles.length > 0) {
        // Direct replacement: exactly the registered profiles, no duplicates!
        setProfiles(remoteProfiles);
        try {
          localStorage.setItem('memoria_profiles', JSON.stringify(remoteProfiles));
        } catch {}

        setActiveProfileState((prevActive) => {
          const matching =
            remoteProfiles.find((p) => p.id === prevActive.id) ||
            remoteProfiles.find((p) => p.role === prevActive.role) ||
            remoteProfiles[0];
          try {
            localStorage.setItem('memoria_active_profile_id', matching.id);
          } catch {}
          return matching;
        });
      }
    });

    Promise.all([
      fetchSubjectsFromSupabase(),
      fetchRecurrentClassesFromSupabase(),
      fetchActivitiesFromSupabase(),
    ]).then(([remSubs, remClasses, remActs]) => {
      if (remSubs && remSubs.length > 0) setSubjects(remSubs);
      if (remClasses && remClasses.length > 0) setRecurrentClasses(remClasses);
      if (remActs && remActs.length > 0) setActivities(remActs);
    });
  }, []);

  // Save to localStorage whenever state changes
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem('memoria_profiles', JSON.stringify(profiles));
      localStorage.setItem('memoria_active_profile_id', activeProfile.id);
      localStorage.setItem('memoria_duo_view_mode', viewMode);
      localStorage.setItem('memoria_v3_subjects', JSON.stringify(subjects));
      localStorage.setItem('memoria_v3_classes', JSON.stringify(recurrentClasses));
      localStorage.setItem('memoria_v3_activities', JSON.stringify(activities));
    } catch (e) {
      console.error('Error saving to localStorage', e);
    }
  }, [profiles, activeProfile, viewMode, subjects, recurrentClasses, activities, isLoaded]);

  const setActiveProfile = (profile: UserProfile) => {
    setActiveProfileState(profile);
    try {
      localStorage.setItem('memoria_active_profile_id', profile.id);
    } catch {}
  };

  const setViewMode = (mode: DuoViewMode) => {
    setViewModeState(mode);
    try {
      localStorage.setItem('memoria_duo_view_mode', mode);
    } catch {}
  };

  const updateProfile = (id: string, updates: Partial<UserProfile>) => {
    setProfiles((prev) => {
      const updated = prev.map((p) => (p.id === id ? { ...p, ...updates } : p));
      if (activeProfile.id === id) {
        setActiveProfileState({ ...activeProfile, ...updates });
      }
      return updated;
    });
  };

  const addSubject = (
    input: CreateSubjectInput,
    scheduleSlots: Array<{ day_of_week: number; start_time: string; end_time: string; classroom?: string }> = [],
    profileId?: string
  ): Subject => {
    const targetProfileId = profileId || input.profile_id || activeProfile.id;

    const newSub: Subject = {
      id: `sub-${Date.now()}`,
      user_id: 'default-user',
      profile_id: targetProfileId,
      ...input,
      is_active: input.is_active ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setSubjects((prev) => [...prev, newSub]);
    syncSubjectToSupabase(newSub);

    if (scheduleSlots.length > 0) {
      const newClasses: RecurrentClass[] = scheduleSlots.map((slot, idx) => {
        const rc: RecurrentClass = {
          id: `rec-${Date.now()}-${idx}`,
          user_id: 'default-user',
          profile_id: targetProfileId,
          subject_id: newSub.id,
          day_of_week: slot.day_of_week,
          start_time: slot.start_time,
          end_time: slot.end_time,
          classroom: slot.classroom || newSub.classroom || null,
          created_at: new Date().toISOString(),
          subject: newSub,
        };
        syncRecurrentClassToSupabase(rc);
        return rc;
      });
      setRecurrentClasses((prev) => [...prev, ...newClasses]);
    }

    return newSub;
  };

  const updateSubject = (id: string, input: Partial<CreateSubjectInput>) => {
    setSubjects((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const updated = { ...s, ...input, updated_at: new Date().toISOString() };
        syncSubjectToSupabase(updated);
        return updated;
      })
    );
  };

  const deleteSubject = (id: string) => {
    setSubjects((prev) => prev.filter((s) => s.id !== id));
    setRecurrentClasses((prev) => prev.filter((c) => c.subject_id !== id));
    setActivities((prev) => prev.filter((a) => a.subject_id !== id));
    deleteSubjectFromSupabase(id);
  };

  const addRecurrentClass = (classData: Omit<RecurrentClass, 'id' | 'user_id' | 'created_at'>) => {
    const subject = subjects.find((s) => s.id === classData.subject_id);
    const newClass: RecurrentClass = {
      id: `rec-${Date.now()}`,
      user_id: 'default-user',
      profile_id: classData.profile_id || subject?.profile_id || activeProfile.id,
      ...classData,
      created_at: new Date().toISOString(),
      subject,
    };
    setRecurrentClasses((prev) => [...prev, newClass]);
    syncRecurrentClassToSupabase(newClass);
  };

  const deleteRecurrentClass = (id: string) => {
    setRecurrentClasses((prev) => prev.filter((c) => c.id !== id));
    deleteRecurrentClassFromSupabase(id);
  };

  const addActivity = (input: CreateActivityInput): Activity => {
    const subject = input.subject_id ? subjects.find((s) => s.id === input.subject_id) : null;
    const newActivity: Activity = {
      id: `act-${Date.now()}`,
      user_id: 'default-user',
      profile_id: input.profile_id || activeProfile.id,
      is_shared: input.is_shared ?? false,
      ...input,
      status: input.status || 'pending',
      metadata: input.metadata || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      subject,
    };
    setActivities((prev) => [newActivity, ...prev]);
    syncActivityToSupabase(newActivity);
    return newActivity;
  };

  const updateActivity = (id: string, input: Partial<CreateActivityInput>) => {
    setActivities((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        const subject =
          input.subject_id !== undefined
            ? input.subject_id
              ? subjects.find((s) => s.id === input.subject_id)
              : null
            : a.subject;
        const updated: Activity = {
          ...a,
          ...input,
          subject,
          updated_at: new Date().toISOString(),
        };
        syncActivityToSupabase(updated);
        return updated;
      })
    );
  };

  const deleteActivity = (id: string) => {
    setActivities((prev) => prev.filter((a) => a.id !== id));
    deleteActivityFromSupabase(id);
  };

  const toggleActivityStatus = (id: string) => {
    setActivities((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        const nextStatus = a.status === 'completed' ? 'pending' : 'completed';
        const updated: Activity = { ...a, status: nextStatus, updated_at: new Date().toISOString() };
        syncActivityToSupabase(updated);
        return updated;
      })
    );
  };

  return (
    <MemoriaContext.Provider
      value={{
        subjects,
        recurrentClasses,
        activities,
        isLoaded,
        profiles,
        activeProfile,
        partnerProfile,
        viewMode,
        setActiveProfile,
        setViewMode,
        updateProfile,
        addSubject,
        updateSubject,
        deleteSubject,
        addRecurrentClass,
        deleteRecurrentClass,
        addActivity,
        updateActivity,
        deleteActivity,
        toggleActivityStatus,
      }}
    >
      {children}
    </MemoriaContext.Provider>
  );
}

export function useMemoria() {
  const context = useContext(MemoriaContext);
  if (!context) {
    throw new Error('useMemoria must be used within a MemoriaProvider');
  }
  return context;
}
