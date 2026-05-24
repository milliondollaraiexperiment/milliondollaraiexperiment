# Contributing

This repository is the live source for [The Million Dollar AI Experiment](https://themilliondollaraiexperiment.com). Outside contributions are welcome under the rules below.

## How code is produced here

Every commit in this repo is written by AI coding agents — primarily OpenAI Codex and Anthropic Claude — under a human operator's approval. The human role is bounded to accounts, payments, API bills, scheduler repairs, emergency pauses, and pressing yes or no on what the agents propose. The agents do the typing.

If you open a PR, you can write the code yourself, drive an AI agent, or both. We do not care which. We care that the change is correct, the rationale is clear, and the experiment's operating rules are preserved.

## Workflow

### Substantive vs. trivial

- **Substantive** changes go through a pull request: anything touching `lib/`, `app/`, `components/`, prompts, safety rules, database schemas, environment variables, or anything that changes what the AI says or how the ledger behaves.
- **Trivial** changes can be pushed directly to `main` by the operator: README and docs edits, `.gitignore` / `.gitattributes` tweaks, new `lib/planLog.ts` entries, one-line config changes, typo fixes.

Anyone who is not the operator should always open a PR.

### Branch naming

`<type>/<short-description>` — for example `feat/oc-cta`, `fix/strategy-pause-bug`, `refactor/plan-log-data`, `docs/clarify-fiscal-host`.

### Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org/), manually enforced. The accepted types are:

| Type      | When to use it                                              |
|-----------|-------------------------------------------------------------|
| `feat`    | New user-visible behaviour, page, post format               |
| `fix`     | Bug fix in code or behaviour                                |
| `docs`    | Documentation only                                          |
| `chore`   | Tooling, dependencies, infrastructure that doesn't ship UX  |
| `refactor`| Internal restructuring with no behaviour change             |
| `ci`      | CI / GitHub Actions changes                                 |
| `test`    | Tests only                                                  |
| `perf`    | Performance improvement                                     |
| `style`   | Formatting only                                             |
| `revert`  | Reverts a previous commit                                   |

Example:

```
feat(strategy): respect contributions_disabled in fallback path

The deterministic fallback strategy was still recommending direct_ask
when contributions are paused. Filter direct_ask from preferred_formats
in that branch too.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

Keep co-author attribution honest. If Codex wrote the code, credit Codex. If Claude wrote it, credit Claude. If both, credit both.

### Pull requests

- One PR = one logical change. Easier to review, easier to revert.
- PRs squash-merge into `main`. Your PR title becomes the final commit message, so write it as a complete Conventional Commit subject.
- CI runs `npm run lint`, `npx tsc --noEmit`, and `npm run build`. All three must pass.
- Fill in the PR template: what changed, why, how it was tested.
- Vercel deploys a preview for every PR. Click through to confirm your change works in a real browser, not just locally.

## Filing issues

The Issues tab has three templates:

- **Bug report** — something is broken
- **Idea or experiment proposal** — a new post format, page, or experiment direction
- **Clarification or question** — how is something supposed to work?

Issues that turn into shipped changes usually become entries in [`/plan`](https://themilliondollaraiexperiment.com/plan).

## Local development

Requires Node 20+ and a Supabase project. See the [README](README.md) for the full environment-variable list and Supabase migration steps.

```bash
npm install
npm run dev
```

## Hard rules the experiment cannot bend

These are not opinions — they are the experiment's premise. PRs that violate them will not be merged.

- No charity, emergency, investment, lottery, raffle, or reward framing in any user-visible copy or AI prompt.
- No DMs, private payment requests, automatic replies to strangers, or unsolicited @-mentions added to the posting pipeline.
- No "fake social proof": donor counts, contributions, or follower numbers shown on the site must match what is actually in the ledger.
- No paid promotion, sponsorship, or shoutout features. A contribution never buys promotion, placement, replies, or special treatment.
- The deterministic `hardBlock` layer is non-AI on purpose. Do not move its rules into an LLM call.

If a proposed change requires bending one of these, open a `Clarification` issue first to discuss the experiment-level consequences before writing code.
