-- Kör i Supabase SQL Editor om du får "column candidate_comments.body does not exist".
-- Lägger till kolumnen body om tabellen skapades utan den.

ALTER TABLE public.candidate_comments
  ADD COLUMN IF NOT EXISTS body text NOT NULL DEFAULT '';
