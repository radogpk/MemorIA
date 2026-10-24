"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCheck,
  HeartHandshake,
  ListTodo,
  Clock3,
} from "lucide-react";
import { addDays, endOfDay, format, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { useMemoria } from "@/lib/storage/store";
import {
  projectRecurrentClassesForRange,
  formatActivitiesToCalendarEvents,
} from "@/lib/calendar/projection";
import { isPendingInvitation, isVisibleActivity } from "@/lib/storage/model";
import {
  agendaKind,
  agendaTitle,
  calendarDate,
  calendarDayKey,
  eventTime,
  eventDayKey,
  fallsOnDay,
  isDeadline,
  sortAgenda,
} from "@/lib/calendar/presentation";
import type { CalendarEvent } from "@/lib/calendar/types";
import type { Activity } from "@/types/database.types";
import { AgendaEventRow } from "@/components/calendar/AgendaEventRow";
import { EventDetailsModal } from "@/components/calendar/EventDetailsModal";
import { ActivityModal } from "@/components/tasks/ActivityModal";

export function DailyBriefing({
  onOpenPlanner,
}: {
  onOpenPlanner: () => void;
}) {
  const {
    profiles,
    subjects,
    recurrentClasses,
    activities,
    activeProfile,
    toggleActivityStatus,
    isLoaded,
    syncStatus,
  } = useMemoria();
  const [now, setNow] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null,
  );
  const [editing, setEditing] = useState<Activity | null>(null);
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);
  const today = calendarDate(now),
    dayKey = calendarDayKey(today);
  const mine = activities.filter(
    (a) => isVisibleActivity(a, activeProfile.id) && a.status !== "cancelled",
  );
  const classes = recurrentClasses.filter(
    (c) => c.profile_id === activeProfile.id && c.subject?.is_active !== false,
  );
  const events = sortAgenda([
    ...projectRecurrentClassesForRange(
      classes,
      startOfDay(today),
      endOfDay(today),
      profiles,
    ),
    ...formatActivitiesToCalendarEvents(mine).filter((e) =>
      fallsOnDay(e, today),
    ),
  ]);
  const remaining = events.filter(
    (e) =>
      e.status !== "completed" &&
      (isDeadline(e) ? e.start >= now : e.end > now),
  );
  const current = remaining.find(
    (e) => !e.allDay && !isDeadline(e) && e.start <= now,
  );
  const focus = current || remaining.find((e) => !e.allDay) || remaining[0];
  const later = remaining.filter((e) => e.id !== focus?.id);
  const past = events.filter((e) => !remaining.some((r) => r.id === e.id));
  const tasks = mine.filter(
    (a) => ["task", "exam"].includes(a.type) && a.status !== "completed",
  );
  const overdue = tasks.filter(
    (a) => eventDayKey(new Date(a.start_datetime)) < dayKey,
  ).length;
  const invites = activities.filter(
    (a) =>
      isPendingInvitation(a) && a.invitation?.recipient_id === activeProfile.id,
  );
  const upcoming = mine
    .filter(
      (a) =>
        a.status !== "completed" &&
        a.metadata?.kind !== "work" &&
        eventDayKey(new Date(a.start_datetime)) > dayKey,
    )
    .sort(
      (a, b) => Date.parse(a.start_datetime) - Date.parse(b.start_datetime),
    );
  const hasCourses = subjects.some(
    (s) => s.profile_id === activeProfile.id && s.is_active,
  );
  const select = (event: CalendarEvent) =>
    setSelectedEvent({
      ...event,
      profileName: profiles.find((p) => p.id === event.profileId)?.name,
    });
  return (
    <div className="daily-home">
      <div className="daily-heading">
        <div>
          <h1>Tu día</h1>
          <p>{format(today, "EEEE d 'de' MMMM", { locale: es })}</p>
        </div>
        <Link
          href={`/calendar?day=${calendarDayKey(addDays(today, 1))}`}
          className="tomorrow-link"
        >
          Mañana <ArrowRight size={16} />
        </Link>
      </div>
      {!isLoaded || syncStatus === "loading" ? (
        <div className="loading-skeleton" aria-label="Cargando tu agenda" />
      ) : (
        <>
          {invites.length > 0 && (
            <Link href="/together" className="daily-invitation">
              <HeartHandshake size={21} />
              <span>
                <strong>
                  {invites.length === 1
                    ? "Tienes una invitación"
                    : `Tienes ${invites.length} invitaciones`}
                </strong>
                <small>Revisa la propuesta y confirma</small>
              </span>
              <ArrowRight size={17} />
            </Link>
          )}
          {focus ? (
            <button
              className="day-focus"
              onClick={() => select(focus)}
              aria-label={`Ver ${agendaTitle(focus)}`}
            >
              <div className="day-focus-top">
                <span
                  className={current ? "focus-state current" : "focus-state"}
                >
                  {current ? (
                    <>
                      <span className="status-dot" />
                      Ahora
                    </>
                  ) : (
                    <>
                      <Clock3 size={14} />
                      Lo siguiente
                    </>
                  )}
                </span>
                {agendaKind(focus) !== agendaTitle(focus) && (
                  <span>{agendaKind(focus)}</span>
                )}
              </div>
              <h2>{agendaTitle(focus)}</h2>
              <div className="day-focus-bottom">
                <span>
                  {focus.allDay
                    ? "Todo el día"
                    : `${eventTime(focus.start)}${isDeadline(focus) ? " · entrega" : ` – ${eventTime(focus.end)}`}`}
                  {focus.classroom && <small>{focus.classroom}</small>}
                </span>
                <ArrowRight size={21} />
              </div>
            </button>
          ) : (
            <div className="day-finished">
              <CheckCheck size={26} />
              <div>
                <h2>
                  {events.length
                    ? "Tu agenda de hoy terminó"
                    : "Hoy tienes espacio libre"}
                </h2>
                <p>
                  {hasCourses
                    ? "Mira mañana o prepara un plan juntos."
                    : "Añade tus cursos para ver aquí tus clases."}
                </p>
              </div>
            </div>
          )}
          <div className="daily-shortcuts">
            <Link href="/tasks">
              <ListTodo size={18} />
              <span>
                {tasks.length
                  ? `${tasks.length} ${tasks.length === 1 ? "pendiente" : "pendientes"}`
                  : "Tus pendientes"}
                {overdue > 0 && <small>{overdue} por revisar</small>}
              </span>
              <ArrowRight size={15} />
            </Link>
            <Link href="/together/plan">
              <HeartHandshake size={18} />
              <span>Planear juntos</span>
              <ArrowRight size={15} />
            </Link>
          </div>
          <div className="daily-content">
            <section className="daily-timeline" aria-label="Agenda de hoy">
              <div className="section-heading">
                <h2>{later.length ? "El resto del día" : "Tu agenda"}</h2>
                <span className="hint">Hora de Perú</span>
              </div>
              {later.length > 0 && (
                <ol className="agenda-events">
                  {later.map((event) => (
                    <AgendaEventRow
                      key={event.id}
                      event={event}
                      onSelect={select}
                      onToggleTask={toggleActivityStatus}
                      now={now}
                    />
                  ))}
                </ol>
              )}
              {!later.length && !past.length && (
                <div className="daily-quiet">
                  <CalendarDays size={23} />
                  <p>
                    {focus
                      ? "Este es tu único compromiso de hoy."
                      : "Las actividades que añadas aparecerán aquí."}
                  </p>
                  <Link href={hasCourses ? "/calendar" : "/subjects"}>
                    {hasCourses ? "Ver la semana" : "Añadir mis cursos"}
                    <ArrowRight size={15} />
                  </Link>
                </div>
              )}
              {past.length > 0 && (
                <details className="past-agenda">
                  <summary>
                    Ver lo que ya pasó <span>{past.length}</span>
                  </summary>
                  <ol className="agenda-events">
                    {past.map((event) => (
                      <AgendaEventRow
                        key={event.id}
                        event={event}
                        onSelect={select}
                        onToggleTask={toggleActivityStatus}
                        now={now}
                      />
                    ))}
                  </ol>
                </details>
              )}
            </section>
            {upcoming.length > 0 && (
              <aside className="daily-upcoming">
                <div className="section-heading">
                  <h2>Para los próximos días</h2>
                  <Link href="/tasks" className="text-button">
                    Ver todo
                  </Link>
                </div>
                {upcoming.slice(0, 3).map((a) => (
                  <button
                    className="upcoming-note"
                    key={a.id}
                    onClick={() =>
                      select(formatActivitiesToCalendarEvents([a])[0])
                    }
                  >
                    <time>
                      {new Intl.DateTimeFormat("es-PE", {
                        timeZone: "America/Lima",
                        day: "numeric",
                        month: "short",
                      }).format(new Date(a.start_datetime))}
                    </time>
                    <span>
                      <strong>{a.title}</strong>
                      <small>{a.subject?.name || "Personal"}</small>
                    </span>
                    <ArrowRight size={16} />
                  </button>
                ))}
                {upcoming.some((a) => a.type === "exam") && (
                  <button className="button secondary" onClick={onOpenPlanner}>
                    Organizar mi estudio
                  </button>
                )}
              </aside>
            )}
          </div>
        </>
      )}
      <EventDetailsModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onEdit={(event) => {
          setSelectedEvent(null);
          setEditing(event.sourceActivity!);
        }}
      />
      <ActivityModal
        isOpen={!!editing}
        initialActivity={editing}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}
