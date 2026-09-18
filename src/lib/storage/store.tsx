'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Subject, RecurrentClass, Activity, CreateSubjectInput, CreateActivityInput } from '@/types/database.types';
import { INITIAL_SUBJECTS, INITIAL_RECURRENT_CLASSES, getInitialActivities } from './initial-data';

interface MemoriaContextType {
  subjects: Subject[];
  recurrentClasses: RecurrentClass[];
  activities: Activity[];
  isLoaded: boolean;
  addSubject: (input: CreateSubjectInput, scheduleSlots?: Array<{ day_of_week: number; start_time: string; end_time: string; classroom?: string }>) => Subject;
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
  const [subjects, setSubjects] = useState<Subject[]>(INITIAL_SUBJECTS);
  const [recurrentClasses, setRecurrentClasses] = useState<RecurrentClass[]>(INITIAL_RECURRENT_CLASSES);
  const [activities, setActivities] = useState<Activity[]>(getInitialActivities());
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage or initial seed
  useEffect(() => {
    try {
      const storedSubs = localStorage.getItem('memoria_v2_subjects');
      const storedClasses = localStorage.getItem('memoria_v2_classes');
      const storedActivities = localStorage.getItem('memoria_v2_activities');

      if (storedSubs && storedClasses && storedActivities) {
        setSubjects(JSON.parse(storedSubs));
        setRecurrentClasses(JSON.parse(storedClasses));
        setActivities(JSON.parse(storedActivities));
      } else {
        // Clean any old v1 keys
        localStorage.removeItem('memoria_subjects');
        localStorage.removeItem('memoria_classes');
        localStorage.removeItem('memoria_activities');

        setSubjects(INITIAL_SUBJECTS);
        setRecurrentClasses(INITIAL_RECURRENT_CLASSES);
        setActivities(getInitialActivities());
      }
    } catch (e) {
      console.warn('Could not read from localStorage, using memory defaults', e);
      setSubjects(INITIAL_SUBJECTS);
      setRecurrentClasses(INITIAL_RECURRENT_CLASSES);
      setActivities(getInitialActivities());
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save to localStorage whenever state changes
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem('memoria_v2_subjects', JSON.stringify(subjects));
      localStorage.setItem('memoria_v2_classes', JSON.stringify(recurrentClasses));
      localStorage.setItem('memoria_v2_activities', JSON.stringify(activities));
    } catch (e) {
      console.error('Error saving to localStorage', e);
    }
  }, [subjects, recurrentClasses, activities, isLoaded]);

  const addSubject = (
    input: CreateSubjectInput,
    scheduleSlots: Array<{ day_of_week: number; start_time: string; end_time: string; classroom?: string }> = []
  ): Subject => {
    const newSub: Subject = {
      id: `sub-${Date.now()}`,
      user_id: 'default-user',
      ...input,
      is_active: input.is_active ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setSubjects((prev) => [...prev, newSub]);

    if (scheduleSlots.length > 0) {
      const newClasses: RecurrentClass[] = scheduleSlots.map((slot, idx) => ({
        id: `rec-${Date.now()}-${idx}`,
        user_id: 'default-user',
        subject_id: newSub.id,
        day_of_week: slot.day_of_week,
        start_time: slot.start_time,
        end_time: slot.end_time,
        classroom: slot.classroom || newSub.classroom || null,
        created_at: new Date().toISOString(),
        subject: newSub,
      }));
      setRecurrentClasses((prev) => [...prev, ...newClasses]);
    }

    return newSub;
  };

  const updateSubject = (id: string, input: Partial<CreateSubjectInput>) => {
    setSubjects((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...input, updated_at: new Date().toISOString() } : s))
    );
  };

  const deleteSubject = (id: string) => {
    setSubjects((prev) => prev.filter((s) => s.id !== id));
    setRecurrentClasses((prev) => prev.filter((c) => c.subject_id !== id));
    setActivities((prev) => prev.filter((a) => a.subject_id !== id));
  };

  const addRecurrentClass = (classData: Omit<RecurrentClass, 'id' | 'user_id' | 'created_at'>) => {
    const subject = subjects.find((s) => s.id === classData.subject_id);
    const newClass: RecurrentClass = {
      id: `rec-${Date.now()}`,
      user_id: 'default-user',
      ...classData,
      created_at: new Date().toISOString(),
      subject,
    };
    setRecurrentClasses((prev) => [...prev, newClass]);
  };

  const deleteRecurrentClass = (id: string) => {
    setRecurrentClasses((prev) => prev.filter((c) => c.id !== id));
  };

  const addActivity = (input: CreateActivityInput): Activity => {
    const subject = input.subject_id ? subjects.find((s) => s.id === input.subject_id) : null;
    const newActivity: Activity = {
      id: `act-${Date.now()}`,
      user_id: 'default-user',
      ...input,
      status: input.status || 'pending',
      metadata: input.metadata || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      subject,
    };
    setActivities((prev) => [newActivity, ...prev]);
    return newActivity;
  };

  const updateActivity = (id: string, input: Partial<CreateActivityInput>) => {
    setActivities((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        const subject = input.subject_id !== undefined
          ? (input.subject_id ? subjects.find((s) => s.id === input.subject_id) : null)
          : a.subject;
        return {
          ...a,
          ...input,
          subject,
          updated_at: new Date().toISOString(),
        };
      })
    );
  };

  const deleteActivity = (id: string) => {
    setActivities((prev) => prev.filter((a) => a.id !== id));
  };

  const toggleActivityStatus = (id: string) => {
    setActivities((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        const nextStatus = a.status === 'completed' ? 'pending' : 'completed';
        return { ...a, status: nextStatus, updated_at: new Date().toISOString() };
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
