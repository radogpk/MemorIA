"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Check,
  CalendarDays,
} from "lucide-react";
import { useMemoria } from "@/lib/storage/store";
import { dateTimeInput, localDateTimeToIso } from "@/lib/ai/date-parser";
import { invitationSender, isPendingInvitation } from "@/lib/storage/model";
import { profileSchedule } from "@/lib/calendar/academic";
import {
  busyForDay,
  commonFreeWindows,
  suggestedStarts,
  timeLabel,
  shiftDay,
  overlaps,
} from "@/lib/calendar/availability";

export function SharedPlanner({
  editId,
  counterId,
  initialDay,
}: {
  editId?: string;
  counterId?: string;
  initialDay?: string;
}) {
  const store = useMemoria();
  const {
    activeProfile,
    partnerProfile,
    activities,
    addActivity,
    updateActivity,
    deleteActivity,
    syncStatus,
    counterInvitation,
  } = store;
  const router = useRouter();
  const original = activities.find((a) => a.id === (editId || counterId));
  const [proposalVersion] = useState(original?.updated_at);
  const today = dateTimeInput(new Date().toISOString()).slice(0, 10);
  const [day, setDay] = useState(
    original
      ? dateTimeInput(original.start_datetime).slice(0, 10)
      : /^\d{4}-\d{2}-\d{2}$/.test(initialDay || "") && initialDay! >= today
        ? initialDay!
        : today,
  );
  const originalDuration = original?.end_datetime
    ? Math.round(
        (Date.parse(original.end_datetime) -
          Date.parse(original.start_datetime)) /
          60_000,
      )
    : 60;
  const [duration, setDuration] = useState(
    originalDuration > 0 && originalDuration <= 960 ? originalDuration : 60,
  );
  const [rangeStart, setRangeStart] = useState("07:00");
  const [rangeEnd, setRangeEnd] = useState("23:00");
  const [selected, setSelected] = useState(
    original ? dateTimeInput(original.start_datetime).slice(11, 16) : "",
  );
  const [showAll, setShowAll] = useState(false);
  const [showAgendas, setShowAgendas] = useState(true);
  useEffect(() => {
    const compact = window.matchMedia("(max-width: 600px)");
    const adapt = () => setShowAgendas(!compact.matches);
    adapt();
    compact.addEventListener("change", adapt);
    return () => compact.removeEventListener("change", adapt);
  }, []);
  const [error, setError] = useState("");
  const [title, setTitle] = useState(original?.title || "");
  const [description, setDescription] = useState(original?.description || "");
  if (!partnerProfile)
    return (
      <div className="page">
        <h1>Falta el otro perfil</h1>
        <p>Revisa los perfiles en Datos y respaldo.</p>
      </div>
    );
  if (
    (editId || counterId) &&
    (!original ||
      original.status === "cancelled" ||
      original.status === "completed" ||
      (counterId
        ? !isPendingInvitation(original) ||
          original.invitation?.recipient_id !== activeProfile.id
        : invitationSender(original) !== activeProfile.id))
  )
    return (
      <div className="page">
        <h1>Esta propuesta no se puede editar desde tu perfil.</h1>
        <Link href="/together" className="text-button">
          Volver a Invitaciones
        </Link>
      </div>
    );
  const validDay =
    /^\d{4}-\d{2}-\d{2}$/.test(day) &&
    !Number.isNaN(Date.parse(`${day}T12:00:00Z`)) &&
    new Date(`${day}T12:00:00Z`).toISOString().slice(0, 10) === day;
  const mine = validDay
    ? busyForDay(store, day, activeProfile.id, original?.id)
    : [];
  const theirs = validDay
    ? busyForDay(store, day, partnerProfile.id, original?.id)
    : [];
  const busy = [...mine, ...theirs];
  const start =
    validDay && rangeStart
      ? Date.parse(localDateTimeToIso(`${day}T${rangeStart}`))
      : 0;
  const end =
    validDay && rangeEnd
      ? Date.parse(localDateTimeToIso(`${day}T${rangeEnd}`))
      : 0;
  const searchStart = Math.max(start, Date.now());
  const windows =
    end > searchStart
      ? commonFreeWindows(busy, searchStart, end, duration)
      : [];
  const starts = suggestedStarts(windows, duration);
  const selectedStart =
    validDay && selected
      ? Date.parse(localDateTimeToIso(`${day}T${selected}`))
      : 0;
  const selectedEnd = selectedStart + duration * 60_000;
  const conflict = busy.find((p) =>
    overlaps({ start: selectedStart, end: selectedEnd }, p),
  );
  const canSend =
    !!selected &&
    selectedStart >= searchStart &&
    selectedEnd <= end &&
    !conflict &&
    (!counterId ||
      !original ||
      selectedStart !== Date.parse(original.start_datetime) ||
      selectedEnd !== Date.parse(original.end_datetime || ""));
  const dateLabel = validDay
    ? new Intl.DateTimeFormat("es-PE", {
        weekday: "long",
        day: "numeric",
        month: "long",
        timeZone: "America/Lima",
      }).format(new Date(`${day}T12:00:00Z`))
    : "Elige un día";
  function changeDay(value: string) {
    setDay(value);
    setSelected("");
    setError("");
    setShowAll(false);
  }
  return (
    <div className="page shared-planner">
      <Link href="/together" className="text-button planner-back">
        <ArrowLeft size={16} /> Invitaciones
      </Link>
      <div className="page-heading">
        <div>
          <h1>
            {counterId
              ? "Proponer otra hora"
              : original
                ? "Cambiar la propuesta"
                : "Encuentren un momento"}
          </h1>
          <p>
            Elige el día y una hora libre para {activeProfile.name} y{" "}
            {partnerProfile.name}.
          </p>
        </div>
      </div>
      {counterId && original && (
        <p className="notice">
          La cita «{original.title}» está propuesta para{" "}
          {new Intl.DateTimeFormat("es-PE", {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: "America/Lima",
          }).format(new Date(original.start_datetime))}
          . Elige otra hora; {partnerProfile.name} tendrá que confirmarla.
        </p>
      )}
      {syncStatus !== "saved" && (
        <p className="notice" role="status">
          {syncStatus === "offline" || syncStatus === "error"
            ? "Estás viendo los últimos datos guardados. Se comprobarán los cruces al sincronizar."
            : "Actualizando las agendas…"}
        </p>
      )}
      <form
        className="planner-form"
        onSubmit={(e) => {
          e.preventDefault();
          setError("");
          try {
            const fields = new FormData(e.currentTarget);
            const actualDay = String(fields.get("day"));
            const actualTime = String(fields.get("time"));
            const actualDuration = Number(fields.get("duration"));
            const startIso = localDateTimeToIso(`${actualDay}T${actualTime}`);
            if (Date.parse(startIso) < Date.now())
              throw new Error("Elige una hora futura.");
            const endIso = new Date(
              Date.parse(startIso) + actualDuration * 60_000,
            ).toISOString();
            const payload = {
              title: String(fields.get("title") || "").trim(),
              description:
                String(fields.get("description") || "").trim() || null,
              type: original?.type || ("personal" as const),
              subject_id: null,
              profile_id: activeProfile.id,
              start_datetime: startIso,
              end_datetime: endIso,
              is_all_day: false,
              priority: original?.priority || ("medium" as const),
              status: "pending" as const,
              is_shared: true,
              metadata: original?.metadata || {},
              invitation: {
                recipient_id: partnerProfile.id,
                status: "pending" as const,
                responded_at: null,
              },
            };
            if (counterId && original)
              counterInvitation(
                original.id,
                startIso,
                endIso,
                proposalVersion!,
              );
            else if (original)
              updateActivity(
                original.id,
                {
                  ...payload,
                  profile_id: original.profile_id,
                  invitation: original.invitation,
                },
                proposalVersion,
              );
            else addActivity(payload);
            router.push("/together");
          } catch (e) {
            setError(
              e instanceof Error ? e.message : "No se pudo enviar. Reintenta.",
            );
          }
        }}
      >
        <section className="planner-day" aria-labelledby="choose-day">
          <h2 id="choose-day">Día y duración</h2>
          <div className="planner-controls">
            <div className="planner-date">
              <button
                type="button"
                className="icon-button"
                aria-label="Día anterior"
                disabled={!validDay || day <= today}
                onClick={() => changeDay(shiftDay(day, -1))}
              >
                <ChevronLeft size={20} />
              </button>
              <label>
                Día
                <input
                  type="date"
                  name="day"
                  value={day}
                  min={today}
                  required
                  onChange={(e) => changeDay(e.target.value)}
                  onInput={(e) => changeDay(e.currentTarget.value)}
                />
              </label>
              <button
                type="button"
                className="icon-button"
                aria-label="Día siguiente"
                disabled={!validDay}
                onClick={() => changeDay(shiftDay(day, 1))}
              >
                <ChevronRight size={20} />
              </button>
            </div>
            <label>
              Duración
              <select
                name="duration"
                value={duration}
                onChange={(e) => {
                  setDuration(Number(e.target.value));
                  setShowAll(false);
                }}
              >
                {[
                  ...new Set(
                    [30, 60, 90, 120, 180, originalDuration].filter(
                      (n) => n > 0 && n <= 960,
                    ),
                  ),
                ]
                  .sort((a, b) => a - b)
                  .map((n) => (
                    <option key={n} value={n}>
                      {n < 60
                        ? `${n} min`
                        : `${Math.floor(n / 60)} h${n % 60 ? ` ${n % 60} min` : ""}`}
                    </option>
                  ))}
              </select>
            </label>
            <details className="planner-range">
              <summary>
                Buscar entre {rangeStart} y {rangeEnd}
              </summary>
              <div>
                <label>
                  Desde
                  <input
                    type="time"
                    value={rangeStart}
                    required
                    onChange={(e) => setRangeStart(e.target.value)}
                  />
                </label>
                <label>
                  Hasta
                  <input
                    type="time"
                    value={rangeEnd}
                    required
                    onChange={(e) => setRangeEnd(e.target.value)}
                  />
                </label>
              </div>
            </details>
          </div>
          {end <= start && (
            <p role="alert" className="notice error">
              La hora final de búsqueda debe ser posterior al inicio.
            </p>
          )}
        </section>
        <section className="planner-agendas" aria-labelledby="agendas-heading">
          <div className="section-heading">
            <h2 id="agendas-heading">Sus agendas</h2>
            <button
              className="text-button"
              type="button"
              aria-expanded={showAgendas}
              aria-controls="agendas-grid"
              onClick={() => setShowAgendas(!showAgendas)}
            >
              {showAgendas ? "Ocultar detalle" : "Ver horas ocupadas"}
            </button>
          </div>
          <p className="planner-date-caption">{dateLabel}</p>
          {!showAgendas && (
            <p className="agenda-counts">
              {activeProfile.name}: {mine.length}{" "}
              {mine.length === 1 ? "compromiso" : "compromisos"} ·{" "}
              {partnerProfile.name}: {theirs.length}{" "}
              {theirs.length === 1 ? "compromiso" : "compromisos"}
            </p>
          )}
          <div className="dual-agendas" id="agendas-grid" hidden={!showAgendas}>
            {[
              { profile: activeProfile, periods: mine },
              { profile: partnerProfile, periods: theirs },
            ].map(({ profile, periods }) => (
              <div className="person-agenda" key={profile.id}>
                <h3>
                  <span
                    className="avatar"
                    style={{ background: profile.avatar_color }}
                    aria-hidden="true"
                  >
                    {profile.name[0]}
                  </span>
                  {profile.name}
                  {profile.id === activeProfile.id && (
                    <span className="hint">Tú</span>
                  )}
                </h3>
                {periods.length ? (
                  <ul>
                    {periods.map((p) => (
                      <li key={p.id}>
                        <time>
                          {timeLabel(p.eventStart ?? p.start)}–
                          {(p.eventEnd ?? p.end) ===
                          Date.parse(
                            localDateTimeToIso(`${shiftDay(day, 1)}T00:00`),
                          )
                            ? "24:00"
                            : timeLabel(p.eventEnd ?? p.end)}
                        </time>
                        <div>
                          <strong>{p.title}</strong>
                          {p.detail && <span>{p.detail}</span>}
                          {!!p.travelMinutes && (
                            <span>
                              Traslado: {p.travelMinutes} min antes y después
                            </span>
                          )}
                          {p.tentative && (
                            <span className="tentative-text">
                              Propuesta pendiente
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="agenda-free">
                    <Check size={16} /> Sin horas ocupadas registradas.
                  </p>
                )}
              </div>
            ))}
          </div>
          <p className="hint">
            Se incluyen clases, laboratorios y actividades con duración. Las
            propuestas pendientes también reservan su horario. Hora de Perú
            (UTC−5).
          </p>
          <p className="hint">
            Margen de traslado: {activeProfile.name},{" "}
            {profileSchedule(activeProfile).travel_minutes} min;{" "}
            {partnerProfile.name},{" "}
            {profileSchedule(partnerProfile).travel_minutes} min.{" "}
            <Link href="/settings#academic">Ajustar márgenes y feriados</Link>.
          </p>
        </section>
        <section className="planner-slots" aria-labelledby="free-heading">
          <h2 id="free-heading">Horas libres para ambos</h2>
          {windows.length ? (
            <>
              <p className="hint">
                Disponibles:{" "}
                {windows
                  .map((w) => `${timeLabel(w.start)}–${timeLabel(w.end)}`)
                  .join(", ")}
                . Elige un inicio para {duration} minutos.
              </p>
              <div
                className="slot-options"
                role="group"
                aria-label="Horas de inicio disponibles"
              >
                {(showAll ? starts : starts.slice(0, 8)).map((instant) => {
                  const time = timeLabel(instant);
                  return (
                    <button
                      className={`slot-option ${selected === time ? "selected" : ""}`}
                      aria-pressed={selected === time}
                      type="button"
                      key={instant}
                      onClick={() => {
                        setSelected(time);
                        setError("");
                      }}
                    >
                      {time}
                      <span>–{timeLabel(instant + duration * 60_000)}</span>
                      {selected === time && <Check size={15} />}
                    </button>
                  );
                })}
              </div>
              {starts.length > 8 && (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setShowAll(!showAll)}
                >
                  {showAll
                    ? "Ver menos horas"
                    : `Ver todas las horas (${starts.length})`}
                </button>
              )}
            </>
          ) : (
            <div className="empty-inline">
              <CalendarDays size={24} />
              <p>
                No hay un espacio común de {duration} minutos en este horario.
              </p>
              <span className="hint">
                Prueba otro día, reduce la duración o amplía las horas de
                búsqueda.
              </span>
            </div>
          )}
        </section>
        <section className="planner-details" aria-labelledby="details-heading">
          <h2 id="details-heading">La propuesta</h2>
          {!selected && (
            <p className="hint">
              Elige una hora libre para completar la invitación.
            </p>
          )}
          <div className="plan-detail-grid">
            <label>
              Hora elegida
              <input
                name="time"
                type="time"
                required
                value={selected}
                disabled={!selected}
                onChange={(e) => setSelected(e.target.value)}
                onInput={(e) => setSelected(e.currentTarget.value)}
              />
            </label>
            <label>
              ¿Qué van a hacer?
              <input
                name="title"
                required
                maxLength={150}
                value={title}
                readOnly={!!counterId}
                disabled={!selected}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Por ejemplo, cenar juntos"
              />
            </label>
            <label className="span-2">
              Detalles (opcional)
              <textarea
                name="description"
                rows={2}
                maxLength={10000}
                disabled={!selected}
                value={description}
                readOnly={!!counterId}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Lugar o algo que deba saber"
              />
            </label>
          </div>
          {selected && !canSend && (
            <p className="notice error" role="alert">
              {conflict
                ? `Ese horario cruza con «${conflict.title}». Elige otra hora libre.`
                : counterId &&
                    original &&
                    selectedStart === Date.parse(original.start_datetime) &&
                    selectedEnd === Date.parse(original.end_datetime || "")
                  ? "Elige una hora distinta a la propuesta actual."
                  : "La hora debe estar en el futuro y dentro del horario de búsqueda."}
            </p>
          )}
          {canSend && (
            <p className="plan-summary">
              <Check size={18} />
              <span>
                <strong>
                  {dateLabel}, {selected}–{timeLabel(selectedEnd)}
                </strong>
                <br />
                {partnerProfile.name} recibirá la invitación y podrá confirmarla
                en su perfil.
              </span>
            </p>
          )}
          {error && (
            <p className="notice error" role="alert">
              {error}
            </p>
          )}
          <div className="planner-submit">
            {original &&
              !counterId &&
              original.profile_id === activeProfile.id && (
                <button
                  className="text-button danger"
                  type="button"
                  onClick={() => {
                    if (!confirm("¿Eliminar esta propuesta de ambas agendas?"))
                      return;
                    try {
                      deleteActivity(original.id);
                      router.push("/together");
                    } catch (e) {
                      setError(
                        e instanceof Error ? e.message : "No se pudo eliminar.",
                      );
                    }
                  }}
                >
                  Eliminar propuesta
                </button>
              )}
            <Link href="/together" className="button secondary">
              Cancelar
            </Link>
            <button className="button" disabled={!canSend} type="submit">
              {counterId
                ? "Enviar nueva hora"
                : original
                  ? "Guardar propuesta"
                  : "Enviar invitación"}
            </button>
          </div>
        </section>
      </form>
    </div>
  );
}
