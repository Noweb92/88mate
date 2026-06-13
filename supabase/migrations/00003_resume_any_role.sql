-- Sprint 5 follow-up: let CVs target ANY job, not just the 3 seed
-- templates. `template` now stores a free-text role/industry label.
alter table public.resumes
  drop constraint if exists resumes_template_check;
