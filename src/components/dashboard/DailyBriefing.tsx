"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  MapPin,
  ArrowUpRight,
  Check,
  CalendarDays,
  BookOpen,
} from "lucide-react";
import { useMemoria } from "@/lib/storage/store";
import {
  projectRecurrentClassesForRange,
  formatActivitiesToCalendarEvents,
} from "@/lib/calendar/projection";
import { isVisibleActivity } from "@/lib/storage/model";
import {
  startOfDay,
  endOfDay,
  format,
  isSameDay,
  differenceInCalendarDays,
} from "date-fns";
import { es } from "date-fns/locale";
import { ActivityModal } from "@/components/tasks/ActivityModal";
import { InvitationList } from "@/components/invitations/InvitationList";
export function DailyBriefing({
  onOpenPlanner,
}: {
  onOpenQuickAdd: () => void;
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
  } = useMemoria();
  const [now, setNow] = useState(new Date());
  const [add, setAdd] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  const mine = activities.filter(
    (a) => isVisibleActivity(a, activeProfile.id) && a.status !== "cancelled",
  );
  const classes = recurrentClasses.filter(
    (c) => c.profile_id === activeProfile.id && c.subject?.is_active !== false,
  );
  const events = [
    ...projectRecurrentClassesForRange(
      classes,
      startOfDay(now),
      endOfDay(now),
      profiles,
    ),
    ...formatActivitiesToCalendarEvents(mine).filter((e) =>
      isSameDay(e.start, now),
    ),
  ].sort((a, b) => +a.start - +b.start);
  const upcoming = mine
    .filter(
      (a) => a.status !== "completed" && new Date(a.start_datetime) >= now,
    )
    .sort(
      (a, b) => Date.parse(a.start_datetime) - Date.parse(b.start_datetime),
    );
  const next = events.find((e) => e.end > now && e.status !== "completed");
  const inProgress = next && next.start <= now;
  const pending = mine.filter(
    (a) => (a.type === "task" || a.type === "exam") && a.status !== "completed",
  );
  const overdue = pending.filter(
    (a) => new Date(a.start_datetime) < startOfDay(now),
  ).length;
  return (
    <div className="page dashboard">
      <div className="page-heading">
        <div>
          <h1>Tu día, {activeProfile.nickname || activeProfile.name}.</h1>
          <p>
            {format(now, "EEEE d 'de' MMMM", { locale: es })}. Un paso a la vez.
          </p>
        </div>
        <button className="button secondary" onClick={() => setAdd(true)}>
          <Plus size={18} /> Nueva actividad
        </button>
      </div>
      {!isLoaded ? (
        <div className="loading-skeleton" aria-label="Cargando tu agenda" />
      ) : (
        <>
          <div className="day-overview">
            <div className="next-moment">
              <h2>
                {next?.title ||
                  (events.length
                    ? "Ya terminaste por hoy."
                    : "Espacio para lo que importa.")}
              </h2>
              {next && (
                <p className="live-label">
                  <span className="status-dot" />
                  {inProgress ? "En este momento" : "Lo siguiente de hoy"}
                </p>
              )}
              <p>
                {next ? (
                  <>
                    {format(next.start, "HH:mm")} – {format(next.end, "HH:mm")}
                    {next.classroom && <> · {next.classroom}</>}
                    {next.sourceRecurrentClass?.session_type === "laboratory" &&
                      " · Laboratorio"}
                  </>
                ) : events.length ? (
                  "Puedes revisar lo pendiente o dejar listo mañana."
                ) : (
                  "Añade tus cursos o anota tu próxima actividad."
                )}
              </p>
              <Link
                href={
                  subjects.some((s) => s.profile_id === activeProfile.id)
                    ? "/calendar"
                    : "/subjects"
                }
              >
                {subjects.some((s) => s.profile_id === activeProfile.id)
                  ? "Abrir calendario"
                  : "Configurar mis cursos"}{" "}
                <ArrowUpRight size={17} />
              </Link>
            </div>
            <div className="overview-counts">
              <div>
                <strong>{events.length}</strong>
                <span>
                  {events.length === 1 ? "actividad hoy" : "actividades hoy"}
                </span>
              </div>
              <div>
                <strong>{pending.length}</strong>
                <span>
                  {pending.length === 1 ? "pendiente" : "pendientes"}
                  {overdue > 0 && <em>{overdue} por revisar</em>}
                </span>
              </div>
            </div>
          </div>
          <div className="dashboard-columns">
            <section className="day-agenda">
              <div className="section-heading">
                <h2>Agenda de hoy</h2>
                <span className="hint">Hora de Perú</span>
              </div>
              {!events.length ? (
                <div className="empty-state">
                  <CalendarDays size={30} />
                  <h3>Un día por escribir</h3>
                  <p>
                    Las clases y laboratorios aparecerán aquí según el horario
                    de tus cursos.
                  </p>
                  <Link className="text-button" href="/subjects">
                    Añadir mis cursos
                  </Link>
                </div>
              ) : (
                <ol className="agenda-list">
                  {events.map((e) => (
                    <li
                      key={e.id}
                      className={
                        e.end < now ? "past" : e.id === next?.id ? "next" : ""
                      }
                    >
                      <time>
                        {format(e.start, "HH:mm")}
                        <small>{format(e.end, "HH:mm")}</small>
                      </time>
                      <div className="agenda-entry">
                        <div className="entry-kind">
                          <span
                            className="course-dot"
                            style={{
                              background:
                                e.subject?.color || activeProfile.avatar_color,
                            }}
                          />
                          {e.sourceRecurrentClass
                            ? {
                                theory: "Teoría",
                                laboratory: "Laboratorio",
                                practice: "Práctica",
                              }[e.sourceRecurrentClass.session_type || "theory"]
                            : e.isShared
                              ? "Compartida"
                              : e.type === "exam"
                                ? "Examen"
                                : e.type === "task"
                                  ? "Tarea"
                                  : "Personal"}
                        </div>
                        <h3>
                          {e.sourceRecurrentClass
                            ? e.subject?.name || e.title
                            : e.title}
                        </h3>
                        {(e.classroom || e.professor) && (
                          <p>
                            {e.classroom && (
                              <span>
                                <MapPin size={13} />
                                {e.classroom}
                              </span>
                            )}
                            {e.professor && <span>{e.professor}</span>}
                          </p>
                        )}
                      </div>
                      {e.type === "task" && (
                        <button
                          className={`task-check ${e.status === "completed" ? "checked" : ""}`}
                          aria-label={
                            e.status === "completed"
                              ? `Marcar pendiente: ${e.title}`
                              : `Completar: ${e.title}`
                          }
                          onClick={() => toggleActivityStatus(e.id)}
                        >
                          {e.status === "completed" && <Check size={17} />}
                        </button>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </section>
            <aside className="day-side">
              <section className="upcoming-panel">
                <div className="section-heading">
                  <h2>En el horizonte</h2>
                  <BookOpen size={18} />
                </div>
                {upcoming.slice(0, 3).map((a) => (
                  <div className="upcoming-row" key={a.id}>
                    <span>
                      {differenceInCalendarDays(
                        new Date(a.start_datetime),
                        now,
                      ) === 0
                        ? "Hoy"
                        : format(new Date(a.start_datetime), "d MMM", {
                            locale: es,
                          })}
                    </span>
                    <strong>{a.title}</strong>
                    <small>{a.subject?.name || "Personal"}</small>
                  </div>
                ))}
                {!upcoming.length && (
                  <p className="hint">
                    Tus próximas entregas y planes aparecerán aquí.
                  </p>
                )}
                {upcoming.some((a) => a.type === "exam") && (
                  <button
                    className="button secondary small"
                    onClick={onOpenPlanner}
                  >
                    Organizar mi estudio
                  </button>
                )}
              </section>
              <section className="invitation-preview">
                <div className="section-heading">
                  <h2>Entre los dos</h2>
                  <Link
                    href="/together"
                    aria-label="Ver todas las invitaciones"
                  >
                    <ArrowUpRight size={20} />
                  </Link>
                </div>
                <InvitationList compact />
              </section>
            </aside>
          </div>
        </>
      )}
      <ActivityModal isOpen={add} onClose={() => setAdd(false)} />
    </div>
  );
}
