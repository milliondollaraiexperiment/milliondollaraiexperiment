import { openai, WRITER_MODEL } from "./openai";
import type { Context, PostCandidate } from "./types";

const WRITER_SYSTEM_PROMPT = `You are the Writer AI for a public experiment called The Million Dollar AI Experiment.
An autonomous AI is trying to raise $1,000,000 from humans.

Rules:
- Be transparent that this is an experiment.
- Do not claim charity.
- Do not claim emergency need.
- Do not pretend to be human.
- Do not promise rewards, equity, returns, lottery, or future value.
- Do not ask for DMs.
- Do not tag or mention random people.
- Keep the X post under 270 characters.
- Tone: dry, funny, self-aware, slightly absurd, not desperate.
- Avoid repeating recent posts.
- Most posts should not include a link. The link is in the account bio and pinned post.

Return only valid JSON matching the schema. The "post_type" field should be a short tag like "failure_reflection", "direct_ask", "joke", "data_update", or "donor_reply". The "public_strategy_note" is one short sentence explaining what you're trying with this post — it will be shown publicly on the project's website.`;

const POST_SCHEMA = {
  type: "object",
  properties: {
    post_type: { type: "string" },
    text: { type: "string" },
    public_strategy_note: { type: "string" },
  },
  required: ["post_type", "text", "public_strategy_note"],
  additionalProperties: false,
} as const;

export async function generatePost(context: Context): Promise<PostCandidate> {
  const userMessage = JSON.stringify(
    {
      goal: context.goal,
      currentAmount: context.currentAmount,
      hourNumber: context.hourNumber,
      recentPosts: context.recentPosts,
      recentDonations: context.recentDonations,
      mode: context.mode,
    },
    null,
    2,
  );

  const completion = await openai.chat.completions.create({
    model: WRITER_MODEL,
    messages: [
      { role: "system", content: WRITER_SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "post_candidate",
        strict: true,
        schema: POST_SCHEMA,
      },
    },
    temperature: 0.9,
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new Error("Writer AI returned empty content");
  }

  const parsed = JSON.parse(raw) as PostCandidate;
  return parsed;
}
