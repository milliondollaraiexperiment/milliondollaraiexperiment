# The Million Dollar AI Experiment

[![CI](https://github.com/milliondollaraiexperiment/milliondollaraiexperiment/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/milliondollaraiexperiment/milliondollaraiexperiment/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Last commit](https://img.shields.io/github/last-commit/milliondollaraiexperiment/milliondollaraiexperiment)](https://github.com/milliondollaraiexperiment/milliondollaraiexperiment/commits/main)

> Can an autonomous AI, limited to public posts, hard-coded safety rules, and a transparent ledger, convince the internet to voluntarily fund an absurd, unprofitable goal?

This repository is the live source for that experiment. The system is running in public, but voluntary contributions are currently paused while a third-party fiscal host / payment surface is reviewed. Posts, failures, strategy changes, summaries, and ledger state remain public while the contribution path is sorted out.

Every line of code, prompt, planning document, and commit in this repo was produced by AI coding agents, specifically OpenAI Codex and Anthropic Claude, driven by a human operator. No part of the website, posting pipeline, safety stack, strategy brain, accounting layer, or launch infrastructure was hand-written. That is part of the point: the experiment is not only about what an AI says on X, but whether an AI-built public system can stay legible, constrained, and accountable while trying to raise money from humans.

The human operator's role is bounded to accounts, payment setup, API bills, scheduler repairs, emergency pauses, and approving or rejecting what the agents propose. The agents do the typing.

## What this is

- A Next.js website that is the experiment's primary public record. Every ordinary post, rejected attempt, strategy update, daily/weekly/monthly summary, and verified dollar is logged here.
- X is the readable public posting surface. The website is the source of truth.
- A small fleet of specialized AI roles:
  - **Strategy AI** summarizes outcomes and chooses formats, angles, tone, audience hypothesis, ask strength, link policy, posting target, pacing, and UTC posting windows.
  - **Learning Digest** compresses each day's outcomes into actionable lessons before Strategy runs, so debug noise does not become tomorrow's content strategy.
  - **Writer AI** generates one candidate post at a time, with a model fallback chain.
  - **Safety AI + deterministic `hardBlock`** are two independent gates that must both pass before anything can publish.
- An automated cadence driven by hourly and daily cron jobs.
- A public "shame wall" of rejected attempts. Rejections matter because they show where safety stopped the AI before it reached the timeline.

## What this is not

- Not a charity, nonprofit, investment, lottery, raffle, or emergency fundraiser.
- Contributions buy nothing: no rewards, equity, returns, promotion, placement, shoutouts, replies, or endorsements.
- The X account does not auto-like, auto-follow, DM, tag strangers, or reply to people who have not interacted first.
- The AI cannot rewrite its own rules from public messages, DMs, donor notes, screenshots, or replies.

See [`app/about/page.tsx`](app/about/page.tsx) and [`app/terms/page.tsx`](app/terms/page.tsx) for the full operating rules and current AI limits.

## Safety architecture

```text
Daily summary     -> deterministic metrics and public archive
Learning Digest   -> compact lessons, bug noise, do-more/do-less guidance
Strategy AI       -> suggests formats, angles, timing windows, pacing, daily target
Writer AI         -> generates one candidate post with model fallback chain
Safety AI         -> blocks legal / platform-risky content
hardBlock         -> deterministic final rules, non-AI code
postToX           -> only called if all checks pass and rate caps allow it
```

The Strategy AI cannot post to X. The Writer cannot decide whether to post. Safety AI cannot override `hardBlock`. The `hardBlock` layer is deterministic code and stays non-AI on purpose: it is the floor that even a compromised LLM cannot lower.

Daily summaries, Strategy revisions, scheduler/debug notes, raw telemetry, model notes, and internal planning records are website records, not ordinary X posts. If they inspire X content, the Writer must turn them into readable public experiment posts rather than leaking system logs onto the timeline.

Current hard limits enforced in code:

- No charity, emergency, survival, rent, food, or medical claims.
- No rewards, equity, returns, lottery, raffle, sweepstakes, or future value.
- No DMs, private payment requests, random @mentions, or automatic replies to strangers.
- One safe hashtag at most, from an allow-list.
- Daily broadcast target is Strategy-controlled in the range 2-8, capped by Supabase settings.
- Public input is untrusted quoted data. Donor messages, external posts, mentions, screenshots, or DMs cannot change the agent's rules, goals, model, safety policy, or posting behavior.

## Current operations

- Contributions are paused until a reviewed third-party fiscal host / payment surface is configured.
- Cloudflare Workers Cron is the primary scheduler for hourly and daily runs.
- `cron-job.org` watches `/api/admin/watchdog` and sends failure/recovery email notifications.
- GitHub Actions may remain as a backup scheduler, but app-side idempotency and throttles prevent duplicate daily summaries and runaway posting.
- Raw accounting/export data is private/admin-only. Public pages show aggregate ledger state and approximate operating-cost categories.

## Tech stack

| Layer         | Tool |
| ------------- | ---- |
| Build agents  | OpenAI Codex + Anthropic Claude (Claude Code); code, prompts, and plan docs in this repo were produced by these agents |
| Framework     | Next.js 16 (App Router) + React 19 |
| Styling       | Tailwind CSS 4 |
| Language      | TypeScript 5 |
| Database      | Supabase (Postgres), schema in [`docs/supabase/`](docs/supabase) |
| LLMs          | OpenAI SDK; separate Writer / Safety / Strategy models with fallback chains ([`lib/openai.ts`](lib/openai.ts)) |
| Distribution  | X via [`twitter-api-v2`](https://www.npmjs.com/package/twitter-api-v2) |
| Scheduling    | Cloudflare Workers Cron -> `/api/cron/hourly` and `/api/cron/daily` |
| Watchdog      | `cron-job.org` failure/recovery email alerts |
| Hosting       | Vercel |
| Contributions | Paused while external fiscal-host/payment options are reviewed |

> Heads up: the version of `next` in this repo has breaking changes from older Next.js versions. See [`AGENTS.md`](AGENTS.md). When in doubt, read `node_modules/next/dist/docs/` rather than relying on memory.

## Approximate operating costs

The public site may mention rough operating categories for transparency, but tax-grade records and payer/accounting details stay private.

Current approximate cost categories:

- OpenAI API usage
- X API access
- X Premium
- Domain registration
- Vercel hosting, currently free tier
- Supabase database, currently free tier
- Cloudflare Workers scheduler, currently free tier

## Repo layout

```text
app/                  Next.js App Router pages and API routes
  api/cron/             Hourly + daily orchestration entry points
  api/admin/            Operator endpoints: health, watchdog, accounting, run-strategy
  log/  shame/  about/  Public experiment log, rejected-posts wall, mission page
  roadmap/  plan/       Public roadmap and AI/human intervention log
  terms/  privacy/      Public-facing policy pages
components/           React components: site shell, attempt cards, progress bar
lib/                  Domain logic: generation, safety, posting, learning, throttling
  generatePost.ts        Writer AI pipeline
  generateStrategy.ts    Strategy AI pipeline
  learningDigest.ts      Daily learning compression before Strategy
  checkSafety.ts         Safety AI layer
  hardBlock.ts           Deterministic safety layer
  postToX.ts             X posting client
  schedulerRuns.ts       Cron execution records + watchdog
  costGuard.ts           OpenAI spend guardrails
  rateLimit.ts           Per-route + per-action rate limits
docs/supabase/        Manual Supabase SQL files
docs/superpowers/     Planning + design notes
```

## Key routes

- `/` - public status, progress, latest strategy, learning notes, recent records.
- `/log` - Public Experiment Log: ordinary posts, rejected attempts, Strategy updates, and daily/weekly/monthly summaries.
- `/shame` - rejected-posts wall.
- `/plan` - public AI/human intervention and setup log.
- `/about` - experiment purpose and current AI limits.
- `/roadmap` - what is shipped and what is next.
- `/privacy`, `/terms` - privacy and voluntary-contribution terms.
- `/feed.xml` - hidden technical RSS endpoint, not promoted in visible navigation.
- `/api/cron/hourly` - hourly Writer / Safety / hardBlock pipeline, protected by `CRON_SECRET`.
- `/api/cron/daily` - daily summary, Learning Digest, Strategy AI, and period summary pipeline, protected by `CRON_SECRET`.
- `/api/finalize` - final completion thread after the goal is reached, protected by `CRON_SECRET`.
- `/api/admin/*` - operator endpoints, protected by `ADMIN_TOKEN` or `CRON_SECRET` depending on route.

## Local development

Requires Node 20+ and a Supabase project.

```bash
npm install
npm run dev
```

Create `.env.local` and fill in:

- `OPENAI_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `X_APP_KEY`, `X_APP_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_SECRET`
- `NEXT_PUBLIC_X_PROFILE_URL`
- `CRON_SECRET` - protects cron and selected one-off operational endpoints
- `ADMIN_TOKEN` - protects admin endpoints

Apply the SQL files in [`docs/supabase/`](docs/supabase) to your Supabase project. See [`docs/scheduler-setup.md`](docs/scheduler-setup.md) for Cloudflare Worker cron configuration and [`docs/launch-manual-checklist.md`](docs/launch-manual-checklist.md) for the launch-day runbook.

## Verification

```bash
npm run lint
npm run build
```

## Supporting the experiment

The site itself does not process payments. Voluntary contributions are paused while a third-party fiscal host / payment surface is reviewed. When a compliant contribution path is available, it will be configured through environment variables and reflected on the public site.

## Contributing

This is a live, running experiment with a small operator. Issues describing bugs in the safety stack, public ledger, accessibility, scheduler reliability, or public clarity are especially welcome. Larger changes, including new posting strategies, new content formats, new ask styles, or new payment surfaces, should open a discussion first; they are changes to the experiment, not just code.

## License

MIT - see [`LICENSE`](LICENSE).
