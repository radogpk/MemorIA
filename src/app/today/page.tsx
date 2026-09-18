'use client';

import React, { useState, useMemo } from 'react';
import { DailyBriefing } from '@/components/dashboard/DailyBriefing';
import { QuickAddModal } from '@/components/ai/QuickAddModal';
import { SmartStudyPlannerModal } from '@/components/calendar/SmartStudyPlannerModal';
import { useMemoria } from '@/lib/storage/store';
import { projectRecurrentClassesForRange, formatActivitiesToCalendarEvents } from '@/lib/calendar/projection';
import { startOfWeek, endOfWeek } from 'date-fns';

export default function TodayPage() {
  const { recurrentClasses, activities } = useMemoria();
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isPlannerOpen, setIsPlannerOpen] = useState(false);

  const busyEvents = useMemo(() => {
    const now = new Date();
    const start = startOfWeek(now, { weekStartsOn: 1 });
    const end = endOfWeek(now, { weekStartsOn: 1 });

    const projected = projectRecurrentClassesForRange(recurrentClasses, start, end);
    const actEvents = formatActivitiesToCalendarEvents(activities);
    return [...projected, ...actEvents];
  }, [recurrentClasses, activities]);

  return (
    <div className="min-h-full bg-[#090d16]">
      <DailyBriefing
        onOpenQuickAdd={() => setIsAiModalOpen(true)}
        onOpenPlanner={() => setIsPlannerOpen(true)}
      />

      <QuickAddModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
      />

      <SmartStudyPlannerModal
        isOpen={isPlannerOpen}
        onClose={() => setIsPlannerOpen(false)}
        busyEvents={busyEvents}
      />
    </div>
  );
}
