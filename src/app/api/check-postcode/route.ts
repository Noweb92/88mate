import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const postcode = (searchParams.get("postcode") ?? "").trim();
  const visaType = searchParams.get("visa") === "462" ? "462" : "417";

  if (!/^\d{4}$/.test(postcode)) {
    return NextResponse.json(
      { ok: false, error: "invalid_postcode" },
      { status: 400 }
    );
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json(
      { ok: false, error: "not_configured" },
      { status: 503 }
    );
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("eligible_postcodes")
    .select("postcode, visa_type, industries, source_updated_at")
    .eq("postcode", postcode)
    .eq("visa_type", visaType)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { ok: false, error: "lookup_failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    postcode,
    visaType,
    eligible: Boolean(data),
    industries: data?.industries ?? [],
    sourceUpdatedAt: data?.source_updated_at ?? null,
  });
}
