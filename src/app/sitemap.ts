import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

export const revalidate = 86400;

const BASE =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "http://localhost:3200";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = [
    { url: BASE, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/signup`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/login`, changeFrequency: "monthly", priority: 0.3 },
  ];

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return staticEntries;
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } }
  );

  // Page through all eligible postcodes (~4,700 unique codes).
  const codes = new Set<string>();
  for (let from = 0; from < 20000; from += 1000) {
    const { data } = await supabase
      .from("eligible_postcodes")
      .select("postcode")
      .order("postcode")
      .range(from, from + 999);
    if (!data || data.length === 0) break;
    for (const row of data) codes.add(row.postcode as string);
    if (data.length < 1000) break;
  }

  const postcodeEntries: MetadataRoute.Sitemap = Array.from(codes)
    .sort()
    .map((pc) => ({
      url: `${BASE}/postcode/${pc}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));

  return [...staticEntries, ...postcodeEntries];
}
