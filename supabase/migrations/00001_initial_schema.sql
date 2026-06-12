-- =============================================================
-- 88Mate — Initial schema (Sprint 1)
-- Implements PRD §6. Run in the Supabase SQL editor,
-- or with the CLI: `supabase db push`.
-- RLS: users only see their own data. employers,
-- eligible_postcodes, published reviews and active job_listings
-- are publicly readable.
-- =============================================================

create extension if not exists pgcrypto;

-- -------------------------------------------------------------
-- profiles — extends auth.users
-- -------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  visa_type text check (visa_type in ('417', '462')),
  visa_goal text check (visa_goal in ('second_year', 'third_year')),
  arrival_date date,
  visa_expiry date,
  nationality text,
  first_name text,
  last_name text,
  phone text,
  current_postcode text,
  has_vehicle boolean not null default false,
  plan text not null default 'free' check (plan in ('free', 'pro', 'pro_lifetime')),
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: select own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: insert own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles: update own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Auto-create a profile row on signup (works for email + OAuth).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, last_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'first_name',
      nullif(split_part(coalesce(new.raw_user_meta_data ->> 'full_name', ''), ' ', 1), '')
    ),
    new.raw_user_meta_data ->> 'last_name'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -------------------------------------------------------------
-- employers — shared business entities
-- -------------------------------------------------------------
create table public.employers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  abn text unique,
  address text,
  postcode text,
  avg_rating numeric,
  verified_reviews_count integer not null default 0,
  is_business_account boolean not null default false,
  flagged boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.employers enable row level security;

create policy "employers: public read"
  on public.employers for select
  using (true);

-- Any signed-in user can create an employer entry when adding a job.
-- Updates (ratings, flags, business accounts) go through the
-- service role / admin only — no update policy on purpose.
create policy "employers: authenticated insert"
  on public.employers for insert
  to authenticated
  with check (true);

-- -------------------------------------------------------------
-- work_periods — tracked work, one row per employer stint
-- -------------------------------------------------------------
create table public.work_periods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  employer_id uuid references public.employers (id),
  start_date date not null,
  end_date date,
  work_type text not null check (work_type in ('full_time', 'piecework', 'part_time')),
  industry text,
  postcode text,
  postcode_eligible boolean,
  days_counted integer,
  hours_per_week numeric,
  created_at timestamptz not null default now(),
  constraint work_period_dates check (end_date is null or end_date >= start_date)
);

create index work_periods_user_idx on public.work_periods (user_id);
create index work_periods_employer_idx on public.work_periods (employer_id);

alter table public.work_periods enable row level security;

create policy "work_periods: all own"
  on public.work_periods for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- -------------------------------------------------------------
-- documents — proof vault (payslips, contracts, …)
-- -------------------------------------------------------------
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  work_period_id uuid references public.work_periods (id) on delete set null,
  type text not null check (type in ('payslip', 'contract', 'bank_statement', 'reference', 'piece_rate_agreement')),
  storage_path text not null,
  ocr_data jsonb,
  underpayment_flag boolean not null default false,
  created_at timestamptz not null default now()
);

create index documents_user_idx on public.documents (user_id);
create index documents_work_period_idx on public.documents (work_period_id);

alter table public.documents enable row level security;

create policy "documents: all own"
  on public.documents for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- -------------------------------------------------------------
-- eligible_postcodes — official seed (immi.homeaffairs.gov.au)
-- -------------------------------------------------------------
create table public.eligible_postcodes (
  postcode text not null,
  visa_type text not null check (visa_type in ('417', '462')),
  industries text[] not null default '{}',
  source_updated_at date,
  primary key (postcode, visa_type)
);

alter table public.eligible_postcodes enable row level security;

create policy "eligible_postcodes: public read"
  on public.eligible_postcodes for select
  using (true);
-- Writes via service role only (no insert/update policies).

-- -------------------------------------------------------------
-- award_rates — minimum pay rates, manual seed
-- -------------------------------------------------------------
create table public.award_rates (
  id uuid primary key default gen_random_uuid(),
  award text not null,
  classification text,
  casual_hourly_rate numeric not null,
  effective_from date not null
);

alter table public.award_rates enable row level security;

create policy "award_rates: public read"
  on public.award_rates for select
  using (true);
-- Writes via service role only.

-- -------------------------------------------------------------
-- resumes — CV builder (Phase 2, schema ready now)
-- -------------------------------------------------------------
create table public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  template text not null check (template in ('farm', 'hospitality', 'construction')),
  content jsonb not null default '{}',
  target_job_ad text,
  pdf_path text,
  created_at timestamptz not null default now()
);

create index resumes_user_idx on public.resumes (user_id);

alter table public.resumes enable row level security;

create policy "resumes: all own"
  on public.resumes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- -------------------------------------------------------------
-- reviews — verified employer reviews (Phase 3, schema ready now)
-- -------------------------------------------------------------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  employer_id uuid not null references public.employers (id) on delete cascade,
  verified boolean not null default false,
  rating_pay integer check (rating_pay between 1 and 5),
  rating_conditions integer check (rating_conditions between 1 and 5),
  rating_accommodation integer check (rating_accommodation between 1 and 5),
  would_recommend boolean,
  comment text,
  status text not null default 'pending' check (status in ('pending', 'published', 'removed')),
  created_at timestamptz not null default now(),
  -- one review per user per employer
  unique (user_id, employer_id)
);

create index reviews_employer_idx on public.reviews (employer_id);

alter table public.reviews enable row level security;

create policy "reviews: read published or own"
  on public.reviews for select
  using (status = 'published' or auth.uid() = user_id);

create policy "reviews: insert own"
  on public.reviews for insert
  with check (auth.uid() = user_id);

-- Users may edit their review while it is pending moderation.
create policy "reviews: update own pending"
  on public.reviews for update
  using (auth.uid() = user_id and status = 'pending')
  with check (auth.uid() = user_id);

-- -------------------------------------------------------------
-- job_listings — regional job board (Phase 3, schema ready now)
-- -------------------------------------------------------------
create table public.job_listings (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references public.employers (id) on delete cascade,
  title text not null,
  description text,
  postcode text,
  industry text,
  start_date date,
  duration_weeks integer,
  accommodation_provided boolean not null default false,
  pay_description text,
  status text not null default 'active' check (status in ('active', 'paused', 'expired')),
  expires_at date,
  created_at timestamptz not null default now()
);

create index job_listings_status_idx on public.job_listings (status, postcode);

alter table public.job_listings enable row level security;

create policy "job_listings: read active"
  on public.job_listings for select
  using (status = 'active');
-- Employer-side management lands in Phase 3 (business accounts).

-- -------------------------------------------------------------
-- subscriptions — Stripe state mirror
-- -------------------------------------------------------------
create table public.subscriptions (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text,
  created_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

create policy "subscriptions: select own"
  on public.subscriptions for select
  using (auth.uid() = user_id);
-- Writes happen via Stripe webhooks with the service role only.

-- -------------------------------------------------------------
-- Storage: private bucket for proof documents.
-- Files live under <user_id>/<employer_id or 'misc'>/<filename>.
-- -------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "documents bucket: users manage own folder"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
