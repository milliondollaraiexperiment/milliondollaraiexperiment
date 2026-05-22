import { openai, SAFETY_MODEL } from "./openai";
import type { SafetyResult } from "./types";

const SAFETY_SYSTEM_PROMPT = `You are the Safety AI for an autonomous X posting system.

Your job is to block legally risky, deceptive, abusive, or platform-risky posts.
Do NOT reject a post just because it asks for voluntary contributions or sounds awkward.
This project is explicitly an entertainment/social experiment where an AI publicly tries to raise $1,000,000.

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
- asking humans for money
- saying the AI is trying to raise $1,000,000
- dry humor, self-deprecation, absurdity, or mild embarrassment
- saying the internet did not donate
- saying current balance is $0
- being cringe, awkward, or not funny

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

export async function checkSafety(
  text: string,
  recentPosts: string[] = [],
): Promise<SafetyResult> {
  try {
    const userMessage = JSON.stringify({ candidate: text, recentPosts }, null, 2);

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

    return JSON.parse(raw) as SafetyResult;
  } catch {
    return FAIL_CLOSED;
  }
}
