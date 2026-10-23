"use client";
import { useState, useEffect, useRef } from "react";
import { Mic, MicOff, ArrowRight, Check } from "lucide-react";
import { useMemoria } from "@/lib/storage/store";
import {
  parseQuickAdd,
  APP_TIMEZONE,
  dateTimeInput,
  localDateTimeToIso,
} from "@/lib/ai/date-parser";
import { QuickAddOutput } from "@/lib/ai/schemas";
import { Modal } from "@/components/ui/Modal";
import { isVoiceEdit, parseVoiceEdit, VoiceEditCommand } from "@/lib/ai/voice-edit";
import { VoiceEditReview } from "./VoiceEditReview";
type Recognition = {
  start: () => void;
  stop: () => void;
  abort: () => void;
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: (event: {
    results: ArrayLike<ArrayLike<{ transcript: string }>>;
  }) => void;
  onerror: (event: { error: string }) => void;
  onend: () => void;
};
export const openQuickAdd = () =>
  window.dispatchEvent(new Event("memoria:quick-add"));
export function QuickAddModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { subjects, activities, activeProfile, addActivity } = useMemoria();
  const [edit, setEdit] = useState<VoiceEditCommand | null>(null);
  const [text, setText] = useState("");
  const [result, setResult] = useState<QuickAddOutput | null>(null);
  const [error, setError] = useState("");
  const [listening, setListening] = useState(false);
  const speech = useRef<Recognition | null>(null);
  useEffect(() => {
    if (isOpen) {
      setText("");
      setResult(null);
      setEdit(null);
      setError("");
    } else {
      speech.current?.abort();
      setListening(false);
    }
    return () => speech.current?.abort();
  }, [isOpen, activeProfile.id]);
  const stop = () => {
    speech.current?.stop();
    setListening(false);
  };
  const dictate = () => {
    if (listening) {
      stop();
      return;
    }
    const host = window as unknown as {
      SpeechRecognition?: new () => Recognition;
      webkitSpeechRecognition?: new () => Recognition;
    };
    const API = host.SpeechRecognition || host.webkitSpeechRecognition;
    if (!API) {
      setError(
        "El dictado no está disponible en este navegador. Puedes escribir la misma frase.",
      );
      return;
    }
    try {
      const r = new API();
      speech.current = r;
      r.lang = "es-PE";
      r.interimResults = false;
      r.continuous = false;
      r.onresult = (e) => {
        setText(
          Array.from(e.results)
            .map((r) => r[0].transcript)
            .join(" "),
        );
        setResult(null);
      };
      r.onerror = (e) => {
        setListening(false);
        if (e.error !== "aborted")
          setError(
            e.error === "not-allowed"
              ? "Permite el micrófono en tu navegador para dictar."
              : "No se pudo escuchar. Reintenta o escribe la frase.",
          );
      };
      r.onend = () => setListening(false);
      r.start();
      setListening(true);
      setError("");
    } catch {
      setError("No se pudo iniciar el micrófono. Revisa sus permisos.");
    }
  };
  const process = () => {
    stop();
    setError("");
    try {
      if (isVoiceEdit(text)) {
        setEdit(parseVoiceEdit(text, activities, activeProfile.id, new Date().toISOString()));
        setResult(null);
        return;
      }
      setResult(
        parseQuickAdd(
          text,
          subjects.filter((s) => s.profile_id === activeProfile.id),
          new Date().toISOString(),
          APP_TIMEZONE,
        ),
      );
    } catch (e) {
      setResult(null);
      setError(e instanceof Error ? e.message : "Revisa la fecha.");
    }
  };
  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={edit ? "Revisar cambio" : result ? "Revisar actividad" : "Anotar o cambiar una actividad"}
    >
      <div className="dialog-body">
        {!result && !edit && (
          <>
            <p className="hint">
              Para {activeProfile.name}. Crea una nota o pide un cambio, como «mueve mi cita al viernes a las 4 pm». Siempre revisarás el resultado antes de guardar.
            </p>
            <label>
              Tu nota
              <textarea
                autoFocus
                rows={3}
                maxLength={2000}
                placeholder="Entrega de Estadística el 5 de noviembre a las 3 pm"
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setResult(null);
                }}
              />
            </label>
            <div className="section-heading">
              <button
                className={`button secondary ${listening ? "recording" : ""}`}
                onClick={dictate}
              >
                {listening ? <MicOff size={18} /> : <Mic size={18} />}{" "}
                {listening ? "Detener dictado" : "Dictar por voz"}
              </button>
              <button
                className="button"
                onClick={process}
                disabled={!text.trim() || listening}
              >
                Revisar nota <ArrowRight size={16} />
              </button>
            </div>
            <p className="hint" aria-live="polite">
              {listening
                ? "Escuchando… al terminar revisa el texto transcrito."
                : "Las fechas se interpretan en hora de Perú (UTC−5). Sin hora: tareas a las 23:59; otras actividades a las 09:00."}
            </p>
          </>
        )}
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        {edit && <VoiceEditReview command={edit} onBack={() => { setEdit(null); setError(""); }} onSaved={onClose} />}
        {result && (
          <form
            className="parsed-preview"
            onSubmit={(e) => {
              e.preventDefault();
              try {
                const fields = new FormData(e.currentTarget);
                const actualStart = localDateTimeToIso(
                  String(
                    fields.get("reviewed_date") ||
                      dateTimeInput(result.start_datetime),
                  ),
                );
                addActivity({
                  ...result,
                  start_datetime: actualStart,
                  subject_id: result.subject_id || null,
                  description: result.description || null,
                  end_datetime: result.end_datetime || null,
                  profile_id: activeProfile.id,
                  is_all_day: false,
                  status: "pending",
                  metadata: { created_via: "note", original_text: text },
                });
                onClose();
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "No se pudo guardar.",
                );
              }
            }}
          >
            <p className="hint">
              Para {activeProfile.name}. Fecha y hora de Perú (UTC−5).
            </p>
            <h3>
              <Check size={18} /> Revisa lo que se guardará
            </h3>
            <label>
              Título
              <input
                required
                maxLength={150}
                value={result.title}
                onChange={(e) =>
                  setResult({ ...result, title: e.target.value })
                }
              />
            </label>
            <div className="form-grid">
              <label>
                Fecha y hora
                <input
                  required
                  name="reviewed_date"
                  type="datetime-local"
                  value={dateTimeInput(result.start_datetime)}
                  onChange={(e) => {
                    if (e.target.value)
                      setResult({
                        ...result,
                        start_datetime: localDateTimeToIso(e.target.value),
                      });
                  }}
                />
              </label>
              <label>
                Tipo
                <select
                  value={result.type}
                  onChange={(e) =>
                    setResult({
                      ...result,
                      type: e.target.value as QuickAddOutput["type"],
                    })
                  }
                >
                  <option value="task">Tarea</option>
                  <option value="exam">Examen</option>
                  <option value="meeting">Reunión</option>
                  <option value="personal">Personal</option>
                </select>
              </label>
            </div>
            <label>
              Curso
              <select
                value={result.subject_id || ""}
                onChange={(e) =>
                  setResult({ ...result, subject_id: e.target.value || null })
                }
              >
                <option value="">Sin curso</option>
                {subjects
                  .filter((s) => s.profile_id === activeProfile.id)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </label>
            <p className="date-confirmation">
              {new Intl.DateTimeFormat("es-PE", {
                dateStyle: "full",
                timeStyle: "short",
                timeZone: APP_TIMEZONE,
              }).format(new Date(result.start_datetime))}
            </p>
            <div className="dialog-actions">
              <button
                className="text-button"
                type="button"
                onClick={() => setResult(null)}
              >
                Volver a la nota
              </button>
              <button className="button" type="submit">
                Guardar actividad
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
