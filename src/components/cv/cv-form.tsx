"use client";

import { useState, useTransition } from "react";
import { Loader2, Lock } from "lucide-react";
import {
  AUSTRALIAN_CERTS,
  TEMPLATE_LABELS,
  type ResumeTemplate,
} from "@/lib/resume-constants";
import { createResume, type CreateResumeInput } from "@/app/cv/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function CvForm({ isPro }: { isPro: boolean }) {
  const [template, setTemplate] = useState<ResumeTemplate>("farm");
  const [certs, setCerts] = useState<string[]>([]);
  const [languages, setLanguages] = useState("");
  const [preExp, setPreExp] = useState("");
  const [availability, setAvailability] = useState("");
  const [jobAd, setJobAd] = useState("");
  const [coverLetter, setCoverLetter] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggleCert(cert: string) {
    setCerts((prev) =>
      prev.includes(cert) ? prev.filter((c) => c !== cert) : [...prev, cert]
    );
  }

  function submit() {
    setError(null);
    const input: CreateResumeInput = {
      template,
      preAustraliaExperience: preExp,
      languages,
      certifications: certs as never,
      availability,
      targetJobAd: jobAd,
      includeCoverLetter: coverLetter,
    };
    startTransition(async () => {
      const result = await createResume(input);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Template</Label>
        <div className="grid gap-2">
          {(Object.keys(TEMPLATE_LABELS) as ResumeTemplate[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTemplate(t)}
              className={cn(
                "rounded-xl border-2 p-3 text-left text-sm transition-colors",
                template === t
                  ? "border-primary bg-accent"
                  : "border-border hover:border-muted-foreground/40"
              )}
            >
              <span className="font-medium">{TEMPLATE_LABELS[t]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Australian certifications you hold</Label>
        <div className="grid gap-1.5">
          {AUSTRALIAN_CERTS.map((cert) => (
            <label key={cert} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={certs.includes(cert)}
                onChange={() => toggleCert(cert)}
                className="h-4 w-4 accent-primary"
              />
              {cert}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="languages">Languages</Label>
        <Input
          id="languages"
          value={languages}
          onChange={(e) => setLanguages(e.target.value)}
          placeholder="e.g. French (native), English (fluent)"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="preExp">Experience before Australia (optional)</Label>
        <textarea
          id="preExp"
          value={preExp}
          onChange={(e) => setPreExp(e.target.value)}
          rows={4}
          placeholder="Jobs, studies or skills from back home — a few lines is enough, the AI will format it."
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="availability">Availability</Label>
        <Input
          id="availability"
          value={availability}
          onChange={(e) => setAvailability(e.target.value)}
          placeholder="e.g. Immediately, willing to relocate, 6+ months"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="jobAd">Tailor to a job ad (optional)</Label>
          {!isPro && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Lock className="h-3 w-3" /> Pro
            </span>
          )}
        </div>
        <textarea
          id="jobAd"
          value={jobAd}
          onChange={(e) => setJobAd(e.target.value)}
          rows={3}
          disabled={!isPro}
          placeholder={
            isPro
              ? "Paste a job ad — the CV reorients to match it."
              : "Upgrade to Pro to tailor your CV to a specific job ad."
          }
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
        />
      </div>

      <label
        className={cn(
          "flex items-center gap-2 text-sm",
          !isPro && "opacity-50"
        )}
      >
        <input
          type="checkbox"
          checked={coverLetter}
          onChange={(e) => setCoverLetter(e.target.checked)}
          disabled={!isPro}
          className="h-4 w-4 accent-primary"
        />
        Also generate a cover letter
        {!isPro && <span className="text-xs text-muted-foreground">(Pro)</span>}
      </label>

      {error && (
        <p className="text-sm font-medium text-destructive">{error}</p>
      )}

      <Button
        className="h-12 w-full"
        onClick={submit}
        disabled={pending}
      >
        {pending ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Writing your CV… (10–20s)
          </span>
        ) : (
          "Generate my CV"
        )}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Australian format — no photo, no age. Editable after, exportable as PDF.
      </p>
    </div>
  );
}
