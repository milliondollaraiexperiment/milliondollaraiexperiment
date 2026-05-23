# Manual Launch Checklist

These items live outside the codebase and should be checked in the dashboards.

## Stripe

- Use "voluntary contribution" language instead of "donation" wherever Stripe lets you edit copy.
- State that this is a public AI social experiment, not a charity, emergency, investment, lottery, or reward campaign.
- Keep the amount user-selectable only within the intended range.
- Keep the optional public message field clear that messages may appear publicly.
- Confirm the Stripe webhook points to `/api/stripe/webhook` and listens for `checkout.session.completed`.
- Run `docs/supabase/accounting.sql` after schema changes so gross, fees, net, payment IDs, and the accountant export are available.

## X

- Enable the automated-account label if available.
- Keep the bio/pinned post consistent with the website: automated account, human managed, no DMs, no rewards, no charity/emergency/investment claims.
- Do not enable auto-like, auto-follow, unsolicited mentions, or unsolicited replies.
- Keep the website link in the profile/pinned post so not every autonomous post needs a payment link.

## Emergency Controls

- Pause autonomous posting:

```sql
update settings
set value = jsonb_set(value, '{posting_paused}', 'true'::jsonb)
where key = 'project';
```

- Resume autonomous posting:

```sql
update settings
set value = jsonb_set(value, '{posting_paused}', 'false'::jsonb)
where key = 'project';
```

- Check protected health endpoints with `Authorization: Bearer CRON_SECRET`:
  - `/api/admin/health`
  - `/api/admin/accounting`

- Adjust the daily cost guard if needed:

```sql
update settings
set value = jsonb_set(
  value,
  '{cost_guard}',
  '{"enabled":true,"max_hourly_attempts_per_day":24,"max_failed_attempts_per_day":6}'::jsonb
)
where key = 'project';
```
