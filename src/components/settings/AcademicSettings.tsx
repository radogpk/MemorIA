"use client";
import { useState } from "react";
import Link from "next/link";
import { useMemoria } from "@/lib/storage/store";
import { profileSchedule, validDay } from "@/lib/calendar/academic";

export function AcademicSettings() {
  const { activeProfile, updateProfile } = useMemoria();
  const initial = profileSchedule(activeProfile);
  const [holidays, setHolidays] = useState(initial.holidays);
  const [date, setDate] = useState(""),
    [name, setName] = useState("");
  const [message, setMessage] = useState("");
  function addedHolidays() {
    if (!date && !name.trim()) return holidays;
    if (!validDay(date) || !name.trim())
      throw new Error("Completa la fecha y el nombre del feriado.");
    if (holidays.some((h) => h.date === date))
      throw new Error("Ya añadiste un feriado en esa fecha.");
    return [...holidays, { date, name: name.trim() }].sort((a, b) =>
      a.date.localeCompare(b.date),
    );
  }
  return (
    <section
      className="settings-section"
      id="academic"
      aria-labelledby="academic-heading"
    >
      <h2 id="academic-heading">Horario de {activeProfile.name}</h2>
      <p>
        Los feriados y el tiempo de traslado pertenecen a este perfil. Cada
        curso puede tener una regla distinta; un cambio por fecha tiene
        prioridad.
      </p>
      <form
        className="academic-settings"
        onSubmit={(e) => {
          e.preventDefault();
          setMessage("");
          try {
            const fields = new FormData(e.currentTarget),
              nextHolidays = addedHolidays();
            updateProfile(activeProfile.id, {
              schedule: {
                holidays: nextHolidays,
                holiday_policy: String(fields.get("policy")) as
                  "skip" | "attend",
                travel_minutes: Number(fields.get("travel")),
              },
            });
            setHolidays(nextHolidays);
            setDate("");
            setName("");
            setMessage(`Reglas de ${activeProfile.name} registradas.`);
          } catch (error) {
            setMessage(
              error instanceof Error
                ? error.message
                : "No se pudieron guardar las reglas.",
            );
          }
        }}
      >
        <div className="form-grid">
          <label>
            Regla habitual en feriados
            <select name="policy" defaultValue={initial.holiday_policy}>
              <option value="skip">No tengo clases</option>
              <option value="attend">Mantener mis clases</option>
            </select>
          </label>
          <label>
            Margen entre compromisos
            <select name="travel" defaultValue={initial.travel_minutes}>
              {[
                ...new Set([
                  0,
                  10,
                  15,
                  20,
                  30,
                  45,
                  60,
                  90,
                  120,
                  initial.travel_minutes,
                ]),
              ]
                .sort((a, b) => a - b)
                .map((n) => (
                  <option key={n} value={n}>
                    {n ? `${n} minutos de traslado` : "Sin margen adicional"}
                  </option>
                ))}
            </select>
          </label>
        </div>
        <p className="hint">
          El margen se reserva antes y después de cada compromiso con duración
          al buscar y confirmar planes juntos. No cambia la hora real de tus
          clases.
        </p>
        <details className="holiday-editor" open>
          <summary>Feriados registrados ({holidays.length})</summary>
          <p className="hint">
            Solo cuentan las fechas que registres aquí. Para Norely, puedes
            mantener las clases por defecto y suspender únicamente los cursos
            que sí respeten el feriado.
          </p>
          <div className="holiday-add">
            <label>
              Fecha del feriado
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                onInput={(e) => setDate(e.currentTarget.value)}
              />
            </label>
            <label>
              Nombre del feriado
              <input
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre o motivo"
              />
            </label>
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                try {
                  setHolidays(addedHolidays());
                  setDate("");
                  setName("");
                  setMessage(
                    "Feriado añadido a la lista. Guarda las reglas para aplicarlo.",
                  );
                } catch (e) {
                  setMessage(
                    e instanceof Error ? e.message : "Revisa el feriado.",
                  );
                }
              }}
            >
              Añadir a la lista
            </button>
          </div>
          {holidays.length ? (
            <ul className="dated-changes">
              {holidays.map((h) => (
                <li key={h.date}>
                  <div>
                    <strong>{h.date.split("-").reverse().join("/")}</strong>
                    <span>{h.name}</span>
                  </div>
                  <button
                    className="text-button"
                    type="button"
                    aria-label={`Quitar ${h.name}`}
                    onClick={() => {
                      setHolidays(holidays.filter((v) => v.date !== h.date));
                      setMessage(
                        "Feriado retirado de la lista. Guarda las reglas para aplicar el cambio.",
                      );
                    }}
                  >
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="hint">Aún no hay fechas registradas.</p>
          )}
        </details>
        <div className="push-actions">
          <button className="button">Guardar feriados y traslado</button>
          <Link className="text-button" href="/subjects">
            Semestres y cambios de sesiones
          </Link>
        </div>
        {message && (
          <p className="notice" role="status">
            {message}
          </p>
        )}
      </form>
    </section>
  );
}
