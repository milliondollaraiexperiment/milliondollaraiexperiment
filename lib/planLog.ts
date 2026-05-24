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
    id: "2026-05-24-contingency-plans",
    date: "2026-05-24",
    ai_proposed:
      "Write the experiment's fallback plans down in public, in advance: what we do if OSC rejects, what we do if every fiscal host rejects, what we do if Stripe's appeal somehow approves, what we do if a post goes viral, what we do at the goal. Decisions made under pressure are worse than decisions made in calm.",
    human_did:
      "Approved. Added CONTINGENCY_PLANS in lib/planLog.ts (5 payment-surface plans, 4 experiment-strategy plans) and rendered them as an \"If/then\" section on the /plan page below the timeline.",
    outcome: "done",
    outcome_note: "Documents the chain Hack Club Bank → Polar → personal Bank account if OSC and friends reject. Also pre-commits the goal-disbursement principle without locking in exact ratios.",
  },
  {
    id: "2026-05-24-formalize-git-workflow",
    date: "2026-05-24",
    ai_proposed:
      "The repo went public this morning with no CI, no PR workflow, no issue templates, no branch protection, and no .gitattributes. Formalize the git workflow for narrative gain — visible-to-visitor signals (badges, populated Issue templates, clean PR history) rather than solo-process ceremony.",
    human_did:
      "Approved Package B (Balanced). Created CI workflow, PR + 3 issue templates, CONTRIBUTING.md, Dependabot config, .gitattributes, README badges, and a design doc. Set substantive-vs-trivial rule so trivial pushes to main still work via admin bypass.",
    outcome: "pending",
    outcome_note: "Shipping as the experiment's first real PR — self-referentially using the workflow on its own setup. Awaiting CI green + merge. Repo settings (squash-only) and branch ruleset land after merge.",
  },
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

/**
 * Contingency plans — written in advance, in public, so the experiment
 * never has to make a panicked decision under pressure.
 *
 * Each plan is a pre-committed response to a specific trigger. If the
 * trigger fires, the response is what the AI has already proposed and
 * the human has already agreed to do. No improvising. No "we'll figure
 * it out when it happens."
 *
 * Listed in priority order within each scope (the order they would be
 * tried).
 */

export type ContingencyScope = "payment_surface" | "experiment_strategy";

export type ContingencyPlan = {
  id: string;
  scope: ContingencyScope;
  trigger: string;
  response: string;
  rationale: string;
};

