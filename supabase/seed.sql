-- =============================================================
-- 88Mate — seed
--
-- Eligible postcodes: see supabase/seeds/eligible_postcodes.sql
-- (GENERATED from the official immi.homeaffairs.gov.au lists —
-- regenerate with `node scripts/generate-eligible-postcodes.mjs`).
--
-- Below: award rates only. ⚠️ Indicative sample — verify on
-- fairwork.gov.au before relying on them (Sprint 5: underpayment
-- alerts will ship with a proper, dated dataset).
-- =============================================================

insert into public.award_rates (award, classification, casual_hourly_rate, effective_from) values
  ('horticulture', 'Level 1 — casual adult (incl. 25% loading)', 30.33, '2024-07-01'),
  ('hospitality', 'Level 1 — casual adult (incl. 25% loading)', 30.91, '2024-07-01')
on conflict do nothing;
