-- Public summary memory + AI health.
-- Run once in Supabase SQL Editor before relying on the daily summary pipeline.

create table if not exists daily_summaries (
  id uuid primary key default gen_random_uuid(),
  day_number int not null unique,
  et_date text not null,
  coverage_start timestamptz not null,
  coverage_end timestamptz not null,
  partial boolean not null default false,
  attempts int not null default 0,
  posted int not null default 0,
  logged_only int not null default 0,
  rejected int not null default 0,
  failed int not null default 0,
  cleared_safety int not null default 0,
  donations_count int not null default 0,
  donations_gross_cents int not null default 0,
  current_balance_cents int not null default 0,
  top_reject_reasons text[] not null default '{}',
  top_formats text[] not null default '{}',
  lessons text[] not null default '{}',
  public_thread text[] not null default '{}',
  x_post_ids text[] not null default '{}',
  raw_metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists daily_summaries_day_number_idx
  on daily_summaries (day_number desc);

create table if not exists period_summaries (
  id uuid primary key default gen_random_uuid(),
  period_type text not null check (period_type in ('weekly', 'monthly')),
  period_number int not null,
  period_label text not null,
  coverage_start timestamptz not null,
  coverage_end timestamptz not null,
  attempts int not null default 0,
  posted int not null default 0,
  logged_only int not null default 0,
  rejected int not null default 0,
  failed int not null default 0,
  donations_count int not null default 0,
  donations_gross_cents int not null default 0,
  current_balance_cents int not null default 0,
  lessons text[] not null default '{}',
  public_thread text[] not null default '{}',
  x_post_ids text[] not null default '{}',
  raw_metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (period_type, period_number, period_label)
);

create index if not exists period_summaries_lookup_idx
  on period_summaries (period_type, created_at desc);

create table if not exists strategy_memories (
  id uuid primary key default gen_random_uuid(),
  active boolean not null default true,
  summary text not null default '',
  active_lessons text[] not null default '{}',
  retired_lessons text[] not null default '{}',
  avoid_patterns text[] not null default '{}',
  prefer_patterns text[] not null default '{}',
  tone_rules text[] not null default '{}',
  link_rules text[] not null default '{}',
  raw_memory jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists strategy_memories_one_active_idx
  on strategy_memories (active)
  where active;

create table if not exists strategy_health (
  id int primary key default 1 check (id = 1),
  status text not null default 'current'
    check (status in ('current', 'fallback', 'stale', 'conservative', 'recovery')),
  latest_successful_strategy_id uuid,
  last_attempted_at timestamptz,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  last_failure_reason text,
  last_model text,
  fallback_model text,
  consecutive_failures int not null default 0,
  consecutive_successes int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into strategy_health (id)
values (1)
on conflict (id) do nothing;

create table if not exists ai_health (
  component text primary key,
  status text not null default 'healthy'
    check (status in ('healthy', 'degraded', 'shutdown')),
  consecutive_failures int not null default 0,
  consecutive_successes int not null default 0,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  last_failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into ai_health (component)
values ('writer'), ('safety'), ('summary'), ('strategy')
on conflict (component) do nothing;
