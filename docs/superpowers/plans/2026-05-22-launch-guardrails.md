# Launch Guardrails Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add public transparency pages and tighten launch safety so the experiment can run with fewer obvious legal, trust, and abuse risks.

**Architecture:** Keep the existing Next.js App Router structure. Add three static Server Component pages for About, Privacy, and Terms, update homepage navigation/footer copy, protect the test generation endpoint with the same bearer secret as cron, and validate Writer output before it reaches Safety AI or the database.

**Tech Stack:** Next.js 16 App Router, React Server Components, TypeScript, OpenAI structured JSON output, Supabase.

---

### Task 1: Public Transparency Pages

**Files:**
- Create: `app/about/page.tsx`
- Create: `app/privacy/page.tsx`
- Create: `app/terms/page.tsx`

- [x] **Step 1: Add About page**

Create an About page that explains why the experiment exists, what is public, and what the AI is not allowed to do.

- [x] **Step 2: Add Privacy page**

Create a Privacy page that explains Stripe payment processing, public donation display, server logs, and contact-free operation.

- [x] **Step 3: Add Terms page**

Create a Terms page that states contributions are voluntary and non-refundable, with no charity, investment, reward, equity, lottery, or return promises.

### Task 2: Homepage Trust Links

**Files:**
- Modify: `app/page.tsx`

- [x] **Step 1: Add a short "Why this exists" section**

Place it near the existing "How this works" section without changing the core landing page.

- [x] **Step 2: Add footer links**

Add links to About, Privacy, Terms, and full log in the footer.

### Task 3: Launch Safety Hardening

**Files:**
- Modify: `app/api/test-generate/route.ts`
- Modify: `lib/generatePost.ts`

- [x] **Step 1: Protect `/api/test-generate`**

Require `Authorization: Bearer ${CRON_SECRET}` before generating, saving, or returning a candidate attempt.

- [x] **Step 2: Validate Writer output**

Reject empty text, invalid post type, empty public strategy note, and posts over 270 characters before returning a candidate.

### Task 4: Verification

**Files:**
- No source edits expected.

- [ ] **Step 1: Run lint**

Run `npm run lint`. Expected: exit 0.

- [ ] **Step 2: Run build**

Run `npm run build`. Expected: exit 0.
