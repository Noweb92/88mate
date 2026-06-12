import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteWorkPeriod } from "./actions";
import {
  computeDaysCounted,
  WORK_TYPE_LABELS,
  type WorkType,
} from "@/lib/days";
import { formatDate } from "@/lib/visa";
import { industryLabel } from "@/lib/industries";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Disclaimer } from "@/components/disclaimer";

export const metadata: Metadata = {
  title: "My jobs — 88Mate",
};

type PeriodRow = {
  id: string;
  start_date: string;
  end_date: string | null;
  work_type: WorkType;
  industry: string | null;
  postcode: string | null;
  postcode_eligible: boolean | null;
  days_counted: number | null;
  employers: { name: string } | null;
};

export default async function JobsPage() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) redirect("/");

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("work_periods")
    .select(
      "id, start_date, end_date, work_type, industry, postcode, postcode_eligible, days_counted, employers(name)"
    )
    .eq("user_id", user.id)
    .order("start_date", { ascending: false });

  const periods = (data ?? []) as unknown as PeriodRow[];

  const liveDays = (p: PeriodRow) =>
    p.days_counted ??
    computeDaysCounted({
      workType: p.work_type,
      startDate: p.start_date,
      endDate: p.end_date,
    });

  const total = periods.reduce((sum, p) => sum + liveDays(p), 0);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 py-6">
      <AppHeader active="jobs" />

      <main className="flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">My jobs</h1>
            <p className="text-sm text-muted-foreground">
              {periods.length} work period{periods.length === 1 ? "" : "s"} ·{" "}
              {total} days tracked
            </p>
          </div>
          <Button asChild>
            <Link href="/jobs/new">Add</Link>
          </Button>
        </div>

        {periods.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <p className="text-sm font-medium">No work periods yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add your first job — every day counts. Literally.
            </p>
            <Button asChild className="mt-4">
              <Link href="/jobs/new">Add a work period</Link>
            </Button>
          </div>
        ) : (
          <ul className="space-y-3">
            {periods.map((p) => (
              <li key={p.id} className="rounded-xl border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      {p.employers?.name ?? "Unknown employer"}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDate(p.start_date)} →{" "}
                      {p.end_date ? formatDate(p.end_date) : "ongoing"}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {WORK_TYPE_LABELS[p.work_type]}
                      {p.industry ? ` · ${industryLabel(p.industry)}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-lg font-bold tabular-nums">
                      {liveDays(p)}
                      <span className="text-xs font-normal text-muted-foreground">
                        {" "}
                        days
                      </span>
                    </p>
                    {p.postcode && (
                      <span
                        className={
                          p.postcode_eligible
                            ? "text-xs font-medium text-green-700"
                            : "text-xs font-medium text-destructive"
                        }
                      >
                        {p.postcode}{" "}
                        {p.postcode_eligible ? "✓ eligible" : "✗ not eligible"}
                      </span>
                    )}
                  </div>
                </div>
                <form
                  action={deleteWorkPeriod.bind(null, p.id)}
                  className="mt-3 border-t pt-2 text-right"
                >
                  <button
                    type="submit"
                    className="text-xs text-muted-foreground underline-offset-2 hover:text-destructive hover:underline"
                  >
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </main>

      <footer className="pt-8">
        <Disclaimer />
      </footer>
    </div>
  );
}
