'use client';

import React, { useState, useMemo } from 'react';
import { useMemoria } from '@/lib/storage/store';
import { CalendarViewMode, CalendarEvent } from '@/lib/calendar/types';
import { CalendarHeader } from '@/components/calendar/CalendarHeader';
import { CalendarFilterBar } from '@/components/calendar/CalendarFilterBar';
import { WeekView } from '@/components/calendar/WeekView';
import { DayView } from '@/components/calendar/DayView';
import { MonthView } from '@/components/calendar/MonthView';
import { ActivityModal } from '@/components/tasks/ActivityModal';
import { QuickAddModal } from '@/components/ai/QuickAddModal';
import { SmartStudyPlannerModal } from '@/components/calendar/SmartStudyPlannerModal';
import { generateIcsCalendarContent, downloadIcsFile } from '@/lib/calendar/ics-export';
import {
  projectRecurrentClassesForRange,
  detectCollisions,
  formatActivitiesToCalendarEvents,
} from '@/lib/calendar/projection';
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  addWeeks,
  addMonths,
} from 'date-fns';
import { Activity } from '@/types/database.types';
import { AlertTriangle } from 'lucide-react';

export default function CalendarPage() {
  const {
    subjects,
    recurrentClasses,
    activities,
    toggleActivityStatus,
    viewMode: duoMode,
    activeProfile,
    partnerProfile,
  } = useMemoria();

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('week');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  // Modals state
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ date: Date; hour: number } | null>(null);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isStudyPlannerOpen, setIsStudyPlannerOpen] = useState(false);

  // Date range determination based on view mode
  const { rangeStart, rangeEnd } = useMemo(() => {
    if (viewMode === 'day') {
      const start = new Date(currentDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(currentDate);
      end.setHours(23, 59, 59, 999);
      return { rangeStart: start, rangeEnd: end };
    } else if (viewMode === 'month') {
      const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
      const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
      return { rangeStart: start, rangeEnd: end };
    } else {
      // 'week'
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return { rangeStart: start, rangeEnd: end };
    }
  }, [currentDate, viewMode]);

  // Project recurrent classes into active range
  const projectedClasses = useMemo(() => {
    return projectRecurrentClassesForRange(recurrentClasses, rangeStart, rangeEnd);
  }, [recurrentClasses, rangeStart, rangeEnd]);

  // Detect collisions
  const collisions = useMemo(() => {
    return detectCollisions(activities, projectedClasses);
  }, [activities, projectedClasses]);

  // Combine projected classes and activities into calendar events
  const allEvents: CalendarEvent[] = useMemo(() => {
    const formattedActivities = formatActivitiesToCalendarEvents(activities, collisions);
    const combined = [...projectedClasses, ...formattedActivities];

    return combined.filter((e) => {
      // Filter by subject
      if (selectedSubjectId && e.subject?.id !== selectedSubjectId) {
        return false;
      }
      // Filter by type
      if (selectedType && e.type !== selectedType) {
        return false;
      }

      // Filter by Duo viewMode
      if (duoMode === 'mine') {
        const eventProfile = e.profileId || e.subject?.profile_id || 'prof-luis';
        if (eventProfile !== activeProfile.id && !e.isShared) {
          return false;
        }
      } else if (duoMode === 'partner' && partnerProfile) {
        const eventProfile = e.profileId || e.subject?.profile_id || 'prof-luis';
        if (eventProfile !== partnerProfile.id && !e.isShared) {
          return false;
        }
      }

      return true;
    });
  }, [projectedClasses, activities, collisions, selectedSubjectId, selectedType, duoMode, activeProfile, partnerProfile]);

  // Collision count
  const collisionCount = Object.keys(collisions).length;

  // Navigation handlers
  const handlePrev = () => {
    if (viewMode === 'day') setCurrentDate((prev) => addDays(prev, -1));
    else if (viewMode === 'week') setCurrentDate((prev) => addWeeks(prev, -1));
    else setCurrentDate((prev) => addMonths(prev, -1));
  };

  const handleNext = () => {
    if (viewMode === 'day') setCurrentDate((prev) => addDays(prev, 1));
    else if (viewMode === 'week') setCurrentDate((prev) => addWeeks(prev, 1));
    else setCurrentDate((prev) => addMonths(prev, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleSlotClick = (date: Date, hour: number) => {
    setSelectedSlot({ date, hour });
    setEditingActivity(null);
    setIsActivityModalOpen(true);
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    if (event.sourceActivity) {
      setEditingActivity(event.sourceActivity);
      setSelectedSlot(null);
      setIsActivityModalOpen(true);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#090d16]">
      {/* Calendar Header */}
      <CalendarHeader
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        currentDate={currentDate}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        onOpenQuickAdd={() => setIsAiModalOpen(true)}
        onOpenManualAdd={() => {
          setEditingActivity(null);
          setSelectedSlot(null);
          setIsActivityModalOpen(true);
        }}
        onExportIcs={() => {
          const content = generateIcsCalendarContent(subjects, recurrentClasses, activities);
          downloadIcsFile('horario-memoria.ics', content);
        }}
        onOpenStudyPlanner={() => setIsStudyPlannerOpen(true)}
      />

      {/* Filter Bar */}
      <CalendarFilterBar
        subjects={subjects}
        selectedSubjectId={selectedSubjectId}
        onSelectSubject={setSelectedSubjectId}
        selectedType={selectedType}
        onSelectType={setSelectedType}
      />

      {/* Collision alert banner */}
      {collisionCount > 0 && (
        <div className="flex items-center gap-2 border-b border-amber-500/20 bg-amber-500/10 px-4 py-1.5 text-xs text-amber-300">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
          <span>
            Tienes <strong>{collisionCount}</strong> actividad(es) con solapamiento de horario frente a tus clases fijas.
          </span>
        </div>
      )}

      {/* Calendar Body Grid */}
      <div className="flex flex-1 overflow-hidden">
        {viewMode === 'week' && (
          <WeekView
            currentDate={currentDate}
            events={allEvents}
            onSelectEvent={handleSelectEvent}
            onSlotClick={handleSlotClick}
            onToggleTask={toggleActivityStatus}
          />
        )}

        {viewMode === 'day' && (
          <DayView
            currentDate={currentDate}
            events={allEvents}
            onSelectEvent={handleSelectEvent}
            onSlotClick={handleSlotClick}
            onToggleTask={toggleActivityStatus}
          />
        )}

        {viewMode === 'month' && (
          <MonthView
            currentDate={currentDate}
            events={allEvents}
            onSelectDate={(day) => {
              setCurrentDate(day);
              setViewMode('day');
            }}
            onSelectEvent={handleSelectEvent}
          />
        )}
      </div>

      {/* Modals */}
      <ActivityModal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        initialDate={selectedSlot?.date}
        initialHour={selectedSlot?.hour}
        initialActivity={editingActivity}
      />

      <QuickAddModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
      />

      <SmartStudyPlannerModal
        isOpen={isStudyPlannerOpen}
        onClose={() => setIsStudyPlannerOpen(false)}
        busyEvents={allEvents}
      />
    </div>
  );
}
