"use client";
import { useState } from "react";
import { useMemoria } from "@/lib/storage/store";
import { VoiceEditCommand, voiceEditPreview, shiftedEnd } from "@/lib/ai/voice-edit";
import { dateTimeInput, localDateTimeToIso } from "@/lib/ai/date-parser";

const fullDate = (iso: string) => new Intl.DateTimeFormat("es-PE", { dateStyle: "full", timeStyle: "short", timeZone: "America/Lima" }).format(new Date(iso));
export function VoiceEditReview({ command, onBack, onSaved }: { command: VoiceEditCommand; onBack: () => void; onSaved: () => void }) {
  const { activities, updateActivity, activeProfile } = useMemoria();
  const [selected, setSelected] = useState(command.candidates.length === 1 ? command.candidates[0].id : "");
  const [chosenTime, setChosenTime] = useState("");
  const [error, setError] = useState("");
  const activity = command.candidates.find((a) => a.id === selected);
  let preview: ReturnType<typeof voiceEditPreview> | null = null, parseError = "";
  try { if (activity) preview = voiceEditPreview(command, activity); }
  catch (e) { parseError = e instanceof Error ? e.message : "No se pudo interpretar el cambio."; }
  const ambiguous = !!preview?.choices.length;
  const start = chosenTime || preview?.start || "";
  return <form className="parsed-preview" onSubmit={(e) => {
    e.preventDefault(); setError("");
    try {
      if (!activity || !preview || parseError || (ambiguous && !chosenTime)) throw new Error("Elige la actividad y confirma la hora.");
      const current = activities.find((a) => a.id === activity.id);
      if (!current || current.updated_at !== activity.updated_at) throw new Error("La actividad cambió. Vuelve a la nota y revísala otra vez.");
      const actualStart = command.action === "cancel" ? activity.start_datetime : localDateTimeToIso(String(new FormData(e.currentTarget).get("edited_date")));
      updateActivity(activity.id, command.action === "cancel" ? { status: "cancelled" } : { start_datetime: actualStart, end_datetime: shiftedEnd(activity, actualStart) }, activity.updated_at);
      onSaved();
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo aplicar el cambio."); }
  }}>
    <p className="hint">Para {activeProfile.name}. Revisa el cambio antes de aplicarlo.</p>
    <label>Actividad<select required value={selected} onChange={(e) => { setSelected(e.target.value); setChosenTime(""); setError(""); }}>
      <option value="">Elige cuál actividad</option>{command.candidates.map((a) => <option value={a.id} key={a.id}>{a.title} · {fullDate(a.start_datetime)}</option>)}
    </select></label>
    {activity && <><h3>{activity.title}</h3><p className="hint">Ahora: {fullDate(activity.start_datetime)}</p>
      {command.action === "cancel" ? <p className="notice">Se marcará como cancelada. {activity.is_shared && "El otro perfil verá la cancelación."}</p> : preview && <>
        {ambiguous && <fieldset className="voice-hour-choice"><legend>¿A qué hora te refieres?</legend>{preview.choices.map((iso) => <label className="check-label" key={iso}><input type="radio" name="meridiem" required checked={chosenTime === iso} onChange={() => setChosenTime(iso)} />{dateTimeInput(iso).slice(11)} ({Number(dateTimeInput(iso).slice(11, 13)) < 12 ? "mañana" : "tarde / noche"})</label>)}</fieldset>}
        <label>Nueva fecha y hora<input name="edited_date" required type="datetime-local" value={dateTimeInput(start)} onChange={(e) => { if (e.target.value) setChosenTime(localDateTimeToIso(e.target.value)); }} /></label>
        <p className="date-confirmation">{fullDate(start)}</p>
        <p className="hint">{activity.end_datetime ? "Se conserva la duración." : "La actividad conserva su fecha límite sin añadir duración."} {activity.invitation && "El cambio pedirá una nueva confirmación."}</p>
      </>}
    </>}
    {(error || parseError) && <p className="notice error" role="alert">{error || parseError}</p>}
    <div className="dialog-actions"><button className="text-button" type="button" onClick={onBack}>Volver a la nota</button><button className={`button ${command.action === "cancel" ? "secondary" : ""}`} disabled={!activity || !!parseError || (ambiguous && !chosenTime)}>{command.action === "cancel" ? "Confirmar cancelación" : "Aplicar cambio"}</button></div>
  </form>;
}
