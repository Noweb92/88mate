import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  GOAL_LABELS,
  REQUIRED_DAYS,
  VISA_LABELS,
  daysUntil,
  formatDate,
  toISODate,
  type VisaGoal,
  type VisaType,
} from "@/lib/visa";
import { addDays, computeDaysCounted, type WorkType } from "@/lib/days";
import type { Profile } from "@/types/database";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Disclaimer } from "@/components/disclaimer";
import { AppHeader } from "@/components/app-header";

export const metadata: Metadata = {
  title: "Dashboard — 88Mate",
};

type PeriodRow = {
  start_date: string;
  end_date: string | null;
  work_type: WorkType;
  postcode_eligible: boolean | null;
  days_counted: number | null;
};

export default async function DashboardPage() {
  // Fresh clone without a Supabase project: nothing to show here yet.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) redirect("/");

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  const profile = data as Profile | null;

  if (!profile?.onboarding_completed) redirect("/onboarding");

  const { data: periodData } = await supabase
    .from("work_periods")
    .select("start_date, end_date, work_type, postcode_eligible, days_counted")
    .eq("user_id", user.id);
  const periods = (periodData ?? []) as PeriodRow[];

  const { count: underpaidCount } = await supabase
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("underpayment_flag", true);

  const goal = (profile.visa_goal ?? "second_year") as VisaGoal;
  const required = REQUIRED_DAYS[goal];

  const tracked = periods.reduce(
    (sum, p) =>
      sum +
      (p.days_counted ??
        computeDaysCounted({
          workType: p.work_type,
          startDate: p.start_date,
          endDate: p.end_date,
        })),
    0
  );
  const remaining = Math.max(0, required - tracked);
  const done = remaining === 0;
  const projectedFinish = done ? null : addDays(toISODate(new Date()), remaining);
  const ineligibleCount = periods.filter(
    (p) => p.postcode_eligible === false
  ).length;

  const expiry = profile.visa_expiry;
  const daysLeft = expiry ? daysUntil(expiry) : null;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 py-6">
      <AppHeader active="dashboard" />

      <main className="flex-1 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            G&apos;day{profile.first_name ? `, ${profile.first_name}` : ""} 👋
          </h1>
          <p className="text-sm text-muted-foreground">
            {VISA_LABELS[(profile.visa_type ?? "417") as VisaType]} ·{" "}
            {GOAL_LABELS[goal]}
          </p>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Specified work tracked</CardDescription>
            <CardTitle className="text-5xl font-extrabold tabular-nums">
              {tracked}
              <span className="text-2xl font-semibold text-muted-foreground">
                {" "}
                / {required} days
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress value={Math.min(100, (tracked / required) * 100)} />
            {done ? (
              <p className="text-sm font-medium text-green-700">
                Target reached — time to get your evidence pack in order. 🎉
              </p>
            ) : projectedFinish && periods.length > 0 ? (
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  {remaining} days to go
                </span>{" "}
                — finished around{" "}
                <span className="font-medium text-foreground">
                  {formatDate(projectedFinish)}
                </span>{" "}
                if you work every day from now.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Add your first work period to see your projected finish date.
              </p>
            )}
          </CardContent>
        </Card>

        {ineligibleCount > 0 && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
            <p className="font-semibold text-destructive">
              ⚠️ {ineligibleCount} work period
              {ineligibleCount > 1 ? "s are" : " is"} in a non-eligible
              postcode
            </p>
            <p className="mt-1 text-muted-foreground">
              Those days are unlikely to count. Check{" "}
              <Link href="/jobs" className="underline underline-offset-2">
                your jobs
              </Link>{" "}
              before relying on them.
            </p>
          </div>
        )}

        {underpaidCount !== null && underpaidCount > 0 && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
            <p className="font-semibold text-destructive">
              ⚠️ Possible underpayment on {underpaidCount} payslip
              {underpaidCount > 1 ? "s" : ""}
            </p>
            <p className="mt-1 text-muted-foreground">
              The hourly rate looks below the minimum award. Review it in your{" "}
              <Link href="/vault" className="underline underline-offset-2">
                vault
              </Link>{" "}
              and check fairwork.gov.au.
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardHeader className="pb-1">
              <CardDescription>Visa deadline</CardDescription>
              <CardTitle className="text-lg">
                {expiry ? formatDate(expiry) : "—"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Estimated from your arrival date.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardDescription>Days remaining</CardDescription>
              <CardTitle className="text-lg tabular-nums">
                {daysLeft !== null ? daysLeft : "—"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Until your estimated visa deadline.
              </p>
            </CardContent>
          </Card>
        </div>

        <Button asChild className="h-12 w-full">
          <Link href="/jobs/new">+ Add a work period</Link>
        </Button>
        <Button asChild variant="outline" className="h-12 w-full">
          <Link href="/export">Prepare my visa pack →</Link>
        </Button>
      </main>

      <footer className="pt-8">
        <Disclaimer />
      </footer>
    </div>
  );
}
