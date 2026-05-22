-- Launch settings.
-- Run after clearing MVP test data and before turning DRY_RUN=false.

insert into settings (key, value)
values ('project', '{"goal":1000000,"daily_post_limit":8,"mode":"normal"}'::jsonb)
on conflict (key)
do update set value = excluded.value;
