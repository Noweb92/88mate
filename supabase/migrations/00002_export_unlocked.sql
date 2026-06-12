-- Sprint 4: one-off purchase of the visa evidence pack export
-- (29 AUD, PRD §4 "Export seul"). Pro plans bypass this flag.
alter table public.profiles
  add column if not exists export_unlocked boolean not null default false;
