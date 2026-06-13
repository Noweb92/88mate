import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Download } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { TEMPLATE_LABELS, type ResumeContent, type ResumeTemplate } from "@/lib/resume";
import { AppHeader } from "@/components/app-header";
import { Disclaimer } from "@/components/disclaimer";
import { Button } from "@/components/ui/button";
import { DeleteResumeButton } from "@/components/cv/delete-resume-button";

export const metadata: Metadata = { title: "Your CV — 88Mate" };

type StoredContent = ResumeContent & { cover_letter: string | null };

export default async function ResumeDetailPage({
  params,
}: {
  params: { id: string };
}) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) redirect("/");

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("resumes")
    .select("id, template, content")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data) notFound();

  const template = data.template as ResumeTemplate;
  const c = data.content as StoredContent;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 py-6">
      <AppHeader active="cv" />

      <main className="flex-1 space-y-5">
        <div>
          <Link
            href="/cv"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← My CVs
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">
            {c.full_name}
          </h1>
          <p className="text-sm text-primary">{c.headline}</p>
          <p className="text-xs text-muted-foreground">
            {TEMPLATE_LABELS[template]}
          </p>
        </div>

        <Button asChild className="h-12 w-full gap-2">
          <a href={`/api/cv/${data.id}`}>
            <Download className="h-4 w-4" /> Download CV
            {c.cover_letter ? " + cover letter" : ""} (PDF)
          </a>
        </Button>

        <section className="space-y-4 rounded-2xl border bg-card p-5 text-sm">
          <div className="rounded-md bg-accent p-2.5 text-xs text-accent-foreground">
            {c.work_rights}
          </div>

          <div>
            <h2 className="font-semibold text-primary">Profile</h2>
            <p className="mt-1 text-muted-foreground">
              {c.professional_summary}
            </p>
          </div>

          {c.experience.length > 0 && (
            <div>
              <h2 className="font-semibold text-primary">Experience</h2>
              <div className="mt-2 space-y-3">
                {c.experience.map((exp, i) => (
                  <div key={i}>
                    <p className="font-medium">
                      {exp.role}
                      {exp.employer ? ` — ${exp.employer}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {[exp.location, exp.dates].filter(Boolean).join(" · ")}
                    </p>
                    <ul className="mt-1 list-disc pl-4 text-muted-foreground">
                      {exp.bullets.map((b, j) => (
                        <li key={j}>{b}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {c.skills.length > 0 && (
            <div>
              <h2 className="font-semibold text-primary">Skills</h2>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {c.skills.map((s, i) => (
                  <span key={i} className="rounded border px-2 py-0.5 text-xs">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {c.certifications.length > 0 && (
            <div>
              <h2 className="font-semibold text-primary">Certifications</h2>
              <ul className="mt-1 list-disc pl-4 text-muted-foreground">
                {c.certifications.map((cert, i) => (
                  <li key={i}>{cert}</li>
                ))}
              </ul>
            </div>
          )}

          {c.cover_letter && (
            <div>
              <h2 className="font-semibold text-primary">Cover letter</h2>
              <p className="mt-1 whitespace-pre-line text-muted-foreground">
                {c.cover_letter}
              </p>
            </div>
          )}
        </section>

        <DeleteResumeButton id={data.id} />
      </main>

      <footer className="pt-8">
        <Disclaimer />
      </footer>
    </div>
  );
}
