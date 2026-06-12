import { toISODate } from "./visa";

export type WorkType = "full_time" | "piecework" | "part_time";

export const WORK_TYPE_LABELS: Record<WorkType, string> = {
  full_time: "Full-time",
  piecework: "Piecework (piece rate)",
  part_time: "Part-time",
};

export function calendarDaysInclusive(
  startISO: string,
  endISO: string
): number {
  const start = new Date(`${startISO}T00:00:00`);
  const end = new Date(`${endISO}T00:00:00`);
  const diff = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  return diff < 0 ? 0 : diff + 1;
}

/**
 * Day-counting rules (simplified from the published immi guidance):
 * - full_time: every calendar day of the period counts, including
 *   weekends and days off in a normal working week.
 * - piecework / part_time: only days actually worked count.
 *
 * endDate = null means "still working there" (full-time only) — the
 * count runs up to today and is recomputed live on every read.
 */
export function computeDaysCounted(opts: {
  workType: WorkType;
  startDate: string;
  endDate: string | null;
  actualDaysWorked?: number | null;
  today?: string;
}): number {
  const end = opts.endDate ?? opts.today ?? toISODate(new Date());
  const span = calendarDaysInclusive(opts.startDate, end);
  if (opts.workType === "full_time") return span;
  const actual = opts.actualDaysWorked ?? 0;
  return Math.max(0, Math.min(actual, span));
}

export function addDays(dateISO: string, days: number): string {
  const d = new Date(`${dateISO}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}
