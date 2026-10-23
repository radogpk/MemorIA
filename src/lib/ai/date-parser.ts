import { QuickAddOutput } from "./schemas";

export const APP_TIMEZONE = "America/Lima";
const clean = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
const months = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];
const weekdays = [
  "domingo",
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
];
const numbers = [
  "cero",
  "uno",
  "dos",
  "tres",
  "cuatro",
  "cinco",
  "seis",
  "siete",
  "ocho",
  "nueve",
  "diez",
  "once",
  "doce",
  "trece",
  "catorce",
  "quince",
  "dieciseis",
  "diecisiete",
  "dieciocho",
  "diecinueve",
  "veinte",
  "veintiuno",
  "veintidos",
  "veintitres",
  "veinticuatro",
  "veinticinco",
  "veintiseis",
  "veintisiete",
  "veintiocho",
  "veintinueve",
  "treinta",
  "treinta y uno",
];
function spokenNumbers(text: string) {
  let result = text;
  for (const [tens, value] of [
    ["treinta", 30],
    ["cuarenta", 40],
    ["cincuenta", 50],
  ] as const) {
    result = result.replace(
      new RegExp(
        `\\b${tens}(?: y (${numbers.slice(1, 10).join("|")}))?\\b`,
        "g",
      ),
      (_, unit: string) => String(value + (unit ? numbers.indexOf(unit) : 0)),
    );
  }
  numbers
    .map((word, n) => ({ word, n }))
    .reverse()
    .forEach(({ word, n }) => {
      result = result.replace(new RegExp(`\\b${word}\\b`, "g"), String(n));
    });
  return result.replace(/\buna\b/g, "1").replace(/\bprimero\b/g, "1");
}
export function dateTimeInput(iso: string, timezone = APP_TIMEZONE): string {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (type: string) => p.find((p) => p.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}
export function localDateTimeToIso(
  value: string,
  timezone = APP_TIMEZONE,
): string {
  const nominal = new Date(`${value}:00Z`).getTime();
  if (!Number.isFinite(nominal)) throw new Error("Fecha u hora inválida.");
  let candidate = nominal;
  for (let i = 0; i < 3; i++) {
    const local = dateTimeInput(new Date(candidate).toISOString(), timezone);
    const delta = nominal - new Date(`${local}:00Z`).getTime();
    if (!delta) return new Date(candidate).toISOString();
    candidate += delta;
  }
  throw new Error("Esa hora no existe en la zona horaria seleccionada.");
}

export function parseQuickAdd(
  text: string,
  subjects: Array<{ id: string; name: string; code?: string | null }>,
  reference: string,
  timezone = APP_TIMEZONE,
): QuickAddOutput {
  // All calendar arithmetic is performed on a date-only UTC value; server TZ never participates.
  const lower = clean(text);
  const words = spokenNumbers(lower);
  if (
    new RegExp(
      `\\b\\d+\\s+(?:o|y)\\s+\\d+\\s+de\\s+(?:${months.join("|")})\\b`,
    ).test(words)
  )
    throw new Error(
      "Mencionaste varios días. Elige una fecha para esta actividad.",
    );
  const referenceLocal = dateTimeInput(reference, timezone);
  const [year, month, day] = referenceLocal.slice(0, 10).split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  let explicit = false;
  const setExact = (y: number, m: number, d: number) => {
    const value = new Date(Date.UTC(y, m - 1, d));
    if (
      value.getUTCFullYear() !== y ||
      value.getUTCMonth() !== m - 1 ||
      value.getUTCDate() !== d
    )
      throw new Error("Esa fecha no existe. Corrige el día o el mes.");
    date.setTime(value.getTime());
    explicit = true;
  };
  const iso = words.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  const numeric = words.match(/\b(\d{1,2})[/.](\d{1,2})(?:[/.](\d{2,4}))?\b/);
  const named = words.match(
    new RegExp(
      `\\b(\\d{1,2}) (?:de )?(${months.join("|")}|setiembre)(?: (?:de |del )?(\\d{4}))?\\b`,
    ),
  );
  if (iso) setExact(+iso[1], +iso[2], +iso[3]);
  else if (numeric)
    setExact(
      numeric[3]
        ? +numeric[3] < 100
          ? 2000 + +numeric[3]
          : +numeric[3]
        : year,
      +numeric[2],
      +numeric[1],
    );
  else if (named)
    setExact(
      named[3] ? +named[3] : year,
      named[2] === "setiembre" ? 9 : months.indexOf(named[2]) + 1,
      +named[1],
    );
  else if (/\bpasado manana\b/.test(words)) {
    date.setUTCDate(day + 2);
    explicit = true;
  } else if (/\bmanana\b/.test(words.replace(/(?:de|por) la manana/g, ""))) {
    date.setUTCDate(day + 1);
    explicit = true;
  } else if (/\bhoy\b/.test(words)) explicit = true;
  else {
    const relative = words.match(/\ben (\d+) dias?\b/);
    const weekday = weekdays.findIndex((d) =>
      new RegExp(`\\b${d}\\b`).test(words),
    );
    if (relative) {
      date.setUTCDate(day + +relative[1]);
      explicit = true;
    } else if (weekday >= 0) {
      let diff = (weekday - date.getUTCDay() + 7) % 7;
      if (!diff && /\bproximo\b/.test(words)) diff = 7;
      date.setUTCDate(day + diff);
      explicit = true;
    }
  }
  if (!explicit)
    throw new Error(
      "Indica una fecha: por ejemplo, mañana, el lunes o el 5 de noviembre. No se ha elegido un día por ti.",
    );
  const type = /\b(examen|parcial|evaluacion|quiz|prueba de)\b/.test(lower)
    ? "exam"
    : /\b(reunion|meet|zoom|asesoria)\b/.test(lower)
      ? "meeting"
      : /\b(cita|cena|almuerzo|cumpleanos|paseo|medico)\b/.test(lower)
        ? "personal"
        : "task";
  let hour = type === "task" ? 23 : 9;
  let minute = type === "task" ? 59 : 0;
  const time =
    words.match(
      /\b(?:a las?|desde las?)\s+(\d{1,2})(?::(\d{2})|\s+y\s+(media|cuarto|\d{1,2}))?(?:\s*(a\.?\s*m\.?|p\.?\s*m\.?|de la tarde|de la noche|de la manana))?\b/,
    ) ||
    words.match(/\b(\d{1,2}):(\d{2})(?:\s*(am|pm))?\b/) ||
    words.match(/\b(\d{1,2})\s*(am|pm)\b/);
  if (time) {
    hour = +time[1];
    const digitsMinutes = time[2] && /^\d+$/.test(time[2]) ? +time[2] : 0;
    minute =
      time[3] === "media"
        ? 30
        : time[3] === "cuarto"
          ? 15
          : time[3] && /^\d+$/.test(time[3])
            ? +time[3]
            : digitsMinutes;
    const meridiem = time.slice(2).filter(Boolean).join(" ").replace(/\./g, "");
    if (/pm|p m|tarde|noche/.test(meridiem) && hour < 12) hour += 12;
    if (/am|a m|manana/.test(meridiem) && hour === 12) hour = 0;
    if (hour > 23 || minute > 59)
      throw new Error(
        "La hora indicada no es válida. Usa, por ejemplo, 15:30 o 3:30 pm.",
      );
  }
  if (/\bmediodia\b/.test(words)) {
    hour = 12;
    minute = 0;
  }
  if (/\bmedianoche\b/.test(words)) {
    hour = 0;
    minute = 0;
  }
  const datePart = date.toISOString().slice(0, 10);
  const start_datetime = localDateTimeToIso(
    `${datePart}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    timezone,
  );
  const fullMatches = subjects.filter(
    (s) =>
      lower.includes(clean(s.name)) ||
      (s.code && lower.includes(clean(s.code))),
  );
  const tokens = new Set(lower.split(/[^a-z0-9]+/));
  const candidates = subjects
    .map((s) => ({
      subject: s,
      score: clean(s.name)
        .split(/[^a-z0-9]+/)
        .filter(
          (t) =>
            t.length > 3 &&
            !["introduccion", "fundamentos", "taller", "curso"].includes(t) &&
            tokens.has(t),
        ).length,
    }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
  const subject =
    fullMatches.length === 1
      ? fullMatches[0]
      : candidates.length &&
          (candidates.length === 1 || candidates[0].score > candidates[1].score)
        ? candidates[0].subject
        : undefined;
  return {
    title: text.trim().slice(0, 150),
    type,
    subject_id: subject?.id || null,
    subject_name: subject?.name || null,
    start_datetime,
    end_datetime: null,
    priority: /urgente/.test(lower)
      ? "urgent"
      : type === "exam"
        ? "high"
        : "medium",
    description: null,
  };
}
