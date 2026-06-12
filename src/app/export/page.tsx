import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CheckCircle2,
  Circle,
  CircleDashed,
  CircleDot,
  Download,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  buildChecklist,
  checklistProgress,
  type ChecklistStatus,
} from "@/lib/checklist";
import type { Profile } from "@/types/database";
import { AppHeader } from "@/components/app-header";
import { Disclaimer } from "@/components/disclaimer";
import { PaywallButton } from "@/components/export/paywall-button";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export const metadata: Metadata = {
  title: "Visa pack — 88Mate",
};

const STATUS_META: Record<
  ChecklistStatus,
  { icon: typeof Circle; className: string }
> = {
  complete: { icon: CheckCircle2, className: "text-green-600" },
  partial: { icon: CircleDot, className: "text-amber-600" },
  missing: { icon: Circle, className: "text-destructive" },
  optional: { icon: CircleDashed, className: "text-muted-foreground" },
};

export default async function ExportPage({
  searchParams,
}: {
  searchParams: { purchase?: string };
}) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) redirect("/");

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  const profile = profileData as
    | (Profile & { export_unlocked: boolean })
    | null;
  if (!profile?.onboarding_completed) redirect("/onboarding");

  const [{ data: periodData }, { data: docData }] = await Promise.all([
    supabase
      .from("work_periods")
      .select("id, work_type, employers(name)")
      .eq("user_id", user.id),
    supabase
      .from("documents")
      .select("type, work_period_id")
      .eq("user_id", user.id),
  ]);

  const periods = (periodData ?? []) as unknown as {
    id: string;
    work_type: string;
    employers: { name: string } | null;
  }[];
  const docs = (docData ?? []) as { type: string; work_period_id: string | null }[];

  const checklist = buildChecklist(
    periods.map((p) => ({
      id: p.id,
      work_type: p.work_type,
      employerName: p.employers?.name ?? "Unknown",
    })),
    docs
  );
  const progress = checklistProgress(checklist);

  const entitled =
    profile.export_unlocked ||
    profile.plan === "pro" ||
    profile.plan === "pro_lifetime";
  const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 py-6">
      <AppHeader active="export" />

      <main className="flex-1 space-y-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Visa pack</h1>
          <p className="text-sm text-muted-foreground">
            Your evidence, assembled into one clean PDF — ready for your
            second-visa application.
          </p>
        </div>

        {searchParams.purchase === "success" && (
          <p className="rounded-md border border-green-600/30 bg-green-50 p-3 text-sm text-green-800">
            Payment received — thank you! If the download is still locked,
            refresh this page in a few seconds.
          </p>
        )}
        {searchParams.purchase === "cancelled" && (
          <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
            Checkout cancelled — no worries, your data hasn&apos;t moved.
          </p>
        )}

        <section className="rounded-2xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Evidence checklist</h2>
            <span className="text-sm font-bold tabular-nums">{progress}%</span>
          </div>
          <Progress value={progress} className="mt-3" />
          <ul className="mt-4 space-y-3">
            {checklist.map((item) => {
              const Meta = STATUS_META[item.status];
              return (
                <li key={item.key} className="flex items-start gap-3">
                  <Meta.icon
                    className={`mt-0.5 h-4 w-4 shrink-0 ${Meta.className}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {item.label}{" "}
                      <span className="font-normal text-muted-foreground">
                        ({item.done}/{item.total})
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.detail}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">
            Missing pieces? Add them in the{" "}
            <Link href="/vault" className="underline underline-offset-2">
              vault
            </Link>{" "}
            — every document strengthens your application.
          </p>
        </section>

        <section className="rounded-2xl border bg-card p-5">
          <h2 className="font-semibold">Export the pack</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            One PDF: your day count, work history per employer, document
            checklist, and every uploaded proof — ordered and captioned.
          </p>

          <div className="mt-4">
            {entitled ? (
              <Button asChild className="h-12 w-full gap-2">
                <a href="/api/export">
                  <Download className="h-4 w-4" />
                  Download my visa pack (PDF)
                </a>
              </Button>
            ) : (
              <PaywallButton stripeConfigured={stripeConfigured} />
            )}
          </div>

          {!entitled && (
            <p className="mt-3 text-xs text-muted-foreground">
              One-off payment. Unlimited re-exports as your evidence grows —
              no subscription.
            </p>
          )}
        </section>
      </main>

      <footer className="pt-8">
        <Disclaimer />
      </footer>
    </div>
  );
}
