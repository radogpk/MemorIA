import { CalendarEvent } from "./types";

/** Divide intersecting events into lanes so both profiles remain readable. */
export function layoutTimedEvents(events: CalendarEvent[]) {
  const result = new Map<string, { column: number; columns: number }>();
  const sorted = [...events].sort(
    (a, b) => +a.start - +b.start || +b.end - +a.end,
  );
  let group: CalendarEvent[] = [];
  let groupEnd = -Infinity;
  function flush() {
    const ends: number[] = [];
    for (const e of group) {
      let lane = ends.findIndex((end) => end <= +e.start);
      if (lane === -1) lane = ends.length;
      ends[lane] = +e.end;
      result.set(e.id, { column: lane, columns: 1 });
    }
    for (const e of group) result.get(e.id)!.columns = ends.length;
    group = [];
  }
  for (const e of sorted) {
    if (+e.start >= groupEnd) flush();
    group.push(e);
    groupEnd = Math.max(groupEnd, +e.end);
  }
  flush();
  return result;
}
