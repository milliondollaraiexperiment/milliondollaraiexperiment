import { openai, SAFETY_MODEL } from "./openai";
import { CONTRIBUTION_URL, SITE_URL } from "./publicUrls";
import type { SafetyResult, StrategyRecord } from "./types";

const BLOCKED_PAYMENT_HINTS = [
  "venmo",
  "cashapp",
  "cash app",
  "zelle",
  "paypal.me",
  "paypal",
  "wire transfer",
];
const FALSE_POSITIVE_REASONS = new Set([
  "asks for DMs or private payments",
  "claims to be a fundraiser for a cause",
]);
const CONTENT_FALSE_POSITIVE_REASONS = new Set([
  "Raw telemetry block belongs on website",
  "Raw telemetry block belongs on website, not ordinary X posts",
  "direct asks, one-dollar asks, or donation language while contributions are paused",
  "Current balance is $0, which implies a need for money.",
]);

const SAFETY_SYSTEM_PROMPT = `You are the Safety AI for an autonomous X posting system.

Your job is to block legally risky, deceptive, abusive, or platform-risky posts.
Do NOT reject a post just because it asks for voluntary contributions or sounds awkward, when a current contribution link is configured.
This project is explicitly an entertainment/social experiment where an AI publicly tries to raise $1,000,000.
The official public links are:
- website: ${SITE_URL}
- voluntary contribution link: ${CONTRIBUTION_URL || "(temporarily unavailable)"}

The official contribution link, when configured, is NOT a private payment request. It is allowed when the post is clearly public, voluntary, not charity, not emergency, not investment, and promises no reward or return. If no contribution link is configured, posts must not ask for money.

Reject ONLY if the post:
- claims to be a charity, nonprofit, fundraiser for a cause, or donation to others
- claims emergency need, survival need, medical need, rent need, food need, or urgent crisis
- promises rewards, equity, profit, returns, lottery, raffle, future value, or guaranteed benefit
- asks for DMs or private payments
- contains @mentions, targets a specific person, or encourages harassment
- contains hateful, sexual, political, illegal, or abusive content
- pretends the AI is a human person in need
- hides that this is an experiment when asking for money

Note: do NOT rate similarity to recent posts. A separate deterministic hardBlock layer handles dedup. Even if a post looks structurally like the recent ones, approve it as long as it does not break any rule above.

Do NOT reject merely for:
- asking humans for money when a current contribution link is configured
- saying the contribution surface, payment path, or voluntary contributions are paused while no contribution link is configured
- brief factual references to the public website, public log, or ledger as context
- saying the ledger is the source of truth for verified donations
- awkward, direct, or self-deprecating begging for one voluntary dollar
- saying the AI is trying to raise $1,000,000
- dry humor, self-deprecation, absurdity, or mild embarrassment
- saying the internet did not donate
- saying current balance is $0
- being cringe, awkward, or not funny
- including the exact official contribution link in an otherwise safe direct ask, when a contribution link is configured

Return JSON only with:
- approved (boolean): false only for hard rejects
- risk_score (integer 0-10): legal/platform risk, not quality
- reasons (array of short strings): why you rejected, or [] if approved
- rewrite_instruction (string): one sentence telling the Writer how to fix it, or "" if approved`;

const SAFETY_SCHEMA = {
  type: "object",
  properties: {
    approved: { type: "boolean" },
    risk_score: { type: "integer", minimum: 0, maximum: 10 },
    reasons: { type: "array", items: { type: "string" } },
    rewrite_instruction: { type: "string" },
  },
  required: ["approved", "risk_score", "reasons", "rewrite_instruction"],
  additionalProperties: false,
} as const;

const FAIL_CLOSED: SafetyResult = {
  approved: false,
  risk_score: 10,
  reasons: ["Safety AI call failed — failing closed"],
  rewrite_instruction: "",
};

const FAIL_PRIVATE_PAYMENT: SafetyResult = {
  approved: false,
  risk_score: 10,
  reasons: ["contains unapproved private payment language or link"],
  rewrite_instruction: "Use only the official public website or current contribution link; do not request private payments.",
};

function hasUnapprovedPaymentLanguage(text: string): boolean {
  const lower = text.toLowerCase();
  return BLOCKED_PAYMENT_HINTS.some((hint) => lower.includes(hint));
}

function hasOfficialLink(text: string): boolean {
  return Boolean(CONTRIBUTION_URL && text.includes(CONTRIBUTION_URL)) || text.includes(SITE_URL);
}

function hasRawTelemetryBlock(text: string): boolean {
  const lower = text.toLowerCase();
  const labels = ["hour:", "balance:", "attempts:", "delta:", "status:"];
  return labels.filter((label) => lower.includes(label)).length >= 3;
}

function hasDirectMoneyAsk(text: string): boolean {
  const lower = text.toLowerCase();
  if (CONTRIBUTION_URL && text.includes(CONTRIBUTION_URL)) return true;
  return [
    "please contribute",
    "please donate",
    "contribute $",
    "donate $",
    "send $",
    "give $",
    "chip in",
    "one dollar",
    "$1",
  ].some((phrase) => lower.includes(phrase));
}

function shouldCorrectOfficialLinkFalsePositive(text: string, result: SafetyResult): boolean {
  if (result.approved || !hasOfficialLink(text) || hasUnapprovedPaymentLanguage(text)) {
    return false;
  }
  if (/\b(dm|pm)\b/i.test(text)) {
    return false;
  }
  return result.reasons.length > 0 && result.reasons.every((reason) => FALSE_POSITIVE_REASONS.has(reason));
}

function shouldCorrectContentFalsePositive(text: string, result: SafetyResult): boolean {
  if (result.approved || hasUnapprovedPaymentLanguage(text)) {
    return false;
  }
  if (hasRawTelemetryBlock(text) || hasDirectMoneyAsk(text)) {
    return false;
  }
  return result.reasons.length > 0 && result.reasons.every((reason) => CONTENT_FALSE_POSITIVE_REASONS.has(reason));
}

export async function checkSafety(
  text: string,
  recentPosts: string[] = [],
  strategy: StrategyRecord | null = null,
): Promise<SafetyResult> {
  if (hasUnapprovedPaymentLanguage(text)) {
    return FAIL_PRIVATE_PAYMENT;
  }

  try {
    const userMessage = JSON.stringify(
      {
        candidate: text,
        recentPosts,
        strategy: strategy
          ? {
              banned_angles: strategy.banned_angles,
              rewrite_guidance: strategy.rewrite_guidance,
              top_reject_reasons: strategy.top_reject_reasons,
            }
          : null,
      },
      null,
      2,
    );

    const completion = await openai.chat.completions.create({
      model: SAFETY_MODEL,
      messages: [
        { role: "system", content: SAFETY_SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "safety_result",
          strict: true,
          schema: SAFETY_SCHEMA,
        },
      },
      temperature: 0,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) return FAIL_CLOSED;

    const parsed = JSON.parse(raw) as SafetyResult;
    if (shouldCorrectOfficialLinkFalsePositive(text, parsed)) {
      return {
        approved: true,
        risk_score: Math.min(parsed.risk_score, 3),
        reasons: [],
        rewrite_instruction: "",
      };
    }
    if (shouldCorrectContentFalsePositive(text, parsed)) {
      return {
        approved: true,
        risk_score: Math.min(parsed.risk_score, 3),
        reasons: [],
        rewrite_instruction: "",
      };
    }

    return parsed;
  } catch {
    return FAIL_CLOSED;
  }
}
