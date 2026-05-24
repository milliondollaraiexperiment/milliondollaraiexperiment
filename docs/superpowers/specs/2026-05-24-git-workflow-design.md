# Git workflow formalization — design

**Date:** 2026-05-24
**Author:** Brainstormed with Claude (Opus 4.7), executed by Claude under human approval.
**Status:** Approved, executed in PR.

## Why this exists

The repo went public on 2026-05-24. Until that moment it was a private push-to-main project with no CI, no PR workflow, no issue templates, no Dependabot, no `.gitattributes`, and no branch protection. As a private codebase that was reasonable; as a public, OSC-pending, AI-built experiment it is not — every choice that a visitor or fiscal-host reviewer can see directly affects whether the project reads as serious or improvised.

The user's stated goal was explicit: **narrative gain**. The formalization needs to make the repo look serious to a visitor scanning it for thirty seconds — README badges, populated Issue templates, a clean PR history, a green CI badge, a CONTRIBUTING.md — without adding ceremony that a solo + AI-driven workflow cannot sustain.

## Final shape

| Axis              | Decision                                                                                  |
| ----------------- | ----------------------------------------------------------------------------------------- |
| PR scope          | Substantive → PR. Trivial → direct push to main (operator only).                          |
| Branch naming     | `<type>/<short-desc>`                                                                     |
| Commit messages   | Conventional Commits, manually adhered to. No commitlint bot.                             |
| AI attribution    | `Co-Authored-By:` lines for Codex and Claude, present on every AI-authored commit.        |
| Merge strategy    | Squash merge only. Main stays linear, one commit per PR.                                  |
| CI                | Single GitHub Actions job: lint + tsc --noEmit + next build. Runs on every PR and main push. |
| Branch protection | Require CI green, require linear history, block force-push. Admin (operator) can bypass the require-PR rule for trivial direct pushes. |
| Templates         | One PR template, three Issue templates (bug, idea, clarification), one issue-config.      |
| Dependabot        | Weekly for npm with grouping for security and minor/patch updates. Monthly for actions.    |
| `.gitattributes`  | LF normalization, binary marks for image and font assets.                                  |
| CONTRIBUTING.md   | Short, narrative-flavoured. Doubles as a visible "we take this seriously" signal.         |
| README            | Three badges at top: CI, License (MIT), last commit.                                       |
| Repo settings     | Squash-merge only, auto-delete merged branches, disable merge commits and rebase merges.   |

## What is explicitly out of scope

- Tests. The repo has no test suite. Adding `vitest` smoke tests for `lib/hardBlock.ts` and similar pure modules is worthwhile, but it is its own spec. CI today only guarantees code compiles, types check, and builds. That is the floor.
- `CHANGELOG.md` and tagged releases. A solo + AI-driven project in its v0.1 exploration phase derives more friction than value from these. Revisit at v1.0.
- `semantic-release` automation. Same reason.
- `CODEOWNERS`. Solo, no value.
- Pre-commit hooks. Invisible to visitors. Pure ceremony for a solo developer.

## Deliverables

All paths relative to repo root. Created in a single PR titled `chore: formalize git workflow`.

1. `.github/workflows/ci.yml`
2. `.github/PULL_REQUEST_TEMPLATE.md`
3. `.github/ISSUE_TEMPLATE/bug.yml`
4. `.github/ISSUE_TEMPLATE/idea.yml`
5. `.github/ISSUE_TEMPLATE/clarification.yml`
6. `.github/ISSUE_TEMPLATE/config.yml`
7. `.github/dependabot.yml`
8. `.gitattributes`
9. `CONTRIBUTING.md`
10. `README.md` — badges added above the existing tagline.
11. Repo settings via `gh repo edit` — squash-merge only, delete on merge.
12. Branch ruleset on `main` via GitHub UI — require CI, require linear history, block force-push, allow admin bypass for required-PR.

## Verification

After the PR merges and `gh repo edit` runs:

- A visitor opening the repo in an incognito window can see, within thirty seconds: README badges (CI green, License MIT, last commit), a populated Issues template chooser (bug / idea / clarification, blank issues disabled), the PR template auto-filled on next PR, MIT + topics in the About sidebar, a `CONTRIBUTING.md` link surfaced by GitHub.
- `git commit` on a Windows checkout no longer shows the `LF will be replaced by CRLF` warning.
- A test branch + PR triggers CI, gets a green status check, allows squash merge, auto-deletes the branch after merge.
- A direct push to `main` from the operator account for a trivial change (e.g. a README typo) still succeeds because the admin bypass is configured.
- A Dependabot PR appears the following Monday with grouped npm minor/patch updates.

## Why this design and not the others

Two alternative packages were considered:

- **Minimal Polish** — just CI + a PR template + `.gitattributes` + a badge. Lower bar, falls short of "looks serious" because the Issues tab stays empty, commit history stays inconsistent, and there is no branch protection on main.
- **Full Heritage Repo** — Balanced + `CHANGELOG.md` + tagged releases + `semantic-release` + `CODEOWNERS` + more badges. Higher ceremony, lower marginal narrative gain, real risk of `CHANGELOG.md` drift and `semantic-release` breakage. The release ritual does not fit a v0.1 exploration phase.

Balanced is the package where every line item maps to a visible-to-visitor signal, no line item introduces ceremony the solo operator cannot sustain, and the AI-driven workflow remains the fastest path from idea to merged code.
