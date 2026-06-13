import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isResumeConfigured } from "@/lib/resume";
import { formatDate } from "@/lib/visa";
import { AppHeader } from "@/components/app-header";
import { Disclaimer } from "@/components/disclaimer";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "CV builder — 88Mate" };

type ResumeRow = {
  id: string;
  template: string;
  content: { headline?: string; cover_letter?: string | null } | null;
  created_at: string;
};

export default async function CvPage() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) redirect("/");

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed, plan")
    .eq("id", user.id)
    .single();
  if (!profile?.onboarding_completed) redirect("/onboarding");

  const isPro = profile.plan === "pro" || profile.plan === "pro_lifetime";

  const { data } = await supabase
    .from("resumes")
    .select("id, template, content, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  const resumes = (data ?? []) as ResumeRow[];

  const canCreate = isPro || resumes.length === 0;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 py-6">
      <AppHeader active="cv" />

      <main className="flex-1 space-y-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">CV builder</h1>
          <p className="text-sm text-muted-foreground">
            Australian-format CVs, pre-filled from your tracked jobs and
            generated in seconds.
          </p>
        </div>

        {!isResumeConfigured() && (
          <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700">
            CV generation needs <code className="font-mono">ANTHROPIC_API_KEY</code>{" "}
            in <code className="font-mono">.env.local</code>.
          </p>
        )}

        {canCreate ? (
          <Button asChild className="h-12 w-full gap-2">
            <Link href="/cv/new">
              <Plus className="h-4 w-4" /> New CV
            </Link>
          </Button>
        ) : (
          <div className="rounded-xl border border-dashed p-4 text-center text-sm">
            <p className="font-medium">Free plan includes 1 CV</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Upgrade to Pro for unlimited CVs, cover letters and job-ad
              tailoring.
            </p>
          </div>
        )}

        {resumes.length > 0 && (
          <ul className="space-y-3">
            {resumes.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/cv/${r.id}`}
                  className="flex items-center gap-3 rounded-xl border bg-card p-4 hover:border-primary"
                >
                  <FileText className="h-5 w-5 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {r.content?.headline ?? r.template}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.template} · {formatDate(r.created_at.slice(0, 10))}
                      {r.content?.cover_letter ? " · + cover letter" : ""}
                    </p>
                  </div>
                </Link>
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
