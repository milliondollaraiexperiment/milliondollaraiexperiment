-- Strategy Brain daily summaries.
-- Run this once in Supabase SQL Editor before enabling /api/cron/daily strategy writes.

create table if not exists strategies (
  id uuid primary key default gen_random_uuid(),
  summary text not null,
  preferred_formats text[] not null default '{}',
  forced_format text,
  banned_angles text[] not null default '{}',
  rewrite_guidance text not null default '',
  top_reject_reasons text[] not null default '{}',
  model text,
  raw_metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists strategies_created_at_idx on strategies (created_at desc);
