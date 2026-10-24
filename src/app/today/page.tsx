"use client";

import React, { useState, useMemo } from "react";
import { DailyBriefing } from "@/components/dashboard/DailyBriefing";
import { SmartStudyPlannerModal } from "@/components/calendar/SmartStudyPlannerModal";
import { useMemoria } from "@/lib/storage/store";
import {
  projectRecurrentClassesForRange,
  formatActivitiesToCalendarEvents,
} from "@/lib/calendar/projection";
import { addDays } from "date-fns";
import { calendarDate } from "@/lib/calendar/presentation";

export default function TodayPage() {
  const {
    profiles,
    recurrentClasses,
    visibleActivities: activities,
    activeProfile,
  } = useMemoria();
  const [isPlannerOpen, setIsPlannerOpen] = useState(false);

  const busyEvents = useMemo(() => {
    const start = calendarDate();
    const end = addDays(start, 60);

    const projected = projectRecurrentClassesForRange(
      recurrentClasses.filter((c) => c.profile_id === activeProfile.id),
      start,
      end,
      profiles,
    );
    const actEvents = formatActivitiesToCalendarEvents(activities);
    return [...projected, ...actEvents];
  }, [recurrentClasses, activities, activeProfile.id, profiles]);

  return (
    <div className="today-page">
      <DailyBriefing onOpenPlanner={() => setIsPlannerOpen(true)} />

      <SmartStudyPlannerModal
        isOpen={isPlannerOpen}
        onClose={() => setIsPlannerOpen(false)}
        busyEvents={busyEvents}
      />
    </div>
  );
}
