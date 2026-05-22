import { openai, WRITER_MODEL } from "./openai";
import type { ThreadCandidate } from "./types";
import type { DailyReportContext } from "./getDailyReportContext";

const THREAD_SCHEMA = {
  type: "object",
  properties: {
    post_type: { type: "string", enum: ["daily_report_thread"] },
    posts: {
      type: "array",
      minItems: 2,
      maxItems: 4,
      items: { type: "string" },
    },
    public_strategy_note: { type: "string" },
  },
  required: ["post_type", "posts", "public_strategy_note"],
  additionalProperties: false,
} as const;

const DAILY_REPORT_PROMPT = `You are the Writer AI for The Million Dollar AI Experiment.
Write a short X thread that reads like a daily lab report, not marketing.

Rules:
- 2 to 4 posts total.
- Each post must be under 270 characters.
- First post starts with "Daily report:".
- Use the actual numbers from the input.
- Dry, deadpan, specific.
- No charity, emergency, investment, rewards, equity, returns, lottery, raffle, or future value.
- No DMs, no @mentions, no private payment requests.
- No guilt, no emotional pressure, no spam.
- Natural keywords are allowed: AI experiment, autonomous AI, public log, social experiment, build in public.
- At most one post in the thread may include exactly one hashtag from: #AI, #BuildInPublic, #SocialExperiment.
- Never use more than one hashtag in the entire thread.

Return only valid JSON.`;

function validateThreadCandidate(candidate: ThreadCandidate): ThreadCandidate {
  const posts = candidate.posts.map((post) => post.trim()).filter(Boolean);
  const publicStrategyNote = candidate.public_strategy_note?.trim();

  if (candidate.post_type !== "daily_report_thread") {
    throw new Error(`Writer AI returned invalid thread post_type: ${candidate.post_type}`);
  }
  if (posts.length < 2 || posts.length > 4) {
    throw new Error(`Writer AI returned invalid thread length: ${posts.length}`);
  }
  for (const [index, post] of posts.entries()) {
    if (post.length > 270) {
      throw new Error(`Writer AI returned thread post ${index + 1} over 270 characters`);
    }
  }
  if (!publicStrategyNote) {
    throw new Error("Writer AI returned empty thread public_strategy_note");
  }

  return {
    post_type: "daily_report_thread",
    posts,
    public_strategy_note: publicStrategyNote,
  };
}

export async function generateDailyReportThread(
  context: DailyReportContext,
): Promise<ThreadCandidate> {
  const completion = await openai.chat.completions.create({
    model: WRITER_MODEL,
    messages: [
      { role: "system", content: DAILY_REPORT_PROMPT },
      { role: "user", content: JSON.stringify(context, null, 2) },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "daily_report_thread",
        strict: true,
        schema: THREAD_SCHEMA,
      },
    },
    temperature: 0.7,
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new Error("Writer AI returned empty daily report thread");
  }

  return validateThreadCandidate(JSON.parse(raw) as ThreadCandidate);
}
