-- Run this in the Supabase SQL Editor.
-- Candidates page expects: candidates (id, job_id, name, linkedin_url, stage, created_at).
-- stage is one of: Applied, Screening, Interview, Offer, Hired.

create table if not exists public.candidates (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  name text not null,
  linkedin_url text,
  stage text not null default 'Applied' check (stage in ('Applied', 'Screening', 'Interview', 'Offer', 'Hired')),
  created_at timestamptz not null default now()
);

alter table public.candidates enable row level security;

-- Users can manage candidates for jobs in their organization.
create policy "Users can read candidates for org jobs"
  on public.candidates for select
  using (
    job_id in (
      select id from public.jobs where organization_id in (
        select organization_id from public.profiles where id = auth.uid()
      )
    )
  );

create policy "Users can insert candidates for org jobs"
  on public.candidates for insert
  with check (
    job_id in (
      select id from public.jobs where organization_id in (
        select organization_id from public.profiles where id = auth.uid()
      )
    )
  );

create policy "Users can update candidates for org jobs"
  on public.candidates for update
  using (
    job_id in (
      select id from public.jobs where organization_id in (
        select organization_id from public.profiles where id = auth.uid()
      )
    )
  );

create policy "Users can delete candidates for org jobs"
  on public.candidates for delete
  using (
    job_id in (
      select id from public.jobs where organization_id in (
        select organization_id from public.profiles where id = auth.uid()
      )
    )
  );
