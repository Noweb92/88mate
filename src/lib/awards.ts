/**
 * Underpayment check (PRD 2.2). Compares an OCR'd hourly rate against
 * the minimum casual award rate for the relevant industry.
 *
 * award_rates is public-read and seeded with indicative figures —
 * always surfaced as "indicative, verify on fairwork.gov.au". Server
 * helpers only.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

// Maps a tracked-work industry to the seeded award it's assessed against.
// Industries with no seeded award (mining, construction, …) return null —
// we don't assess what we can't ground in data.
const INDUSTRY_TO_AWARD: Record<string, string> = {
  plant_animal_cultivation: "horticulture",
  tree_farming: "horticulture",
  fishing_pearling: "horticulture",
  tourism_hospitality: "hospitality",
};

// Small tolerance so a few cents of rounding on a payslip doesn't trip a
// scary red flag — only clear shortfalls count.
const TOLERANCE_AUD = 0.5;

export type AwardCheck = {
  award: string;
  minRate: number;
  effectiveFrom: string;
  underpaid: boolean;
  shortfallPerHour: number;
};

export async function checkAwardRate(
  supabase: SupabaseClient,
  opts: { industry: string | null; hourlyRate: number | null }
): Promise<AwardCheck | null> {
  if (opts.hourlyRate == null || opts.hourlyRate <= 0) return null;
  if (!opts.industry) return null;

  const award = INDUSTRY_TO_AWARD[opts.industry];
  if (!award) return null;

  const { data } = await supabase
    .from("award_rates")
    .select("award, casual_hourly_rate, effective_from")
    .eq("award", award)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;

  const minRate = Number(data.casual_hourly_rate);
  const shortfall = minRate - opts.hourlyRate;
  return {
    award: data.award,
    minRate,
    effectiveFrom: data.effective_from,
    underpaid: shortfall > TOLERANCE_AUD,
    shortfallPerHour: shortfall > 0 ? Math.round(shortfall * 100) / 100 : 0,
  };
}
