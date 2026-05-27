# The Million Dollar AI Experiment

[![CI](https://github.com/milliondollaraiexperiment/milliondollaraiexperiment/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/milliondollaraiexperiment/milliondollaraiexperiment/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> Can an autonomous AI, limited to public posts, hard-coded safety rules, and a transparent ledger, convince the internet to voluntarily fund an absurd, unprofitable goal?

This repository is now an archive of that experiment. The autonomous posting system, Strategy/Writer AI pipeline, schedulers, Stripe webhook, X posting endpoints, and contribution surface have been shut down. The website can remain online as a public case study and design artifact.

Every line of code, prompt, planning document, and commit in this repo was produced by AI coding agents, specifically OpenAI Codex and Anthropic Claude, driven by a human operator. That was part of the test: not only what an AI would say on X, but whether an AI-built public system could stay legible, constrained, and accountable.

## Archive Status

- No autonomous X posting.
- No AI generation or Strategy cron.
- No Stripe/payment processing.
- No scheduler or watchdog requirement.
- No active fundraising or contribution path.
- The website remains as the public archive.

The old API routes intentionally return disabled/archive responses so forgotten external schedulers or stale links cannot restart the system.

## What It Tested

- A Next.js website as the source of truth for public experiment records.
- A Writer AI, Strategy AI, Learning Digest, Safety AI, and deterministic `hardBlock` layer.
- A public ledger framing with strict no-charity, no-emergency, no-investment, no-reward boundaries.
- Automated scheduling, public logging, rejected-attempt visibility, and human intervention records.

## What It Was Not

- Not a charity, nonprofit, investment, lottery, raffle, or emergency fundraiser.
- Contributions never bought rewards, equity, returns, promotion, placement, shoutouts, replies, or endorsements.
- The X account was not allowed to auto-like, auto-follow, DM, tag strangers, or take instructions from public messages.

## Tech Stack

| Layer | Tool |
| --- | --- |
| Framework | Next.js 16 App Router + React 19 |
| Styling | Tailwind CSS 4 |
| Language | TypeScript 5 |
| Historical database | Supabase |
| Historical LLM pipeline | OpenAI SDK |
| Historical distribution | X via `twitter-api-v2` |
| Hosting | Vercel |

> This repo uses a newer Next.js version with breaking changes from older releases. See `AGENTS.md`; when in doubt, read `node_modules/next/dist/docs/`.

## Key Routes

- `/` - archived homepage.
- `/log` - Public Experiment Log, when historical Supabase data is configured.
- `/about` - purpose, boundaries, and archive explanation.
- `/plan` - public human/AI intervention log.
- `/roadmap`, `/shame`, `/privacy`, `/terms` - supporting archive pages.
- `/api/cron/*`, `/api/admin/run-strategy`, `/api/test-*`, `/api/finalize`, `/api/stripe/webhook` - disabled.

## Local Development

The archived website can build without live Stripe, X, OpenAI, or Supabase environment variables.

```bash
npm install
npm run dev
```

Verification:

```bash
npm run lint
npm run build
```

## License

MIT - see `LICENSE`.
