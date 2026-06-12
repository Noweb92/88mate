/**
 * Visa evidence checklist (PRD 1.6) — computed from tracked work
 * periods and vault documents. Pure logic, shared by the /export page
 * and the PDF generator.
 */

export type ChecklistPeriod = {
  id: string;
  work_type: string;
  employerName: string;
};

export type ChecklistDoc = {
  type: string;
  work_period_id: string | null;
};

export type ChecklistStatus = "complete" | "partial" | "missing" | "optional";

export type ChecklistItem = {
  key: string;
  label: string;
  detail: string;
  status: ChecklistStatus;
  done: number;
  total: number;
};

export function buildChecklist(
  periods: ChecklistPeriod[],
  docs: ChecklistDoc[]
): ChecklistItem[] {
  const items: ChecklistItem[] = [];

  // 1. At least one tracked work period
  items.push({
    key: "periods",
    label: "Work periods tracked",
    detail: "Every stint of specified work, logged with dates and postcode.",
    status: periods.length > 0 ? "complete" : "missing",
    done: periods.length,
    total: Math.max(1, periods.length),
  });

  // 2. Payslips covering each period
  const payslipCovered = periods.filter((p) =>
    docs.some((d) => d.type === "payslip" && d.work_period_id === p.id)
  ).length;
  items.push({
    key: "payslips",
    label: "Payslips for every job",
    detail:
      "The strongest evidence — immigration expects payslips matching your claimed dates.",
    status:
      periods.length === 0
        ? "missing"
        : payslipCovered === periods.length
          ? "complete"
          : payslipCovered > 0
            ? "partial"
            : "missing",
    done: payslipCovered,
    total: periods.length,
  });

  // 3. Piece rate agreements — only when piecework periods exist
  const pieceworkPeriods = periods.filter((p) => p.work_type === "piecework");
  if (pieceworkPeriods.length > 0) {
    const covered = pieceworkPeriods.filter((p) =>
      docs.some(
        (d) =>
          d.type === "piece_rate_agreement" && d.work_period_id === p.id
      )
    ).length;
    items.push({
      key: "piece_rate",
      label: "Piece rate agreements",
      detail:
        "Required for piecework — the signed agreement setting your rate.",
      status:
        covered === pieceworkPeriods.length
          ? "complete"
          : covered > 0
            ? "partial"
            : "missing",
      done: covered,
      total: pieceworkPeriods.length,
    });
  }

  // 4. Bank statements showing the pay landing
  const hasBankStatement = docs.some((d) => d.type === "bank_statement");
  items.push({
    key: "bank",
    label: "Bank statements showing your pay",
    detail: "Statements where your wages arrive — they corroborate payslips.",
    status: hasBankStatement ? "complete" : "missing",
    done: hasBankStatement ? 1 : 0,
    total: 1,
  });

  // 5. Employer references (recommended, not mandatory)
  const employers = Array.from(new Set(periods.map((p) => p.employerName)));
  const refCount = docs.filter((d) => d.type === "reference").length;
  items.push({
    key: "references",
    label: "Employer references",
    detail: "Recommended — a short signed letter from each employer.",
    status:
      employers.length > 0 && refCount >= employers.length
        ? "complete"
        : "optional",
    done: Math.min(refCount, Math.max(employers.length, refCount)),
    total: Math.max(1, employers.length),
  });

  return items;
}

export function checklistProgress(items: ChecklistItem[]): number {
  const scored = items.filter((i) => i.status !== "optional" || i.done > 0);
  if (scored.length === 0) return 0;
  const score = scored.reduce(
    (sum, i) =>
      sum +
      (i.status === "complete" ? 1 : i.status === "partial" ? 0.5 : 0),
    0
  );
  return Math.round((score / scored.length) * 100);
}
