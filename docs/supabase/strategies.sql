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
  target_posts_today int,
  posting_windows_utc text[] not null default '{}',
  min_post_interval_minutes int,
  direct_ask_cadence_hours int,
  keyword_focus text[] not null default '{}',
  hashtag_policy text not null default '',
  link_policy text not null default '',
  model text,
  raw_metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists strategies_created_at_idx on strategies (created_at desc);

alter table strategies add column if not exists posting_windows_utc text[] not null default '{}';
alter table strategies add column if not exists min_post_interval_minutes int;
alter table strategies add column if not exists direct_ask_cadence_hours int;
alter table strategies add column if not exists keyword_focus text[] not null default '{}';
alter table strategies add column if not exists hashtag_policy text not null default '';
alter table strategies add column if not exists link_policy text not null default '';
