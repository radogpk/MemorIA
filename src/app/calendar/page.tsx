"use client";
import { useState, useMemo, useEffect } from "react";
import {
  addDays,
  addWeeks,
  addMonths,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import { AlertTriangle } from "lucide-react";
import { useMemoria } from "@/lib/storage/store";
import type { CalendarViewMode, CalendarEvent } from "@/lib/calendar/types";
import type { Activity } from "@/types/database.types";
import { isVisibleActivity } from "@/lib/storage/model";
import { validDay } from "@/lib/calendar/academic";
import {
  calendarDate,
  calendarDayKey,
  eventDayKey,
  fallsOnDay,
} from "@/lib/calendar/presentation";
import {
  projectRecurrentClassesForRange,
  detectCollisions,
  formatActivitiesToCalendarEvents,
} from "@/lib/calendar/projection";
import {
  generateIcsCalendarContent,
  downloadIcsFile,
} from "@/lib/calendar/ics-export";
import { CalendarHeader } from "@/components/calendar/CalendarHeader";
import { AgendaView } from "@/components/calendar/AgendaView";
import { WeekView } from "@/components/calendar/WeekView";
import { DayView } from "@/components/calendar/DayView";
import { MonthView } from "@/components/calendar/MonthView";
import { ActivityModal } from "@/components/tasks/ActivityModal";
import { EventDetailsModal } from "@/components/calendar/EventDetailsModal";
import { SmartStudyPlannerModal } from "@/components/calendar/SmartStudyPlannerModal";
import { openQuickAdd } from "@/components/ai/QuickAddModal";

export default function CalendarPage() {
  const {
    profiles,
    subjects,
    recurrentClasses,
    activities,
    toggleActivityStatus,
    viewMode: duoMode,
    activeProfile,
    partnerProfile,
    isLoaded,
    syncStatus,
  } = useMemoria();
  const [currentDate, setCurrentDate] = useState(calendarDate);
  const [viewMode, setViewMode] = useState<CalendarViewMode>("day");
  const [compact, setCompact] = useState(true);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(
    null,
  );
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{
    date: Date;
    hour: number;
  } | null>(null);
  const [editing, setEditing] = useState<Activity | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null,
  );
  const [study, setStudy] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 850px)");
    const adapt = () => setCompact(media.matches);
    adapt();
    const day = new URLSearchParams(window.location.search).get("day");
    if (day && validDay(day)) setCurrentDate(new Date(`${day}T12:00:00`));
    else if (!media.matches) setViewMode("week");
    media.addEventListener("change", adapt);
    return () => media.removeEventListener("change", adapt);
  }, []);
  useEffect(() => setSelectedSubjectId(null), [activeProfile.id, duoMode]);
  useEffect(() => {
    const addActivity = () => {
      setEditing(null);
      setSelectedSlot(null);
      setAdding(true);
    };
    window.addEventListener("memoria:add-calendar-activity", addActivity);
    return () =>
      window.removeEventListener("memoria:add-calendar-activity", addActivity);
  }, []);
  const { rangeStart, rangeEnd } = useMemo(
    () => ({
      rangeStart: startOfWeek(
        viewMode === "month" ? startOfMonth(currentDate) : currentDate,
        { weekStartsOn: 1 },
      ),
      rangeEnd: endOfWeek(
        viewMode === "month" ? endOfMonth(currentDate) : currentDate,
        { weekStartsOn: 1 },
      ),
    }),
    [currentDate, viewMode],
  );
  const projected = useMemo(
    () =>
      projectRecurrentClassesForRange(
        recurrentClasses,
        rangeStart,
        rangeEnd,
        profiles,
      ),
    [recurrentClasses, rangeStart, rangeEnd, profiles],
  );
  const visibleActivities = useMemo(
    () =>
      activities.filter(
        (a) =>
          a.status !== "cancelled" &&
          a.invitation?.status !== "declined" &&
          (duoMode === "both"
            ? !a.invitation ||
              a.invitation.status === "accepted" ||
              a.profile_id === activeProfile.id
            : isVisibleActivity(
                a,
                duoMode === "partner" && partnerProfile
                  ? partnerProfile.id
                  : activeProfile.id,
              )),
      ),
    [activities, duoMode, activeProfile.id, partnerProfile],
  );
  const collisions = useMemo(
    () => detectCollisions(visibleActivities, projected),
    [visibleActivities, projected],
  );
  const allEvents = useMemo(
    () =>
      [
        ...projected,
        ...formatActivitiesToCalendarEvents(visibleActivities, collisions),
      ]
        .filter((event) => {
          if (
            eventDayKey(new Date(+event.end - 1)) <
              calendarDayKey(rangeStart) ||
            eventDayKey(event.start) > calendarDayKey(rangeEnd)
          )
            return false;
          if (selectedSubjectId && event.subject?.id !== selectedSubjectId)
            return false;
          if (
            selectedType &&
            (selectedType === "laboratory"
              ? event.sourceRecurrentClass?.session_type !== "laboratory"
              : event.type !== selectedType)
          )
            return false;
          const owner =
            duoMode === "partner" && partnerProfile
              ? partnerProfile.id
              : activeProfile.id;
          return (
            duoMode === "both" || event.profileId === owner || event.isShared
          );
        })
        .map((event) => ({
          ...event,
          profileName: event.isShared
            ? "Ambos"
            : profiles.find((p) => p.id === event.profileId)?.name,
        })),
    [
      projected,
      visibleActivities,
      collisions,
      rangeStart,
      rangeEnd,
      selectedSubjectId,
      selectedType,
      duoMode,
      activeProfile.id,
      partnerProfile,
      profiles,
    ],
  );
  const dailyEvents = allEvents.filter((event) =>
    fallsOnDay(event, currentDate),
  );
  const visibleSubjects = subjects.filter(
    (s) =>
      s.is_active &&
      (duoMode === "both" ||
        s.profile_id ===
          (duoMode === "partner" && partnerProfile
            ? partnerProfile.id
            : activeProfile.id)),
  );
  const move = (direction: number) =>
    setCurrentDate((date) =>
      viewMode === "month"
        ? addMonths(date, direction)
        : addWeeks(date, direction),
    );
  const selectDate = (date: Date) => {
    setCurrentDate(date);
    setViewMode("day");
  };
  const studyEvents = useMemo(
    () => [
      ...projectRecurrentClassesForRange(
        recurrentClasses,
        calendarDate(),
        addDays(calendarDate(), 60),
        profiles,
      ),
      ...formatActivitiesToCalendarEvents(activities),
    ],
    [recurrentClasses, profiles, activities],
  );
  return (
    <div
      className={`calendar-page ${compact ? "compact-calendar" : "wide-calendar"}`}
    >
      <CalendarHeader
        currentDate={currentDate}
        onSelectDate={selectDate}
        events={allEvents}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onPrev={() => move(-1)}
        onNext={() => move(1)}
        onToday={() => selectDate(calendarDate())}
        subjects={visibleSubjects}
        selectedSubjectId={selectedSubjectId}
        onSelectSubject={setSelectedSubjectId}
        selectedType={selectedType}
        onSelectType={setSelectedType}
        onOpenStudyPlanner={() => setStudy(true)}
        onExportIcs={() =>
          downloadIcsFile(
            "horario-memoria.ics",
            generateIcsCalendarContent(
              subjects,
              recurrentClasses.filter((c) =>
                allEvents.some((e) => e.sourceRecurrentClass?.id === c.id),
              ),
              allEvents.flatMap((e) =>
                e.sourceActivity ? [e.sourceActivity] : [],
              ),
              new Date(),
              profiles,
            ),
          )
        }
      />
      {Object.keys(collisions).length > 0 && (
        <p className="calendar-overlap-note" role="status">
          <AlertTriangle size={16} />
          Hay compromisos que coinciden. Tócalos para revisar sus horas.
        </p>
      )}
      <div className="calendar-body">
        {!isLoaded || syncStatus === "loading" ? (
          <div
            className="loading-skeleton"
            role="status"
            aria-label="Cargando tu agenda"
          />
        ) : viewMode === "month" ? (
          <MonthView
            currentDate={currentDate}
            events={allEvents}
            onSelectDate={selectDate}
            onSelectEvent={setSelectedEvent}
          />
        ) : compact ? (
          <AgendaView
            currentDate={currentDate}
            events={allEvents}
            week={viewMode === "week"}
            showOwners={duoMode === "both"}
            onSelectEvent={setSelectedEvent}
            onToggleTask={toggleActivityStatus}
            onClearFilters={
              selectedSubjectId || selectedType
                ? () => {
                    setSelectedSubjectId(null);
                    setSelectedType(null);
                  }
                : undefined
            }
            onSelectDate={selectDate}
          />
        ) : viewMode === "week" ? (
          <WeekView
            currentDate={currentDate}
            events={allEvents}
            onSelectEvent={setSelectedEvent}
            onToggleTask={toggleActivityStatus}
            onSlotClick={(date, hour) => {
              setSelectedSlot({ date, hour });
              setEditing(null);
              setAdding(true);
            }}
          />
        ) : (
          <DayView
            currentDate={currentDate}
            events={dailyEvents}
            onSelectEvent={setSelectedEvent}
            onToggleTask={toggleActivityStatus}
            onSlotClick={(date, hour) => {
              setSelectedSlot({ date, hour });
              setEditing(null);
              setAdding(true);
            }}
          />
        )}
      </div>
      <EventDetailsModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onEdit={(event) => {
          setSelectedEvent(null);
          setEditing(event.sourceActivity!);
          setAdding(true);
        }}
      />
      <ActivityModal
        isOpen={adding}
        onClose={() => setAdding(false)}
        initialDate={selectedSlot?.date || currentDate}
        initialHour={selectedSlot?.hour}
        initialActivity={editing}
        onOpenQuickAdd={openQuickAdd}
      />
      <SmartStudyPlannerModal
        isOpen={study}
        onClose={() => setStudy(false)}
        busyEvents={studyEvents}
      />
    </div>
  );
}
