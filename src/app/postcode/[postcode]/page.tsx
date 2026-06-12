import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { industryLabel } from "@/lib/industries";
import { Button } from "@/components/ui/button";
import { Disclaimer } from "@/components/disclaimer";

// Programmatic SEO pages (PRD §10): one page per postcode, rendered
// on demand and cached for a day. Public data, anon client.
export const revalidate = 86400;

type PcRow = {
  visa_type: "417" | "462";
  industries: string[];
  source_updated_at: string | null;
};

function publicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}

async function getPostcodeData(postcode: string): Promise<PcRow[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];
  const supabase = publicClient();
  const { data } = await supabase
    .from("eligible_postcodes")
    .select("visa_type, industries, source_updated_at")
    .eq("postcode", postcode);
  return (data ?? []) as PcRow[];
}

async function getNearbyEligible(postcode: string): Promise<string[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];
  const supabase = publicClient();
  const n = parseInt(postcode, 10);
  const lo = String(Math.max(0, n - 12)).padStart(4, "0");
  const hi = String(Math.min(9999, n + 12)).padStart(4, "0");
  const { data } = await supabase
    .from("eligible_postcodes")
    .select("postcode")
    .gte("postcode", lo)
    .lte("postcode", hi)
    .neq("postcode", postcode)
    .limit(40);
  return Array.from(new Set((data ?? []).map((r) => r.postcode as string)))
    .sort()
    .slice(0, 10);
}

export async function generateMetadata({
  params,
}: {
  params: { postcode: string };
}): Promise<Metadata> {
  const { postcode } = params;
  if (!/^\d{4}$/.test(postcode)) return {};
  const rows = await getPostcodeData(postcode);
  const eligible = rows.length > 0;
  return {
    title: `Is ${postcode} eligible for the 88 days? — WHV specified work check`,
    description: eligible
      ? `Yes — postcode ${postcode} is in an eligible area for specified work on a Working Holiday visa. See which industries count for the 417 and 462 visas.`
      : `Postcode ${postcode} is not on the official eligible-areas list for Working Holiday visa specified work. Check which industries and areas count.`,
    robots: eligible ? undefined : { index: false, follow: true },
    alternates: { canonical: `/postcode/${postcode}` },
  };
}

function VisaCard({ visa, row }: { visa: "417" | "462"; row?: PcRow }) {
  const visaName =
    visa === "417"
      ? "Working Holiday visa (417)"
      : "Work and Holiday visa (462)";
  return (
    <div className="rounded-2xl border bg-card p-5">
      <h2 className="font-semibold">{visaName}</h2>
      {row ? (
        <>
          <p className="mt-2 flex items-start gap-2 font-medium text-green-700">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            Eligible area for specified work
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Work here counts towards your 88 days (2nd year) or 179 days (3rd
            year) — in these industries:
          </p>
          <ul className="mt-2 space-y-1">
            {row.industries.map((ind) => (
              <li key={ind} className="text-sm">
                • {industryLabel(ind)}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <p className="mt-2 flex items-start gap-2 font-medium text-destructive">
            <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
            Not on the eligible list
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Specified work done in this postcode is unlikely to count for a
            second or third {visaName} — whatever the industry.
          </p>
        </>
      )}
    </div>
  );
}

export default async function PostcodePage({
  params,
}: {
  params: { postcode: string };
}) {
  const { postcode } = params;
  if (!/^\d{4}$/.test(postcode)) notFound();

  const [rows, nearby] = await Promise.all([
    getPostcodeData(postcode),
    getNearbyEligible(postcode),
  ]);
  const r417 = rows.find((r) => r.visa_type === "417");
  const r462 = rows.find((r) => r.visa_type === "462");
  const syncDate = r417?.source_updated_at ?? r462?.source_updated_at ?? null;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 py-5">
        <Link href="/" className="text-xl font-extrabold tracking-tight">
          88<span className="text-primary">Mate</span>
        </Link>
        <Button asChild variant="ghost" size="sm">
          <Link href="/login">Log in</Link>
        </Button>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-12">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">
          88 days postcode check
        </p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">
          Is postcode {postcode} eligible for specified work?
        </h1>
        <p className="mt-2 text-muted-foreground">
          {rows.length > 0
            ? `Yes — ${postcode} is in an eligible area of Australia, with industry rules that differ between the 417 and 462 visas.`
            : `No — ${postcode} doesn't appear on the official eligible-areas lists for either Working Holiday Maker visa.`}
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <VisaCard visa="417" row={r417} />
          <VisaCard visa="462" row={r462} />
        </div>

        <div className="mt-6 rounded-2xl bg-accent p-5">
          <h2 className="font-semibold text-accent-foreground">
            Working here? Don&apos;t lose a single day.
          </h2>
          <p className="mt-1 text-sm text-accent-foreground/80">
            88Mate counts your days the way the rules do, keeps every payslip
            safe, and exports a clean evidence pack for your visa application.
          </p>
          <Button asChild className="mt-4 h-11">
            <Link href="/signup">Start tracking — it&apos;s free</Link>
          </Button>
        </div>

        <section className="mt-8 space-y-3 text-sm text-muted-foreground">
          <h2 className="text-base font-semibold text-foreground">
            How the 88 days are counted
          </h2>
          <p>
            To qualify for a second Working Holiday Maker visa you need at
            least 88 calendar days (3 months) of specified work; a third visa
            needs 179 days (6 months). Full-time work counts every calendar
            day of the period — including weekends and days off. Piecework and
            part-time only count the days you actually worked.
          </p>
          <p>
            Both the <strong>postcode</strong> and the{" "}
            <strong>industry</strong> must be eligible: farm work counts in
            regional Australia, but tourism &amp; hospitality only counts in
            northern or remote areas — and mining counts for the 417 visa
            only.
          </p>
          {syncDate && (
            <p className="text-xs">
              Source: official lists on immi.homeaffairs.gov.au, last synced{" "}
              {syncDate}.
            </p>
          )}
        </section>

        {nearby.length > 0 && (
          <section className="mt-8">
            <h2 className="text-base font-semibold">
              Nearby eligible postcodes
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {nearby.map((pc) => (
                <Link
                  key={pc}
                  href={`/postcode/${pc}`}
                  className="rounded-lg border px-3 py-1.5 text-sm hover:border-primary hover:text-primary"
                >
                  {pc}
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="border-t">
        <div className="mx-auto w-full max-w-2xl space-y-2 px-4 py-6">
          <Disclaimer />
          <p className="text-xs text-muted-foreground">© 2026 88Mate</p>
        </div>
      </footer>
    </div>
  );
}
