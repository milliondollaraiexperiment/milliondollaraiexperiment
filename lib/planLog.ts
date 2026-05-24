/**
 * The AI-asks-human plan log.
 *
 * Each entry is one cycle of: AI proposed something → human executed →
 * outcome. The log is the visible evidence behind the experiment's
 * "AI proposes, human executes" claim. Without it, that claim is just an
 * assertion. With it, every infrastructure decision and every blocked
 * payment path is on the public record.
 *
 * To add a new entry: prepend to PLAN_LOG, commit with a one-line
 * summary in present tense ("Add OSC fiscal host application entry").
 * Older entries are immutable history — do not edit past outcomes
 * retroactively; supersede them with a new entry instead.
 */

export type PlanOutcome = "done" | "blocked" | "pending" | "superseded";

export type PlanEntry = {
  id: string;
  date: string; // ISO date, YYYY-MM-DD
  ai_proposed: string;
  human_did: string;
  outcome: PlanOutcome;
  outcome_note?: string;
  next?: string;
};

export const PLAN_LOG: PlanEntry[] = [
  {
    id: "2026-05-24-pause-asking",
    date: "2026-05-24",
    ai_proposed:
      "Until a working payment surface exists, do not ask for money in any post. Add a contributions_disabled flag so Strategy AI stops recommending direct_ask and Writer AI stops including donation links.",
    human_did:
      "Merged the contributions_disabled flag across Strategy, Writer, and Context layers. Pushed to production. Regenerated today's strategy.",
    outcome: "pending",
    outcome_note: "Awaiting next hourly cron tick to confirm the AI is now posting awareness content, not asks.",
  },
  {
    id: "2026-05-24-fiscal-host-application",
    date: "2026-05-24",
    ai_proposed:
      "Apply to Open Collective under the Open Source Collective fiscal host, plus GitHub Sponsors. Both are true merchant-of-record platforms, so neither requires the operator's own (now-banned) Stripe account.",
    human_did:
      "Made GitHub repo public. Added MIT LICENSE and a real README. Submitted Open Collective application to Open Source Collective. Filled the OC profile (avatar, cover, About text). Created the GitHub Sponsors profile, held submission to choose Fiscal Host once OC is approved.",
    outcome: "pending",
    outcome_note: "Open Source Collective review typically takes 2–5 business days. Reviewer may open a GitHub issue with questions.",
    next: "While waiting, run the experiment in awareness-only mode (no asks). When OC is approved, return to GitHub Sponsors and pick Fiscal Host to route both income streams through one public ledger.",
  },
  {
    id: "2026-05-24-rule-out-stripe-adjacent",
    date: "2026-05-24",
    ai_proposed:
      "Before picking a replacement payment platform, investigate which platforms are actually merchant-of-record (platform holds the Stripe relationship) versus which require the user to connect their own Stripe.",
    human_did:
      "Investigated Ko-fi and Buy Me a Coffee. Both turned out to require connecting the user's own Stripe or PayPal — same risk surface as the just-banned account. Ruled them out.",
    outcome: "superseded",
    outcome_note: "Surface narrowed to true MoR platforms only: Open Collective (via fiscal host) and GitHub Sponsors (via GitHub's own Stripe Connect). Superseded by the OC + GH Sponsors application entry above.",
  },
  {
    id: "2026-05-24-stripe-appeal",
    date: "2026-05-24",
    ai_proposed:
      "Submit a Stripe appeal under \"All products and services that violate the Restricted Businesses list have been removed.\" Do not depend on the outcome; treat Stripe as a dead path regardless.",
    human_did:
      "Submitted the appeal. Status: in review, 1–2 business day SLA.",
    outcome: "pending",
    outcome_note: "Even if approved, do not route the experiment back through this Stripe account. The appeal is for clean closure / pending balance release, not reinstatement of the payment path.",
  },
  {
    id: "2026-05-23-stripe-payment-link",
    date: "2026-05-23",
    ai_proposed:
      "Use a Stripe Payment Link plus webhook for voluntary contributions. Stripe is the standard, ships in an afternoon, and the webhook gives a clean record for the public ledger.",
    human_did:
      "Created a Stripe account, generated the payment link, wired up /api/stripe/webhook, launched the experiment.",
    outcome: "blocked",
    outcome_note:
      "Roughly twelve hours after launch, Stripe closed the account for violating their Restricted Businesses list (\"crowdfunding, fundraising, and other donation-soliciting activities\"). Payments will be paused on 2026-06-23 if unresolved.",
    next: "Replace Stripe with a third-party merchant-of-record platform so the experiment is never the merchant of record itself.",
  },
];

/** Most recent first (already the order entries are written in). */
export function getPlanEntries(): PlanEntry[] {
  return PLAN_LOG;
}

export function getRecentPlanEntries(limit: number): PlanEntry[] {
  return PLAN_LOG.slice(0, limit);
}

export const OUTCOME_LABEL: Record<PlanOutcome, string> = {
  done: "done",
  blocked: "blocked",
  pending: "pending",
  superseded: "superseded",
};
