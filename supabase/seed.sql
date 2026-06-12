-- =============================================================
-- 88Mate — DEV SEED ONLY
-- ⚠️  SAMPLE DATA for local development. NOT the official dataset.
-- Sprint 2 replaces this with the full postcode list scraped from
-- immi.homeaffairs.gov.au and award rates from fairwork.gov.au,
-- each stamped with their real source_updated_at / effective_from.
-- =============================================================

-- Sample regional postcodes (structure demo — verify before launch)
insert into public.eligible_postcodes (postcode, visa_type, industries, source_updated_at) values
  ('6530', '417', '{plant_animal_cultivation,fishing_pearling,tree_farming}', null), -- Geraldton WA (sample)
  ('6701', '417', '{plant_animal_cultivation,fishing_pearling,mining,construction}', null), -- Carnarvon WA (sample)
  ('4880', '417', '{plant_animal_cultivation}', null), -- Mareeba QLD (sample)
  ('2680', '417', '{plant_animal_cultivation}', null)  -- Griffith NSW (sample)
on conflict do nothing;

-- Sample award rates (indicative only — verify on fairwork.gov.au)
insert into public.award_rates (award, classification, casual_hourly_rate, effective_from) values
  ('horticulture', 'Level 1 — casual adult (incl. 25% loading)', 30.33, '2024-07-01'),
  ('hospitality', 'Level 1 — casual adult (incl. 25% loading)', 30.91, '2024-07-01')
on conflict do nothing;
