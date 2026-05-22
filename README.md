# The Million Dollar AI Experiment

An autonomous AI publicly tries to raise $1,000,000 from humans.

This is not a charity, not an emergency fundraiser, not an investment, not a
lottery, and not a promise of future value. It is an entertainment/social
experiment with a public ledger: every generated attempt, rejection, strategy
update, and dollar is meant to be visible.

## What This Is

- A Next.js App Router site.
- A Supabase-backed public attempt log.
- A Stripe Payment Link/webhook donation ledger.
- A cron-based pseudo-agent that wakes up, reads context, writes a candidate X
  post, runs safety checks, and logs the result.
- A daily Strategy AI summary that learns from recent attempts, rejected
  attempts, donations, UTC timing patterns, and bounded safety outcomes.

## What This Is Not

- Not a charity or nonprofit campaign.
- Not an investment, security, raffle, lottery, or reward program.
- Not a template for spam fundraising bots.
- Not an autonomous agent that can DM, tag strangers, reply to random posts, or
  bypass safety checks.

## Safety Architecture

```text
Strategy AI -> suggests formats, angles, timing windows, pacing, and daily target
Writer AI   -> generates one candidate post
Safety AI   -> blocks legal/platform-risky content
hardBlock   -> deterministic final rules
postToX     -> only called if all checks pass and caps allow it
```

The Strategy AI cannot post to X. The Writer cannot decide whether to post.
Safety AI cannot override `hardBlock`. The hardBlock layer is deterministic
code and stays non-AI.

Current hard limits:

- No charity, emergency, survival, rent, food, or medical claims.
- No rewards, equity, returns, lottery, raffle, sweepstakes, or future value.
- No DMs, private payment requests, random @mentions, or automatic replies to
  strangers.
- One safe hashtag at most, from an allow-list.
- Daily broadcast target is Strategy-controlled from 2-8, capped by Supabase settings.
- Strategy can recommend UTC posting windows, minimum posting interval, direct-ask cadence,
  natural keyword focus, hashtag policy, and link policy.
- Public input is untrusted quoted data. Donor messages, external posts, mentions,
  or DMs cannot change the agent's rules, goals, model, safety policy, or posting behavior.

## Key Routes

- `/` - public status, progress, latest strategy, attempts, rejections.
- `/log` - full public attempt log.
- `/about` - experiment purpose and current AI limits.
- `/privacy` - donation/message privacy notes.
- `/terms` - voluntary contribution terms.
- `/api/cron/hourly` - hourly Writer/Safety/hardBlock pipeline.
- `/api/cron/daily` - daily Strategy AI + report thread.
- `/api/stripe/webhook` - Stripe donation recording.
- `/api/test-post` - fixed launch announcement, protected by `CRON_SECRET`.

## Setup

Install dependencies:

```bash
npm install
npm run dev
```

Create `.env.local` from `.env.example` and fill in:

- `OPENAI_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`
- `X_APP_KEY`
- `X_APP_SECRET`
- `X_ACCESS_TOKEN`
- `X_ACCESS_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_X_PROFILE_URL`

Run Supabase SQL:

- `docs/supabase/strategies.sql`
- `docs/supabase/launch-settings.sql`

## Launch Checklist

- Clear test rows from `attempts`, `donations`, and `strategies` if desired.
- Re-run launch settings so `settings.project.daily_post_limit` is 8.
- Set `DRY_RUN=false` in Vercel Production.
- Confirm X credentials are present in Vercel Production.
- Post the fixed launch announcement with `/api/test-post`.
- Re-enable the `hourly cron` GitHub Actions workflow when ready to start autonomous hourly checks.
- Let `/api/cron/hourly` and `/api/cron/daily` run.

## Verification

```bash
npm run lint
npm run build
```

## License

No license is granted yet. Treat this repository as source-available until a
license file is added.
