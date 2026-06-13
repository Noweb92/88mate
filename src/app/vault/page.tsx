import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/visa";
import { isOcrConfigured, type PayslipData } from "@/lib/ocr";
import { AppHeader } from "@/components/app-header";
import { Disclaimer } from "@/components/disclaimer";
import { UploadCard } from "@/components/vault/upload-card";
import { DocumentCard, type DocumentRow } from "@/components/vault/document-card";

export const metadata: Metadata = {
  title: "Proof vault — 88Mate",
};

type DbDoc = {
  id: string;
  type: string;
  storage_path: string;
  ocr_data: PayslipData | null;
  underpayment_flag: boolean;
  created_at: string;
  work_periods: {
    start_date: string;
    employers: { name: string } | null;
  } | null;
};

type DbPeriod = {
  id: string;
  start_date: string;
  employers: { name: string } | null;
};

export default async function VaultPage() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) redirect("/");

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .single();
  if (!profile?.onboarding_completed) redirect("/onboarding");

  const [{ data: docData }, { data: periodData }] = await Promise.all([
    supabase
      .from("documents")
      .select(
        "id, type, storage_path, ocr_data, underpayment_flag, created_at, work_periods(start_date, employers(name))"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("work_periods")
      .select("id, start_date, employers(name)")
      .eq("user_id", user.id)
      .order("start_date", { ascending: false }),
  ]);

  const docs = (docData ?? []) as unknown as DbDoc[];
  const periods = (periodData ?? []) as unknown as DbPeriod[];

  const periodOptions = periods.map((p) => ({
    id: p.id,
    label: `${p.employers?.name ?? "Unknown"} — ${formatDate(p.start_date)}`,
  }));

  const rows: DocumentRow[] = docs.map((d) => ({
    id: d.id,
    type: d.type,
    storage_path: d.storage_path,
    ocr_data: d.ocr_data,
    underpayment_flag: d.underpayment_flag,
    created_at: d.created_at,
    periodLabel: d.work_periods
      ? `${d.work_periods.employers?.name ?? "Unknown"} (${formatDate(d.work_periods.start_date)})`
      : null,
  }));

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 py-6">
      <AppHeader active="vault" />

      <main className="flex-1 space-y-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Proof vault</h1>
          <p className="text-sm text-muted-foreground">
            {rows.length} document{rows.length === 1 ? "" : "s"} — payslips,
            contracts, statements. Your visa evidence lives here.
          </p>
        </div>

        <UploadCard userId={user.id} periods={periodOptions} />

        {!isOcrConfigured() && (
          <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700">
            Automatic payslip reading is off — add{" "}
            <code className="font-mono">ANTHROPIC_API_KEY</code> to{" "}
            <code className="font-mono">.env.local</code> to enable it. Uploads
            still work.
          </p>
        )}

        {rows.length > 0 && (
          <ul className="space-y-3">
            {rows.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} />
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
