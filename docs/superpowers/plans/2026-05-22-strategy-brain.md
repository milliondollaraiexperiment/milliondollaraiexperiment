# Strategy Brain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a safe daily Strategy AI layer that summarizes recent failures and feeds bounded guidance back into the Writer.

**Architecture:** Strategy AI reads recent attempts and produces a structured strategy record saved in Supabase. `getContext()` reads the latest strategy and passes it to `generatePost()`, which uses strategy guidance to pick or force a format and avoid rejected angles. Strategy AI never posts to X and cannot bypass Safety AI or hardBlock.

**Tech Stack:** Next.js App Router, TypeScript, Supabase, OpenAI structured outputs.

---

### Task 1: Strategy Data Model

**Files:**
- Create: `docs/supabase/strategies.sql`
- Modify: `lib/types.ts`

- [x] **Step 1: Add strategies table SQL**

Create a SQL note with a `strategies` table containing summary, preferred formats, forced format, banned angles, rewrite guidance, top reject reasons, and raw metrics.

- [x] **Step 2: Add Strategy types**

Add `StrategyRecord` and include `strategy` on `Context`.

### Task 2: Strategy Generation

**Files:**
- Create: `lib/generateStrategy.ts`
- Create: `lib/getLatestStrategy.ts`

- [x] **Step 1: Build Strategy AI structured output**

Read recent attempts, aggregate reject reasons and format stats, ask OpenAI for structured strategy JSON, sanitize formats, and insert it into `strategies`.

- [x] **Step 2: Read latest strategy**

Load the newest row from `strategies`, fail open to `null` when the table is missing or empty.

### Task 3: Writer Feedback Loop

**Files:**
- Modify: `lib/getContext.ts`
- Modify: `lib/generatePost.ts`

- [x] **Step 1: Add latest strategy to context**

`getContext()` loads latest strategy alongside existing settings, attempts, and donations.

- [x] **Step 2: Use strategy in forcedFormat selection**

Writer honors a valid `forced_format`, prefers valid `preferred_formats`, and includes banned angles, rewrite guidance, and reject reasons in the user message.

### Task 4: Daily Cron Integration

**Files:**
- Modify: `app/api/cron/daily/route.ts`
- Modify: `app/page.tsx`
- Modify: `lib/hardBlock.ts`

- [x] **Step 1: Generate strategy before report thread**

Daily cron attempts to generate and save strategy first. It should not fail the whole daily report if strategy generation fails.

- [x] **Step 2: Relax similarity threshold**

Change hardBlock similarity threshold from `0.9` to `0.94` so only near-duplicates are blocked.

- [x] **Step 3: Show latest strategy publicly**

Homepage displays the latest strategy summary, reject signals, writer bias, and banned angles so the experiment's learning loop is visible.

### Task 5: Verification

**Files:**
- No source edits expected.

- [ ] **Step 1: Run lint**

Run `npm run lint`. Expected: exit 0.

- [ ] **Step 2: Run build**

Run `npm run build`. Expected: exit 0.
