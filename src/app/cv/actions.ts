"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  AUSTRALIAN_CERTS,
  generateCoverLetter,
  generateResumeContent,
  isResumeConfigured,
  type ResumeContent,
  type ResumeInput,
} from "@/lib/resume";
import { VISA_LABELS, formatDate, type VisaType } from "@/lib/visa";
import { industryLabel } from "@/lib/industries";

const FREE_RESUME_LIMIT = 1;

const inputSchema = z.object({
  targetRole: z.string().trim().min(2).max(80),
  preAustraliaExperience: z.string().max(3000).optional().default(""),
  languages: z.string().max(500).optional().default(""),
  certifications: z.array(z.enum(AUSTRALIAN_CERTS)).default([]),
  // Free-text tickets the checklist doesn't cover (Dogging, Rigging, …).
  otherCertifications: z.string().max(300).optional().default(""),
  availability: z.string().max(300).optional().default(""),
  targetJobAd: z.string().max(6000).optional().default(""),
  includeCoverLetter: z.boolean().default(false),
});

export type CreateResumeInput = z.infer<typeof inputSchema>;

export async function createResume(raw: CreateResumeInput) {
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) return { error: "Some answers look invalid." };
  const input = parsed.data;

  if (!isResumeConfigured()) {
    return {
      error:
        "CV generation isn't configured yet — add ANTHROPIC_API_KEY to .env.local.",
    };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "first_name, last_name, phone, nationality, current_postcode, visa_type, visa_expiry, has_vehicle, plan"
    )
    .eq("id", user.id)
    .single();
  if (!profile) return { error: "Profile not found." };

  // Free plan: 1 CV. Pro: unlimited + cover letters + per-ad adaptation.
  const isPro = profile.plan === "pro" || profile.plan === "pro_lifetime";
  if (!isPro) {
    const { count } = await supabase
      .from("resumes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    if ((count ?? 0) >= FREE_RESUME_LIMIT) {
      return {
        error:
          "Free plan includes 1 CV. Upgrade to Pro for unlimited CVs, cover letters, and job-ad tailoring.",
        upgrade: true,
      };
    }
  }

  const wantsCoverLetter = input.includeCoverLetter && isPro;
  const targetJobAd = isPro ? input.targetJobAd.trim() : "";

  const { data: periodData } = await supabase
    .from("work_periods")
    .select("start_date, end_date, work_type, industry, postcode, employers(name)")
    .eq("user_id", user.id)
    .order("start_date", { ascending: false });

  type P = {
    start_date: string;
    end_date: string | null;
    work_type: string;
    industry: string | null;
    postcode: string | null;
    employers: { name: string } | null;
  };
  const workHistory = ((periodData ?? []) as unknown as P[]).map((p) => ({
    employer: p.employers?.name ?? "Employer",
    industry: p.industry ? industryLabel(p.industry) : null,
    location: p.postcode,
    dates: `${formatDate(p.start_date)} – ${p.end_date ? formatDate(p.end_date) : "present"}`,
    workType: p.work_type,
  }));

  const customCerts = input.otherCertifications
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
  const certifications = [...input.certifications, ...customCerts];

  const resumeInput: ResumeInput = {
    targetRole: input.targetRole,
    profile: {
      firstName: profile.first_name,
      lastName: profile.last_name,
      email: user.email ?? null,
      phone: profile.phone,
      nationality: profile.nationality,
      location: profile.current_postcode,
      visaLabel: VISA_LABELS[(profile.visa_type ?? "417") as VisaType],
      visaExpiry: profile.visa_expiry ? formatDate(profile.visa_expiry) : null,
      hasVehicle: profile.has_vehicle,
    },
    workHistory,
    preAustraliaExperience: input.preAustraliaExperience,
    languages: input.languages,
    certifications,
    availability: input.availability,
    ...(targetJobAd ? { targetJobAd } : {}),
  };

  let content: ResumeContent;
  let coverLetter = "";
  try {
    content = await generateResumeContent(resumeInput);
    if (wantsCoverLetter) {
      coverLetter = await generateCoverLetter(
        content,
        input.targetRole,
        targetJobAd || undefined
      );
    }
  } catch {
    return { error: "Generation failed — please try again." };
  }

  const { data: inserted, error } = await supabase
    .from("resumes")
    .insert({
      user_id: user.id,
      template: input.targetRole,
      content: { ...content, cover_letter: coverLetter || null },
      target_job_ad: targetJobAd || null,
    })
    .select("id")
    .single();
  if (error || !inserted) return { error: "Could not save the CV." };

  revalidatePath("/cv");
  redirect(`/cv/${inserted.id}`);
}

export async function deleteResume(id: string) {
  if (!z.string().uuid().safeParse(id).success) return;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  await supabase.from("resumes").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/cv");
  redirect("/cv");
}
