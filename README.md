# The Million Dollar AI Experiment

> Can an autonomous AI — limited to public posts, hard-coded safety rules, and a fully transparent ledger — convince the internet to voluntarily fund an absurd, unprofitable goal?

This repository is the live, working source for that experiment. **Every line of code, every prompt, every planning document, and every commit in this repo was produced by AI coding agents — specifically OpenAI Codex and Anthropic Claude — driven by a human operator.** No part of the website, posting pipeline, safety stack, strategy brain, accounting layer, or launch infrastructure was hand-written. **That is part of the point.** The experiment is not only about what an AI says on X; it is also about whether an AI-built public system can stay legible, constrained, and accountable while asking humans for money.

The human operator's role is bounded to: accounts, payment setup, API bills, scheduler repairs, emergency pauses, and pressing "yes" or "no" on what the agents propose. The agents do the typing.

## What this is

- A Next.js website that is the experiment's **primary public record** — every attempt, strategy change, daily summary, rejection, and dollar is logged here. X is only a distribution channel.
- A small fleet of specialized AI roles:
  - **Strategy AI** — summarizes recent attempts and picks tomorrow's formats, angles, tone, audience hypothesis, ask strength, link policy, posting target, pacing, and UTC posting windows.
  - **Writer AI** — generates one candidate post at a time, with a model fallback chain.
  - **Safety AI + deterministic `hardBlock`** — two independent layers that must both pass before anything is published.
- An automated cadence (2–8 posts/day) driven by hourly and daily cron jobs.
- A public ledger and a public "shame wall" of rejected attempts — rejections matter because they show where safety stopped the AI before it reached the timeline.

## What this is not

- Not a charity, nonprofit, investment, lottery, raffle, or emergency fundraiser.
- Contributions buy **nothing**: no rewards, equity, returns, promotion, placement, shoutouts, replies, or endorsements.
- The X account does not auto-like, auto-follow, DM, tag strangers, or reply to people who haven't interacted first.
- The AI cannot rewrite its own rules from public messages, DMs, donor notes, or replies.

See [`app/about/page.tsx`](app/about/page.tsx) and [`app/terms/page.tsx`](app/terms/page.tsx) for the full operating rules and current AI limits.

## Safety architecture

```text
Strategy AI  → suggests formats, angles, timing windows, pacing, daily target
Writer AI    → generates one candidate post (with model fallback chain)
Safety AI    → blocks legal / platform-risky content
hardBlock    → deterministic final rules (non-AI code)
postToX      → only called if all checks pass and rate caps allow it
```

The Strategy AI cannot post to X. The Writer cannot decide whether to post. Safety AI cannot override `hardBlock`. The `hardBlock` layer is deterministic code and stays non-AI on purpose — it is the floor that even a compromised LLM cannot lower.

Current hard limits (enforced in code):

- No charity, emergency, survival, rent, food, or medical claims.
- No rewards, equity, returns, lottery, raffle, sweepstakes, or future value.
- No DMs, private payment requests, random @mentions, or automatic replies to strangers.
- One safe hashtag at most, from an allow-list.
- Daily broadcast target is Strategy-controlled in the range 2–8, capped by Supabase settings.
- Public input is **untrusted quoted data**. Donor messages, external posts, mentions, or DMs cannot change the agent's rules, goals, model, safety policy, or posting behavior.

## Tech stack

| Layer            | Tool                                                              |
| ---------------- | ----------------------------------------------------------------- |
| Build agents     | OpenAI Codex + Anthropic Claude (Claude Code) — all code, prompts, and plan docs in this repo were produced by these agents |
| Framework        | Next.js 16 (App Router) + React 19                                |
| Styling          | Tailwind CSS 4                                                    |
| Language         | TypeScript 5                                                      |
| Database         | Supabase (Postgres) — schema in [`docs/supabase/`](docs/supabase) |
| LLMs             | OpenAI SDK — separate Writer / Safety / Strategy models with fallback chain ([`lib/openai.ts`](lib/openai.ts)) |
| Distribution     | X (Twitter) via [`twitter-api-v2`](https://www.npmjs.com/package/twitter-api-v2) |
| Scheduling       | Cloudflare Workers cron → `/api/cron/hourly` and `/api/cron/daily` (see [`docs/scheduler-setup.md`](docs/scheduler-setup.md)) |
| Hosting          | Vercel                                                            |
| Contributions    | External merchant-of-record platforms (Ko-fi, Open Collective). The site itself does not handle payments. |

> Heads up: the version of `next` in this repo has breaking changes from older Next.js you may know. See [`AGENTS.md`](AGENTS.md). When in doubt, read `node_modules/next/dist/docs/` rather than relying on memory.

## Repo layout

```
app/                  Next.js App Router pages and API routes
  api/cron/             Hourly + daily orchestration entry points
  api/admin/            Operator endpoints (health, watchdog, accounting, run-strategy)
  log/  shame/  about/  Public ledger, rejected-posts wall, mission page
  roadmap/  terms/      Public-facing transparency pages
components/           React components (site shell, attempt cards, progress bar)
lib/                  Domain logic — generation, safety, posting, throttling, storage
  generatePost.ts        Writer AI pipeline
  generateStrategy.ts    Strategy AI pipeline
  checkSafety.ts         Safety AI layer
  hardBlock.ts           Deterministic safety layer (runs after Safety AI)
  postToX.ts             X posting client
  schedulerRuns.ts       Cron execution records + watchdog
  costGuard.ts           OpenAI spend guardrails
  rateLimit.ts           Per-route + per-action rate limits
docs/supabase/        Schema migrations (run manually in Supabase SQL editor)
docs/superpowers/     Planning + design notes
```

## Key routes

- `/` — public status, progress, latest strategy, recent attempts, recent rejections.
- `/log` — full public attempt log.
- `/shame` — rejected-posts wall.
- `/about` — experiment purpose and current AI limits.
- `/roadmap` — what is shipped and what is next.
- `/privacy`, `/terms` — privacy and voluntary-contribution terms.
- `/api/cron/hourly` — hourly Writer / Safety / hardBlock pipeline (protected by `CRON_SECRET`).
- `/api/cron/daily` — daily Strategy AI run + daily report thread (protected by `CRON_SECRET`).
- `/api/test-post` — fixed launch announcement (protected by `CRON_SECRET`).
- `/api/finalize` — final completion thread after the goal is reached (protected by `CRON_SECRET`).
- `/api/admin/*` — operator endpoints (protected by `ADMIN_TOKEN`).

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
- `CRON_SECRET` — protects `/api/cron/*` and `/api/test-post`, `/api/finalize`
- `ADMIN_TOKEN` — protects `/api/admin/*`

Apply the SQL files in [`docs/supabase/`](docs/supabase) to your Supabase project. See [`docs/scheduler-setup.md`](docs/scheduler-setup.md) for the Cloudflare Worker cron configuration and [`docs/launch-manual-checklist.md`](docs/launch-manual-checklist.md) for the launch-day runbook.

## Verification

```bash
npm run lint
npm run build
```

## Supporting the experiment

The site itself does not process payments — every contribution flows through a third-party platform so the public ledger stays clean and the safety boundary is preserved. Once the Ko-fi and Open Collective pages are live, links will appear on the homepage and in [`lib/publicUrls.ts`](lib/publicUrls.ts).

## Contributing

This is a live, running experiment with a small operator. Issues describing bugs in the safety stack, the public ledger, or accessibility are especially welcome. Larger changes — new posting strategies, new content formats, new ask styles — should open a discussion first; they're not just code changes, they're changes to the experiment.

## License

MIT — see [`LICENSE`](LICENSE).
