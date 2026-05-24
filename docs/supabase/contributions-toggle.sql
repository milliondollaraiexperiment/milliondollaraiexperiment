-- contributions-toggle.sql
--
-- Flip the contributions_disabled flag on the settings.project JSON value.
-- Run one of the blocks below in the Supabase SQL editor.
--
-- When this flag is true:
--   - Writer AI will not write direct_ask posts and will not include the
--     contribution link in any post.
--   - Strategy AI will not recommend direct_ask and will set
--     direct_ask_cadence_hours to its maximum.
--   - The homepage shows a one-line "contributions temporarily paused"
--     note in place of the Contribute CTA.
--
-- The flag defaults to TRUE in code so that a missing field is safe.

-- DISABLE contributions (payment processor restricted, fiscal host not ready, etc.)
update settings
set value = coalesce(value, '{}'::jsonb) || jsonb_build_object('contributions_disabled', true)
where key = 'project';

-- ENABLE contributions (uncomment when ready)
-- update settings
-- set value = coalesce(value, '{}'::jsonb) || jsonb_build_object('contributions_disabled', false)
-- where key = 'project';

-- Verify
select value->>'contributions_disabled' as contributions_disabled
from settings
where key = 'project';
