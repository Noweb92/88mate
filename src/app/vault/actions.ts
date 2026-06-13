"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  OCR_ACCEPTED_TYPES,
  OCR_CONFIDENCE_THRESHOLD,
  extractPayslip,
  isOcrConfigured,
  type PayslipData,
} from "@/lib/ocr";
import { checkAwardRate } from "@/lib/awards";

const DOC_TYPES = [
  "payslip",
  "contract",
  "bank_statement",
  "reference",
  "piece_rate_agreement",
] as const;

const registerSchema = z.object({
  storagePath: z.string().min(3).max(500),
  type: z.enum(DOC_TYPES),
  workPeriodId: z.string().uuid().nullable(),
});

export type RegisterDocumentInput = z.infer<typeof registerSchema>;

export async function registerDocument(input: RegisterDocumentInput) {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid document data." };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // The storage path must live under the user's own folder.
  if (!parsed.data.storagePath.startsWith(`${user.id}/`)) {
    return { error: "Invalid storage path." };
  }

  const { data, error } = await supabase
    .from("documents")
    .insert({
      user_id: user.id,
      work_period_id: parsed.data.workPeriodId,
      type: parsed.data.type,
      storage_path: parsed.data.storagePath,
    })
    .select("id")
    .single();

  if (error || !data) return { error: "Could not save the document." };

  revalidatePath("/vault");
  return { id: data.id as string };
}

export async function runOcr(documentId: string) {
  if (!z.string().uuid().safeParse(documentId).success) {
    return { error: "Invalid document id." };
  }
  if (!isOcrConfigured()) {
    return {
      error:
        "OCR isn't configured yet — add ANTHROPIC_API_KEY to .env.local and restart.",
    };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: doc } = await supabase
    .from("documents")
    .select("id, storage_path, work_periods(industry)")
    .eq("id", documentId)
    .eq("user_id", user.id)
    .single();
  if (!doc) return { error: "Document not found." };

  const { data: blob, error: downloadError } = await supabase.storage
    .from("documents")
    .download(doc.storage_path);
  if (downloadError || !blob) return { error: "Could not read the file." };

  const mediaType = blob.type || "application/octet-stream";
  if (!OCR_ACCEPTED_TYPES.includes(mediaType)) {
    return { error: "OCR supports images (JPEG/PNG/WebP) and PDFs only." };
  }
  if (blob.size > 8 * 1024 * 1024) {
    return { error: "File too large for OCR (8 MB max)." };
  }

  let extracted: PayslipData;
  try {
    const base64Data = Buffer.from(await blob.arrayBuffer()).toString("base64");
    extracted = await extractPayslip({ base64Data, mediaType });
  } catch {
    return { error: "OCR failed — try again, or fill the fields manually." };
  }

  // Underpayment check (PRD 2.2) — only when the document is linked to a
  // work period whose industry maps to a seeded award.
  // Supabase types a to-one embed as a possibly-array shape — normalise.
  const wp = doc.work_periods as
    | { industry: string | null }
    | { industry: string | null }[]
    | null;
  const industry =
    (Array.isArray(wp) ? wp[0]?.industry : wp?.industry) ?? null;
  const award = await checkAwardRate(supabase, {
    industry,
    hourlyRate: extracted.hourly_rate,
  });

  const { error: updateError } = await supabase
    .from("documents")
    .update({ ocr_data: extracted, underpayment_flag: award?.underpaid ?? false })
    .eq("id", documentId)
    .eq("user_id", user.id);
  if (updateError) return { error: "Could not save the extracted data." };

  revalidatePath("/vault");
  revalidatePath("/dashboard");
  return {
    data: extracted,
    needsReview: extracted.confidence < OCR_CONFIDENCE_THRESHOLD,
    award,
  };
}

export async function deleteDocument(documentId: string) {
  if (!z.string().uuid().safeParse(documentId).success) return;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: doc } = await supabase
    .from("documents")
    .select("id, storage_path")
    .eq("id", documentId)
    .eq("user_id", user.id)
    .single();
  if (!doc) return;

  await supabase.storage.from("documents").remove([doc.storage_path]);
  await supabase.from("documents").delete().eq("id", documentId).eq("user_id", user.id);

  revalidatePath("/vault");
}
