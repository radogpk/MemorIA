import { Activity } from "@/types/database.types";
import {
  isBefore,
  isSameDay,
  startOfDay,
  endOfDay,
  isSameWeek,
  parseISO,
} from "date-fns";

export interface TaskGroups {
  overdue: Activity[];
  today: Activity[];
  thisWeek: Activity[];
  upcoming: Activity[];
  completed: Activity[];
}

export function groupTasksByDueCategory(
  tasks: Activity[],
  referenceDate: Date = new Date(),
): TaskGroups {
  const groups: TaskGroups = {
    overdue: [],
    today: [],
    thisWeek: [],
    upcoming: [],
    completed: [],
  };

  const todayStart = startOfDay(referenceDate);
  const todayEnd = endOfDay(referenceDate);

  for (const task of tasks) {
    if (task.status === "cancelled") continue;
    if (task.status === "completed") {
      groups.completed.push(task);
      continue;
    }

    const dueDate = parseISO(task.start_datetime);

    if (isBefore(dueDate, todayStart)) {
      groups.overdue.push(task);
    } else if (isSameDay(dueDate, referenceDate)) {
      groups.today.push(task);
    } else if (isSameWeek(dueDate, referenceDate, { weekStartsOn: 1 })) {
      groups.thisWeek.push(task);
    } else {
      groups.upcoming.push(task);
    }
  }

  Object.values(groups).forEach((rows) =>
    rows.sort(
      (a: Activity, b: Activity) =>
        Date.parse(a.start_datetime) - Date.parse(b.start_datetime),
    ),
  );
  return groups;
}
