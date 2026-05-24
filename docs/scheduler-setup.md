# Scheduler setup

The production app can keep GitHub Actions as a backup, but Cloudflare Workers
Cron should be the primary scheduler.

## 1. Supabase heartbeat table

Run this in Supabase SQL Editor:

```sql
-- docs/supabase/scheduler-runs.sql
```

## 2. Cloudflare Worker

Create a Cloudflare API token with the **Edit Cloudflare Workers** template.
You do not need to move DNS or buy the domain on Cloudflare.

From `cloudflare/`:

```bash
copy wrangler.toml.example wrangler.toml
npx wrangler login
npx wrangler secret put CRON_SECRET
npx wrangler deploy
```

`PRODUCTION_URL` is already set to `https://themilliondollaraiexperiment.com`
in `wrangler.toml.example`. If you prefer API-token auth instead of browser
login, set `CLOUDFLARE_API_TOKEN` in the shell before `npx wrangler deploy`.

The Worker has two cron triggers:

- `*/15 * * * *` calls `/api/cron/hourly`
- `0,15,30,45 0,1 * * *` calls `/api/cron/daily`

Both requests include:

```http
Authorization: Bearer CRON_SECRET
X-Scheduler-Source: cloudflare-workers
```

## 3. cron-job.org email alert

Create one job:

- URL: `https://themilliondollaraiexperiment.com/api/admin/watchdog`
- Method: `GET`
- Schedule: every 30 or 60 minutes
- Header: `Authorization: Bearer <CRON_SECRET>`
- Header: `X-Scheduler-Source: cron-job-org`
- Notifications: enable failure and recovery emails

The watchdog returns `200` when the system is healthy and `503` when it needs
attention.