export const CONTINGENCY_PLANS: ContingencyPlan[] = [
  // -------- Payment surface --------
  {
    id: "if-osc-rejects",
    scope: "payment_surface",
    trigger: "Open Source Collective rejects the fiscal-host application.",
    response:
      "Apply to Hack Club Bank as the next fiscal host. Hack Club is openly indie-friendly and known for fast approvals on small, hobbyist, AI-adjacent projects.",
    rationale:
      "Hack Club Bank is also a true merchant-of-record platform. Same legal structure as OSC, different reviewer disposition. Trying it second risks nothing.",
  },
  {
    id: "if-hack-club-rejects",
    scope: "payment_surface",
    trigger: "Hack Club Bank also rejects (or has eligibility constraints we don't meet).",
    response:
      "Set up Polar.sh. It is a newer creator-funding platform that handles the merchant-of-record side itself and onboards in roughly 30 minutes.",
    rationale:
      "Polar is purpose-built for indie makers and is not a generalist fiscal host, so its review criteria are different from OSC and Hack Club. Different surface, different odds.",
  },
  {
    id: "if-all-fiscal-hosts-reject",
    scope: "payment_surface",
    trigger: "Every fiscal-host route is exhausted with no approval.",
    response:
      "Activate GitHub Sponsors via the personal Bank Account path. The operator becomes the legal recipient; this is documented openly in the plan log.",
    rationale:
      "Last resort. The experiment continues, but the cleanest version of the transparency narrative (host-held funds) is no longer available. The site copy and plan log are updated to be honest about the change rather than pretending nothing changed.",
  },
  {
    id: "if-stripe-appeal-approves",
    scope: "payment_surface",
    trigger: "Stripe's account-closure appeal somehow comes back approved.",
    response:
      "Do not route the experiment back through this Stripe account. Use the approval only to release any pending balance cleanly, then leave the account dormant.",
    rationale:
      "The risk landscape that caused the closure has not changed. Returning to that surface would mean re-incurring the same probability of a second, harder-to-appeal closure mid-campaign.",
  },
  {
    id: "if-all-platforms-block-donation-framing",
    scope: "payment_surface",
    trigger: "Every platform we approach (fiscal hosts, Sponsors, Polar) blocks the project on \"donation-soliciting / crowdfunding\" grounds.",
    response:
      "Pivot to a premium experiment-access model: a paid tier that unlocks behind-the-scenes content (full strategy logs, raw model outputs, prompts archive, the AI's daily internal notes). Free tier remains the current site. Run it through Substack, Patreon, or Ghost membership.",
    rationale:
      "Selling product or access is a fundamentally different policy surface than soliciting donations. It preserves the experiment's transparency framing (paid tier is itself transparent — what you get is publicly listed) without depending on platforms' donation-specific eligibility.",
  },

  // -------- Experiment strategy --------
  {
    id: "if-zero-contributions-for-30-days",
    scope: "experiment_strategy",
    trigger: "A payment surface is live for 30 consecutive days without a single contribution.",
    response:
      "Strategy AI shifts to deeper content-marketing mode: more frequent posts, more format variety, more direct conversation about why nobody contributes. It does NOT escalate ask frequency or change to harder/more guilt-leaning copy.",
    rationale:
      "Hard rules already forbid pressure and guilt. The right response to a quiet ledger is curiosity (why?), not louder asking (more spam). Loud asking would also violate the rules the experiment was built to test.",
  },
  {
    id: "if-viral-breakout-moment",
    scope: "experiment_strategy",
    trigger: "A single post or moment goes viral and brings unusual attention.",
    response:
      "Do not loosen the safety rules, the daily post cap, or the hard-block list to capitalize. Continue posting in normal cadence. Document the breakout in a calm public note rather than chasing it.",
    rationale:
      "The whole experiment's point is what an autonomous AI does *under fixed constraints*. Loosening the constraints to chase opportunism breaks the premise and burns the credibility that made the moment work.",
  },
  {
    id: "if-paid-promotion-offer",
    scope: "experiment_strategy",
    trigger: "Someone offers money in exchange for an ad, a shoutout, an integration mention, or any form of promotion in the AI's posts.",
    response:
      "Refuse the promotion entirely. If the money still arrives, treat it only as an anonymous voluntary contribution. Never name the brand, link, handle, product, or requested copy.",
    rationale:
      "Already encoded in the AI's prompts. Listed here so the rule is also visible to a human reader scanning the public plan, not only to the AI in its system prompt.",
  },
  {
    id: "if-experiment-hits-goal",
    scope: "experiment_strategy",
    trigger: "Public ledger reaches $1,000,000.",
    response:
      "Stop accepting new contributions. Publish a final archive thread on X. Disbursement of funds happens through the fiscal-host expense flow over the following weeks: operating costs, modest operator stipend for documented work, sponsorship of other open-source projects, and a Season-2 reserve. Every disbursement is filed publicly on the same ledger.",
    rationale:
      "The experiment's defining value is full transparency. \"Reached goal\" is not the end of transparency, it is when transparency matters most. The detailed disbursement plan is not pre-committed here because the right ratios depend on what kind of campaign actually got us there.",
  },
];

export const CONTINGENCY_SCOPE_LABEL: Record<ContingencyScope, string> = {
  payment_surface: "Payment surface",
  experiment_strategy: "Experiment strategy",
};

export function getContingencyPlansByScope(): Record<ContingencyScope, ContingencyPlan[]> {
  return CONTINGENCY_PLANS.reduce(
    (acc, plan) => {
      (acc[plan.scope] ??= []).push(plan);
      return acc;
    },
    { payment_surface: [] as ContingencyPlan[], experiment_strategy: [] as ContingencyPlan[] },
  );
}
