"use client";

import React, { useState, useMemo } from "react";
import { DailyBriefing } from "@/components/dashboard/DailyBriefing";
import { openQuickAdd } from "@/components/ai/QuickAddModal";
import { SmartStudyPlannerModal } from "@/components/calendar/SmartStudyPlannerModal";
import { useMemoria } from "@/lib/storage/store";
import {
  projectRecurrentClassesForRange,
  formatActivitiesToCalendarEvents,
} from "@/lib/calendar/projection";
import { startOfWeek, endOfWeek } from "date-fns";

export default function TodayPage() {
  const {
    profiles,
    recurrentClasses,
    visibleActivities: activities,
    activeProfile,
  } = useMemoria();
  const [isPlannerOpen, setIsPlannerOpen] = useState(false);

  const busyEvents = useMemo(() => {
    const now = new Date();
    const start = startOfWeek(now, { weekStartsOn: 1 });
    const end = endOfWeek(now, { weekStartsOn: 1 });

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
    <div className="min-h-full bg-[#090d16]">
      <DailyBriefing
        onOpenQuickAdd={openQuickAdd}
        onOpenPlanner={() => setIsPlannerOpen(true)}
      />

      <SmartStudyPlannerModal
        isOpen={isPlannerOpen}
        onClose={() => setIsPlannerOpen(false)}
        busyEvents={busyEvents}
      />
    </div>
  );
}
