import type { Activity } from "@/types/database.types";
import { dateTimeInput, localDateTimeToIso, parseQuickAdd } from "./date-parser";

const clean = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
const verb = /^(?:(?:quiero|puedes|por favor)\s+)?(?:mueve(?:lo)?|mover|cambia(?:lo)?|cambiar|pasa(?:lo)?|pasar|reprograma(?:r)?|aplaza(?:r)?|cancela(?:r)?)\b/;
export const isVoiceEdit = (text: string) => verb.test(clean(text));
export interface VoiceEditCommand { action: "reschedule" | "cancel"; query: string; temporal: string; candidates: Activity[]; reference: string }
export function parseVoiceEdit(text: string, activities: Activity[], profileId: string, reference: string): VoiceEditCommand {
  const words = clean(text);
  if (!verb.test(words)) throw new Error("Indica qué actividad quieres mover o cancelar.");
  const action = /\bcancelar?\b/.test(words) || /^cancela\b/.test(words) ? "cancel" : "reschedule";
  const rest = words.replace(verb, "").trim();
  const boundary = rest.search(/\s+(?:(?:al|para(?: el)?|el)\s+(?=(?:lunes|martes|miercoles|jueves|viernes|sabado|domingo|hoy|manana|pasado|\d))|(?=(?:hoy|manana|pasado manana|en \d+ dias|a las?\s|\d{4}-\d{2}-\d{2})))/);
  const query = (boundary >= 0 ? rest.slice(0, boundary) : rest).replace(/^(?:mi|mis|la|el|esa|ese)\s+/, "").trim();
  const temporal = boundary >= 0 ? rest.slice(boundary).trim().replace(/^(?:al|para(?: el)?|el)\s+/, "") : "";
  if (!query && !/muevelo|cambialo|pasalo/.test(words)) throw new Error("Indica el título o el tipo de actividad que quieres cambiar.");
  if (action === "reschedule" && !temporal) throw new Error("Indica la nueva fecha u hora: por ejemplo, al viernes a las 4 pm.");
  const tokens = query.split(/[^a-z0-9]+/).filter((t) => t.length > 2 && !["con", "del", "para", "una", "los", "las"].includes(t));
  const candidates = activities.filter((a) => a.profile_id === profileId && a.status !== "cancelled" && a.status !== "completed").map((a) => {
    const title = clean(a.title), course = clean(a.subject?.name || "");
    const kind = a.type === "personal" ? ["cita", "personal"] : a.type === "meeting" ? ["reunion"] : a.type === "exam" ? ["examen", "parcial"] : ["tarea", "entrega"];
    const score = query && title.includes(query) ? 100 : tokens.length && tokens.every((t) => title.includes(t) || course.includes(t) || kind.includes(t)) ? tokens.length : 0;
    return { activity: a, score };
  }).filter((r) => r.score > 0).sort((a, b) => b.score - a.score || Date.parse(a.activity.start_datetime) - Date.parse(b.activity.start_datetime));
  const best = candidates[0]?.score;
  const matches = candidates.filter((c) => c.score === best).map((c) => c.activity);
  if (!matches.length) throw new Error("No encontré esa actividad en tu perfil. Usa su título; solo quien creó una cita puede moverla.");
  return { action, query, temporal, candidates: matches, reference };
}

export function voiceEditPreview(command: VoiceEditCommand, activity: Activity) {
  if (command.action === "cancel") return { start: activity.start_datetime, end: activity.end_datetime, choices: [] as string[] };
  const original = dateTimeInput(activity.start_datetime);
  const hasTime = /\ba las?\b|\d{1,2}:\d{2}|\b(?:am|pm|mediodia|medianoche)\b/.test(command.temporal);
  let parsed: ReturnType<typeof parseQuickAdd>;
  try { parsed = parseQuickAdd(`Cita ${command.temporal}`, [], command.reference); }
  catch (e) {
    if (!(e instanceof Error) || !e.message.startsWith("Indica una fecha") || !hasTime) throw e;
    parsed = parseQuickAdd(`Cita ${original.slice(0, 10)} ${command.temporal}`, [], command.reference);
  }
  let local = dateTimeInput(parsed.start_datetime);
  if (!hasTime) local = `${local.slice(0, 10)}T${original.slice(11, 16)}`;
  const hour = Number(local.slice(11, 13));
  const ambiguous = hasTime && hour >= 1 && hour <= 12 && !/\b(?:am|pm|a m|p m|tarde|noche|manana|mediodia|medianoche)\b|\b0\d:\d{2}\b/.test(command.temporal);
  const choices = ambiguous ? [hour % 12, hour % 12 + 12].map((h) => localDateTimeToIso(`${local.slice(0, 11)}${String(h).padStart(2, "0")}${local.slice(13)}`)) : [];
  const start = localDateTimeToIso(local);
  return { start, end: shiftedEnd(activity, start), choices };
}
export function shiftedEnd(activity: Activity, start: string): string | null {
  return activity.end_datetime ? new Date(Date.parse(start) + Date.parse(activity.end_datetime) - Date.parse(activity.start_datetime)).toISOString() : null;
}
