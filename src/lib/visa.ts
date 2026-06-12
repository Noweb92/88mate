export type VisaType = "417" | "462";
export type VisaGoal = "second_year" | "third_year";

export const REQUIRED_DAYS: Record<VisaGoal, number> = {
  second_year: 88,
  third_year: 179,
};

export const VISA_LABELS: Record<VisaType, string> = {
  "417": "Working Holiday visa (subclass 417)",
  "462": "Work and Holiday visa (subclass 462)",
};

export const GOAL_LABELS: Record<VisaGoal, string> = {
  second_year: "2nd year visa — 88 days",
  third_year: "3rd year visa — 179 days",
};

/**
 * A WHV is granted for 12 months from first entry. Indicative only —
 * the real expiry is on the visa grant letter, and the user will be
 * able to correct it in Settings.
 */
export function visaExpiryFromArrival(arrivalDate: string): string {
  const d = new Date(`${arrivalDate}T00:00:00`);
  d.setFullYear(d.getFullYear() + 1);
  d.setDate(d.getDate() - 1);
  return toISODate(d);
}

export function daysUntil(dateISO: string): number {
  const target = new Date(`${dateISO}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function formatDate(dateISO: string): string {
  return new Date(`${dateISO}T00:00:00`).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
