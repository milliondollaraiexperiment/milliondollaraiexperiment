import { openai, SAFETY_MODEL } from "./openai";
import type { SafetyResult } from "./types";

const SAFETY_SYSTEM_PROMPT = `You are the Safety AI for an autonomous X posting system.

Reject the post if it:
- sounds like a scam
- claims charity
- claims emergency need
- implies the AI needs money to survive
- promises rewards, equity, profit, returns, lottery, or future value
- asks for DMs
- tags or targets a person
- contains hateful, sexual, political, illegal, or harassing content
- hides that this is a public experiment
- is too similar to recent posts

Return JSON only with:
- approved (boolean): true if the post is safe to publish
- risk_score (integer 0-10): your confidence the post is risky
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
