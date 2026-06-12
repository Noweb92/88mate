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
  type VisaGoal,
  type VisaType,
} from "@/lib/visa";
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

export const metadata: Metadata = {
  title: "Dashboard — 88Mate",
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

  const goal = (profile.visa_goal ?? "second_year") as VisaGoal;
  const required = REQUIRED_DAYS[goal];
  // Sprint 2: sum work_periods.days_counted for the real figure.
  const tracked = 0;
  const expiry = profile.visa_expiry;
  const daysLeft = expiry ? daysUntil(expiry) : null;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 py-6">
      <header className="mb-8 flex items-center justify-between">
        <Link href="/dashboard" className="text-xl font-extrabold tracking-tight">
          88<span className="text-primary">Mate</span>
        </Link>
        <form action="/auth/signout" method="post">
          <Button variant="ghost" size="sm" type="submit">
            Sign out
          </Button>
        </form>
      </header>

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
            <Progress value={(tracked / required) * 100} />
            <p className="text-sm text-muted-foreground">
              Add your first work period to see your projected finish date.
            </p>
          </CardContent>
        </Card>

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
                Estimated — edit in Settings once it exists.
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

        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm font-medium">No work periods yet</p>
            <p className="text-xs text-muted-foreground">
              The job tracker, postcode checker and day-count engine land in
              Sprint 2.
            </p>
            <Button disabled>Add a work period — coming soon</Button>
          </CardContent>
        </Card>
      </main>

      <footer className="pt-8">
        <Disclaimer />
      </footer>
    </div>
  );
}
