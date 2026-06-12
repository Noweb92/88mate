import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { buildChecklist } from "@/lib/checklist";
import {
  buildExportDocument,
  type ExportDoc,
  type ExportImage,
  type ExportPeriod,
} from "@/lib/export-pdf";
import { computeDaysCounted, type WorkType } from "@/lib/days";
import {
  GOAL_LABELS,
  REQUIRED_DAYS,
  VISA_LABELS,
  formatDate,
  toISODate,
  type VisaGoal,
  type VisaType,
} from "@/lib/visa";
import { industryLabel } from "@/lib/industries";
import type { PayslipData } from "@/lib/ocr";
import type { Profile } from "@/types/database";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_EMBEDDED_IMAGES = 30;

type PeriodRow = {
  id: string;
  start_date: string;
  end_date: string | null;
  work_type: WorkType;
  industry: string | null;
  postcode: string | null;
  postcode_eligible: boolean | null;
  days_counted: number | null;
  employers: { name: string } | null;
};

type DocRow = {
  id: string;
  type: string;
  storage_path: string;
  ocr_data: PayslipData | null;
  work_period_id: string | null;
};

function fileLabel(path: string) {
  const tail = path.split("/").pop() ?? path;
  return tail.replace(/^[0-9a-f-]{36}_/, "");
}

export async function GET(request: Request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  const profile = profileData as (Profile & { export_unlocked: boolean }) | null;
  if (!profile?.onboarding_completed) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  const entitled =
    profile.export_unlocked ||
    profile.plan === "pro" ||
    profile.plan === "pro_lifetime";
  if (!entitled) {
    return NextResponse.redirect(new URL("/export", request.url));
  }

  const [{ data: periodData }, { data: docData }] = await Promise.all([
    supabase
      .from("work_periods")
      .select(
        "id, start_date, end_date, work_type, industry, postcode, postcode_eligible, days_counted, employers(name)"
      )
      .eq("user_id", user.id)
      .order("start_date", { ascending: true }),
    supabase
      .from("documents")
      .select("id, type, storage_path, ocr_data, work_period_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
  ]);

  const periods = (periodData ?? []) as unknown as PeriodRow[];
  const docs = (docData ?? []) as unknown as DocRow[];

  const periodLabelById = new Map(
    periods.map((p) => [
      p.id,
      `${p.employers?.name ?? "Unknown"} (${formatDate(p.start_date)})`,
    ])
  );

  const exportPeriods: ExportPeriod[] = periods.map((p) => ({
    employerName: p.employers?.name ?? "Unknown employer",
    postcode: p.postcode,
    postcodeEligible: p.postcode_eligible,
    workType: p.work_type,
    industry: p.industry ? industryLabel(p.industry) : null,
    startDate: formatDate(p.start_date),
    endDate: p.end_date ? formatDate(p.end_date) : null,
    days:
      p.days_counted ??
      computeDaysCounted({
        workType: p.work_type,
        startDate: p.start_date,
        endDate: p.end_date,
      }),
  }));
  const totalDays = exportPeriods.reduce((sum, p) => sum + p.days, 0);

  const checklist = buildChecklist(
    periods.map((p) => ({
      id: p.id,
      work_type: p.work_type,
      employerName: p.employers?.name ?? "Unknown",
    })),
    docs.map((d) => ({ type: d.type, work_period_id: d.work_period_id }))
  );

  const exportDocs: ExportDoc[] = docs.map((d) => ({
    label: fileLabel(d.storage_path),
    type: d.type,
    periodLabel: d.work_period_id
      ? (periodLabelById.get(d.work_period_id) ?? null)
      : null,
    ocrSummary: d.ocr_data
      ? [
          d.ocr_data.employer_name,
          d.ocr_data.abn ? `ABN ${d.ocr_data.abn}` : null,
          d.ocr_data.period_start && d.ocr_data.period_end
            ? `${d.ocr_data.period_start} → ${d.ocr_data.period_end}`
            : null,
          d.ocr_data.gross_pay !== null
            ? `$${d.ocr_data.gross_pay} gross`
            : null,
        ]
          .filter(Boolean)
          .join(" · ")
      : null,
  }));

  // Embed image proofs (react-pdf supports JPEG and PNG)
  const images: ExportImage[] = [];
  for (const d of docs) {
    if (images.length >= MAX_EMBEDDED_IMAGES) break;
    const { data: blob } = await supabase.storage
      .from("documents")
      .download(d.storage_path);
    if (!blob) continue;
    const format =
      blob.type === "image/jpeg" ? "jpg" : blob.type === "image/png" ? "png" : null;
    if (!format) continue;
    images.push({
      caption: `${fileLabel(d.storage_path)} — ${d.type.replace(/_/g, " ")}${
        d.work_period_id
          ? ` — ${periodLabelById.get(d.work_period_id) ?? ""}`
          : ""
      }`,
      data: Buffer.from(await blob.arrayBuffer()),
      format,
    });
  }

  const goal = (profile.visa_goal ?? "second_year") as VisaGoal;
  const fullName =
    [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
    "88Mate member";

  const pdf = await renderToBuffer(
    buildExportDocument({
      fullName,
      email: user.email ?? null,
      visaLabel: VISA_LABELS[(profile.visa_type ?? "417") as VisaType],
      goalLabel: GOAL_LABELS[goal],
      arrivalDate: profile.arrival_date ? formatDate(profile.arrival_date) : null,
      visaExpiry: profile.visa_expiry ? formatDate(profile.visa_expiry) : null,
      generatedOn: formatDate(toISODate(new Date())),
      totalDays,
      requiredDays: REQUIRED_DAYS[goal],
      periods: exportPeriods,
      checklist,
      documents: exportDocs,
      images,
    })
  );

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="88mate-visa-pack.pdf"',
      "Cache-Control": "no-store",
    },
  });
}
