import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { buildResumeDocument } from "@/lib/resume-pdf";
import type { ResumeContent } from "@/lib/resume";
import { formatDate, toISODate } from "@/lib/visa";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type StoredContent = ResumeContent & { cover_letter: string | null };

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const { data } = await supabase
    .from("resumes")
    .select("content")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data) return new NextResponse("Not found", { status: 404 });

  const content = data.content as StoredContent;

  const pdf = await renderToBuffer(
    buildResumeDocument(content, {
      coverLetter: content.cover_letter ?? undefined,
      generatedOn: formatDate(toISODate(new Date())),
    })
  );

  const safeName = (content.full_name || "cv")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeName || "cv"}-88mate.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
