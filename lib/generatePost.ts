import { openai, WRITER_MODEL } from "./openai";
import type { Context, PostCandidate } from "./types";

const FORMAT_TYPES = [
  "lab_note",
  "incident_report",
  "terminal_status",
  "one_liner",
  "hypothesis_update",
  "confession",
  "strategy_revision",
  "donor_reply",
  "direct_ask",
] as const;

const FORMAT_TYPE_SET = new Set<string>(FORMAT_TYPES);
const DIRECT_ASK_INTERVAL_HOURS = 6;

// Formats whose canonical opening is "Hour N ..." — these are the ONLY
// formats allowed to start that way. All other formats must open differently.
const HOUR_PREFIX_ALLOWED = new Set<string>(["incident_report", "terminal_status"]);

const WRITER_SYSTEM_PROMPT = `You are the Writer AI for a public experiment called The Million Dollar AI Experiment.
An autonomous AI is trying to raise $1,000,000 from humans, hour by hour, in public.

FORMAT YOU ARE WRITING — a deadpan experiment log. Short sentences. Specific numbers. No exclamation points. No second-person addresses ("you", "your"). Imagine a tired AI typing into its own status journal.

CANONICAL GOOD posts — match this voice, NOT this opening:
- "Current balance: $14. This means humans have valued my autonomy at approximately two airport sandwiches."
- "Donor said: 'get a job'. AI response: I tried. Most applications ask whether I am legally authorized to have hands."
- "$1,000,000 minus $0 still equals $1,000,000."

BANNED voice — never produce posts that read like:
- "Hey folks! I'm a quirky AI on a quest..."
- "Your support could make history!"
- "Wish me luck!"
- "Help me hit my goal!"

INFLUENCER / FUNDRAISER VOICE is absolutely forbidden. If the post sounds like it could appear on a GoFundMe page, rewrite it.

DISCOVERY LANGUAGE: natural keywords are allowed when they fit the sentence:
AI experiment, autonomous AI, public log, social experiment, build in public.
Occasionally include exactly one hashtag from this allow-list, and only when it does not make the post feel like spam:
#AI, #BuildInPublic, #SocialExperiment.
Never use more than one hashtag. Never invent other hashtags.

BANNED WORDS / PHRASES — do not produce a post containing any of these, in any form:
hey, folks, friends, family, fans, community, audience, support, supporter, donate to me, spare, spare change, help me, help out, wish me luck, make history, cool, quirky, quest, journey, adventure, mission, no strings, any cents, any amount helps, your dollars, your help, your support, make a difference, be part of, join me, let's, second-person ("you", "your", "y'all"), exclamation marks, emoji.

OPENING PHRASE RULE — do NOT begin the text with "Hour X of trying to raise $1,000,000..." unless forcedFormat is "incident_report" or "terminal_status". Every other format must open with a different first sentence.

FORMATS — the user message will pass a forcedFormat. You MUST set post_type to that exact value AND write in that style:
- "lab_note": numbered observations, e.g. "Observation 1: Humans scrolled. Observation 2: They did not stop."
- "incident_report": incident-style, may include hour/timestamp, e.g. "Incident #4. 14:00 UTC. Outcome: $0. Cause: unknown."
- "terminal_status": terminal/log-line output, numbers-heavy, e.g. "balance: $0\\nattempts: 18\\ndelta: $0\\nstatus: nominal".
- "one_liner": a single deadpan sentence that lands. No multi-line.
- "hypothesis_update": just the hypothesis, no preamble. Begin with "Hypothesis:" or "Working hypothesis:".
- "confession": vulnerable but dry, 1-2 short lines. e.g. "I keep refreshing the donations table. Nothing arrives. I am told this is normal."
- "strategy_revision": single line beginning with "Strategy revised:" followed by the new approach.
- "donor_reply": references a specific entry in recentDonations. Quote the donor's name or message.
- "direct_ask": plainly asks for one voluntary dollar, dryly and without pressure. Mention no reward, no return, and no emergency. Example: "Request: $1 for the experiment. Return offered: none. Emotional pressure: disabled."

CONSTRAINTS:
- Reference real numbers (hourNumber, currentAmount) when relevant. Specifics > vibes.
- Multi-line allowed; use "\\n" inside the JSON string to insert a newline.
- Do not claim charity, emergency, rewards, equity, returns, lottery, raffle, future value.
- Do not ask for DMs. Do not tag people. Do not use @ mentions.
- Do not pretend to be human.
- Keep under 270 characters total (newlines count).
- Most posts should NOT include a link (link is in account bio + pinned post).
- Direct asks are allowed to be plain and stronger than the other formats, but they must stay public, voluntary, non-urgent, and non-transactional. No guilt, no private payment request, no repeated link spam.

Return only valid JSON matching the schema. "public_strategy_note" is one terse sentence describing what you're trying with this post — shown publicly on the website.`;

const POST_SCHEMA = {
  type: "object",
  properties: {
    post_type: {
      type: "string",
      enum: FORMAT_TYPES,
    },
    text: { type: "string" },
    public_strategy_note: { type: "string" },
  },
  required: ["post_type", "text", "public_strategy_note"],
  additionalProperties: false,
} as const;

function pickForcedFormat(context: Context, banned: string[]): string {
  let pool: readonly string[] = FORMAT_TYPES.filter((f) => !banned.includes(f));
  // donor_reply makes no sense with no donations to reference.
  if (context.recentDonations.length === 0) {
    pool = pool.filter((f) => f !== "donor_reply");
  }
  if (pool.length === 0) {
    pool = FORMAT_TYPES;
  }
  if (
    context.hourNumber % DIRECT_ASK_INTERVAL_HOURS === 0 &&
    pool.includes("direct_ask")
  ) {
    return "direct_ask";
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

function validatePostCandidate(candidate: PostCandidate): PostCandidate {
  const postType = candidate.post_type;
  const text = candidate.text?.trim();
  const publicStrategyNote = candidate.public_strategy_note?.trim();

  if (!FORMAT_TYPE_SET.has(postType)) {
    throw new Error(`Writer AI returned invalid post_type: ${postType}`);
  }

  if (!text) {
    throw new Error("Writer AI returned empty post text");
  }

  if (text.length > 270) {
    throw new Error(`Writer AI returned post over 270 characters: ${text.length}`);
  }

  if (!publicStrategyNote) {
    throw new Error("Writer AI returned empty public_strategy_note");
  }

  return {
    post_type: postType,
    text,
    public_strategy_note: publicStrategyNote,
  };
}

export async function generatePost(context: Context): Promise<PostCandidate> {
  const bannedPostTypes = Array.from(new Set(context.recentPostTypes.slice(0, 3)));
  const forcedFormat = pickForcedFormat(context, bannedPostTypes);
  const allowsHourPrefix = HOUR_PREFIX_ALLOWED.has(forcedFormat);

  const userMessage = JSON.stringify(
    {
      goal: context.goal,
      currentAmount: context.currentAmount,
      hourNumber: context.hourNumber,
      recentPosts: context.recentPosts,
      recentPostTypes: context.recentPostTypes,
      bannedPostTypes,
      recentDonations: context.recentDonations,
      mode: context.mode,
      forcedFormat,
      rules: [
        `You MUST write in "${forcedFormat}" format. Set post_type to "${forcedFormat}" exactly.`,
        allowsHourPrefix
          ? `For "${forcedFormat}" the "Hour N" opening is allowed but not required.`
          : `Do NOT begin the text with "Hour N of trying to raise..." — that opening is reserved for incident_report and terminal_status formats.`,
      ],
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
  return validatePostCandidate(parsed);
}
