-- Scheduler heartbeat storage.
-- Run this once in Supabase SQL Editor before relying on /api/admin/watchdog.

create table if not exists scheduler_runs (
  id uuid primary key default gen_random_uuid(),
  job text not null check (job in ('hourly', 'daily', 'watchdog')),
  source text not null default 'unknown',
  status text not null,
  status_code int,
  reason text,
  response jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists scheduler_runs_job_created_at_idx
  on scheduler_runs (job, created_at desc);

create index if not exists scheduler_runs_created_at_idx
  on scheduler_runs (created_at desc);
