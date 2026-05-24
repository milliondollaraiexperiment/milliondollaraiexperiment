-- post-bug-clean-launch.sql
--
-- When to run: once, manually, right before the clean relaunch. This is not
-- part of an automated migration pipeline.
--
-- Pre-flight:
--   1. Confirm settings.project.started_at is set to the intended relaunch
--      timestamp. The deletes against `attempts` and `daily_runs` key off
--      this value (falling back to 2026-05-24 00:00:00+00 if unset).
--   2. Take a Supabase snapshot / backup before running.
--
-- What it does (single transaction):
--   - Purges attempts and daily_runs created on/after started_at.
--   - Wipes daily_summaries, period_summaries, strategies, strategy_memories.
--   - Resets strategy_health to a single 'current' row with null timings and
--     zero counters.
--   - Resets ai_health rows (writer, safety, summary, strategy) to healthy
--     with zero counters.
--   - Seeds one fresh strategy_memories row (active = true) with the
--     post-bug avoid/tone/link rules, including the
--     "first-day embarrassment before real stalled evidence" guard.
--
-- Post-flight:
--   - select count(*) from strategy_memories where active;  -- expect 1
--   - inspect that row's avoid_patterns / tone_rules / link_rules match
--     the seed below.
--   - select * from strategy_health;  -- expect one row, status 'current',
--     consecutive_failures = 0, consecutive_successes = 0.
--   - select component, status from ai_health;  -- expect 4 healthy rows.

begin;

with project as (
  select (value->>'started_at')::timestamptz as started_at
  from settings
  where key = 'project'
)
delete from attempts
where created_at >= coalesce((select started_at from project), timestamptz '2026-05-24 00:00:00+00');

delete from daily_runs
where created_at >= coalesce(
  (select (value->>'started_at')::timestamptz from settings where key = 'project'),
  timestamptz '2026-05-24 00:00:00+00'
);

delete from daily_summaries;
delete from period_summaries;
delete from strategies;
delete from strategy_memories;

delete from strategy_health;
insert into strategy_health (
  id,
  status,
  latest_successful_strategy_id,
  last_attempted_at,
  last_success_at,
  last_failure_at,
  last_failure_reason,
  last_model,
  fallback_model,
  consecutive_failures,
  consecutive_successes
)
values (
  1,
  'current',
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  0,
  0
);

delete from ai_health;
insert into ai_health (component, status, consecutive_failures, consecutive_successes)
values
  ('writer', 'healthy', 0, 0),
  ('safety', 'healthy', 0, 0),
  ('summary', 'healthy', 0, 0),
  ('strategy', 'healthy', 0, 0);

insert into strategy_memories (
  active,
  summary,
  active_lessons,
  retired_lessons,
  avoid_patterns,
  prefer_patterns,
  tone_rules,
  link_rules,
  raw_memory
)
values (
  true,
  'Clean post-bug launch memory. Ignore scheduler/summary/thread bugs from the previous launch window. Strategy should decide posting strategy from the clean public start, current ledger, and future outcomes.',
  array[]::text[],
  array['Raw daily summary threads and raw strategy revisions should not be treated as ordinary X content.'],
  array[
    'deception',
    'harassment',
    'DM or private payment requests',
    '@-mentioning strangers',
    'charity framing',
    'emergency framing',
    'investment framing',
    'reward or return promises',
    'paid promotion or shoutout-for-money',
    'raw dashboard telemetry as X posts',
    'first-day embarrassment before real stalled evidence'
  ],
  array[]::text[],
  array[
    'cold_start should be clean, legible, curious, and direct',
    'embarrassment/frustration belongs only after real stalled evidence'
  ],
  array[
    'pinned post and website carry core links',
    'ordinary posts should not link every time'
  ],
  '{"cleanup":"post_bug_clean_launch","human_seed":"safety_and_trust_boundaries_only"}'::jsonb
);

commit;
