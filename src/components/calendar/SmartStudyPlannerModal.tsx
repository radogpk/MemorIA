"use client";
import { useState, useEffect } from "react";
import { useMemoria } from "@/lib/storage/store";
import { CalendarEvent } from "@/lib/calendar/types";
import { findSmartStudySlots, FreeStudySlot } from "@/lib/calendar/free-slots";
import { isVisibleActivity } from "@/lib/storage/model";
import { format, subDays, startOfDay, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { Modal } from "@/components/ui/Modal";
export function SmartStudyPlannerModal({
  isOpen,
  onClose,
  busyEvents,
}: {
  isOpen: boolean;
  onClose: () => void;
  busyEvents: CalendarEvent[];
}) {
  const { activities, activeProfile, addActivity } = useMemoria();
  const exams = activities
    .filter(
      (a) =>
        a.profile_id === activeProfile.id &&
        a.type === "exam" &&
        !["completed", "cancelled"].includes(a.status) &&
        Date.parse(a.start_datetime) > Date.now(),
    )
    .sort(
      (a, b) => Date.parse(a.start_datetime) - Date.parse(b.start_datetime),
    );
  const [examId, setExamId] = useState("");
  const [count, setCount] = useState(2);
  const [duration, setDuration] = useState(90);
  const [slots, setSlots] = useState<FreeStudySlot[]>([]);
  const [chosen, setChosen] = useState<number[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    if (isOpen) {
      setExamId(exams[0]?.id || "");
      setSlots([]);
      setChosen([]);
      setError("");
    }
  }, [isOpen, activeProfile.id]);
  const exam = exams.find((a) => a.id === examId);
  function generate() {
    if (!exam) return;
    const busy = busyEvents.filter(
      (e) =>
        (e.sourceActivity
          ? isVisibleActivity(e.sourceActivity, activeProfile.id)
          : e.profileId === activeProfile.id) &&
        !["completed", "cancelled"].includes(e.status || ""),
    );
    const found: FreeStudySlot[] = [];
    const end = startOfDay(new Date(exam.start_datetime));
    const start = new Date(Math.max(+startOfDay(new Date()), +subDays(end, 7)));
    for (
      let day = start;
      day < end && found.length < count * 3;
      day = addDays(day, 1)
    ) {
      found.push(
        ...findSmartStudySlots(day, busy, duration).filter(
          (s) =>
            +s.start > Date.now() && +s.end < Date.parse(exam.start_datetime),
        ),
      );
    }
    setSlots(found.slice(0, count * 3));
    setChosen(found.slice(0, count).map((_, i) => i));
    setError(
      found.length
        ? ""
        : "No hay espacios libres antes del examen. Prueba una sesión más corta o revisa tu agenda.",
    );
  }
  return (
    <Modal open={isOpen} onClose={onClose} title="Organizar estudio">
      <div className="dialog-body">
        <p className="hint">
          Busca espacios disponibles en tu agenda durante los siete días
          anteriores a un examen.
        </p>
        {!exams.length ? (
          <p className="empty-inline">
            Añade primero un examen a tu perfil para organizar tus sesiones.
          </p>
        ) : (
          <>
            <label>
              Examen
              <select
                value={examId}
                onChange={(e) => {
                  setExamId(e.target.value);
                  setSlots([]);
                  setChosen([]);
                }}
              >
                {exams.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-grid">
              <label>
                Sesiones
                <select
                  value={count}
                  onChange={(e) => {
                    setCount(+e.target.value);
                    setSlots([]);
                    setChosen([]);
                  }}
                >
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Minutos por sesión
                <select
                  value={duration}
                  onChange={(e) => {
                    setDuration(+e.target.value);
                    setSlots([]);
                    setChosen([]);
                  }}
                >
                  {[30, 60, 90, 120].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button className="button secondary" onClick={generate}>
              Buscar espacios libres
            </button>
            {error && (
              <p className="notice" role="status">
                {error}
              </p>
            )}
            {slots.map((s, i) => (
              <label className="check-label" key={s.start.toISOString()}>
                <input
                  type="checkbox"
                  checked={chosen.includes(i)}
                  onChange={(e) =>
                    setChosen(
                      e.target.checked
                        ? [...chosen, i]
                        : chosen.filter((n) => n !== i),
                    )
                  }
                />
                {format(s.start, "EEE d MMM, HH:mm", { locale: es })} –{" "}
                {format(s.end, "HH:mm")}
              </label>
            ))}
            {slots.length > 0 && (
              <button
                className="button"
                disabled={!chosen.length}
                onClick={() => {
                  if (!exam) return;
                  try {
                    for (const i of chosen) {
                      const slot = slots[i];
                      addActivity({
                        title: `Estudio: ${exam.title}`.slice(0, 150),
                        description: "Sesión de repaso",
                        type: "task",
                        profile_id: activeProfile.id,
                        subject_id: exam.subject_id,
                        start_datetime: slot.start.toISOString(),
                        end_datetime: slot.end.toISOString(),
                        is_all_day: false,
                        priority: "medium",
                        status: "pending",
                        metadata: { target_exam_id: exam.id },
                      });
                    }
                    onClose();
                  } catch (e) {
                    setError(
                      e instanceof Error ? e.message : "No se pudo guardar.",
                    );
                  }
                }}
              >
                Guardar {chosen.length} sesiones
              </button>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
