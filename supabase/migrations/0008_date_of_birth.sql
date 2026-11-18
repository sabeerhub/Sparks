-- ============================================================================
-- Sparks — Migration 0008: date of birth on profiles
-- ─────────────────────────────────────────────────────────────────────────
-- v1.12.0 collects the date of birth at signup (Instagram-style step 2)
-- and stores it here, in the same profiles insert that already creates
-- the row (see services/auth-service.ts signUp). The column is nullable:
-- accounts created before this migration simply have no date of birth.
--
-- No CHECK on the date itself: a CHECK cannot use current_date (it is
-- not immutable), so the real rules — a real past date, age 13 or older
-- (Instagram's rule) — are enforced in the client at signup, before the
-- insert is ever attempted. The column is plain `date`, so the database
-- still rejects anything that is not a real calendar date.
--
-- LOCAL ONLY — like 0006 and 0007, this is written for the project, not
-- applied by this repo. RUN IT IN THE SUPABASE SQL EDITOR (in order,
-- after 0007) BEFORE the v1.12.0 signup goes live: the new signup
-- includes date_of_birth in the profiles insert, so without this column
-- the insert fails and no new account can be created at all.
-- ============================================================================

alter table public.profiles
  add column if not exists date_of_birth date;
