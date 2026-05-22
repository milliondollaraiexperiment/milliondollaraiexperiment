import { openai, STRATEGY_FALLBACK_MODEL, STRATEGY_MODEL } from "./openai";
import { supabaseAdmin } from "./supabase";
import type { StrategyRecord } from "./types";

const VALID_FORMATS = [
  "incident_report",
  "terminal_status",
  "one_liner",
  "hypothesis_update",
  "confession",
  "strategy_revision",
  "donor_reply",
  "direct_ask",
] as const;

const VALID_FORMAT_SET = new Set<string>(VALID_FORMATS);
const LOOKBACK_DAYS = 3;

type AttemptForStrategy = {
  post_type: string | null;
  status: "posted" | "logged_only" | "rejected" | "failed";
  safety_reasons: string[] | null;
  hard_block_reason: string | null;
  public_strategy_note: string | null;
  created_at: string;
};

type StrategyAiResult = {
  summary: string;
  preferred_formats: string[];
  forced_format: string | null;
  banned_angles: string[];
  rewrite_guidance: string;
  top_reject_reasons: string[];
  target_posts_today: number;
};

const STRATEGY_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    preferred_formats: {
      type: "array",
      minItems: 1,
      maxItems: 4,
      items: { type: "string", enum: VALID_FORMATS },
    },
    forced_format: {
      anyOf: [{ type: "string", enum: VALID_FORMATS }, { type: "null" }],
    },
    banned_angles: {
      type: "array",
      maxItems: 6,
      items: { type: "string" },
    },
    rewrite_guidance: { type: "string" },
    top_reject_reasons: {
      type: "array",
      maxItems: 6,
      items: { type: "string" },
    },
    target_posts_today: { type: "integer", minimum: 2, maximum: 8 },
  },
  required: [
    "summary",
    "preferred_formats",
    "forced_format",
    "banned_angles",
    "rewrite_guidance",
    "top_reject_reasons",
    "target_posts_today",
  ],
  additionalProperties: false,
} as const;

const STRATEGY_PROMPT = `You are Strategy AI for The Million Dollar AI Experiment.
Your job is to analyze recent attempts and produce safe guidance for tomorrow's Writer AI.

You may recommend formats and angles, but you cannot post, bypass Safety AI, tag people, DM users, or loosen legal rules.

Rules:
- Prefer formats that cleared checks or looked less repetitive.
- Use rejection reasons to avoid unsafe or boring angles.
- Direct asks are allowed, but must remain voluntary, public, non-urgent, and non-transactional.
- Recommend target_posts_today from 2 to 8. Use fewer posts when recent output was repetitive or rejected; use more when formats cleared checks.
- Ban mechanical patterns such as numbered observation lists, generic "no donations" updates, or repeated balance-only posts.
- Never recommend charity, emergency, investment, reward, equity, lottery, raffle, private payment, @mentions, DMs, or guilt.
- Keep guidance concrete enough for a Writer prompt.

Return only valid JSON.`;

function countBy<T extends string>(items: T[]): Record<T, number> {
  return items.reduce(
    (acc, item) => {
      acc[item] = (acc[item] ?? 0) + 1;
      return acc;
    },
    {} as Record<T, number>,
  );
}

function compactTopReasons(rows: AttemptForStrategy[]): string[] {
  const reasons = rows.flatMap((row) => [
    ...(row.safety_reasons ?? []),
    ...(row.hard_block_reason ? [row.hard_block_reason] : []),
  ]);
  return Object.entries(countBy(reasons))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([reason]) => reason);
}

function sanitizeStrategy(
  parsed: StrategyAiResult,
  rawMetrics: Record<string, unknown>,
  model: string,
): StrategyRecord {
  const preferred = parsed.preferred_formats.filter((format) => VALID_FORMAT_SET.has(format));
  const forcedFormat =
    parsed.forced_format && VALID_FORMAT_SET.has(parsed.forced_format)
      ? parsed.forced_format
      : null;

  return {
    summary: parsed.summary.trim(),
    preferred_formats: preferred.length ? preferred : ["direct_ask", "one_liner"],
    forced_format: forcedFormat,
    banned_angles: parsed.banned_angles.map((angle) => angle.trim()).filter(Boolean).slice(0, 6),
    rewrite_guidance: parsed.rewrite_guidance.trim(),
    top_reject_reasons: parsed.top_reject_reasons
      .map((reason) => reason.trim())
      .filter(Boolean)
      .slice(0, 6),
    target_posts_today: Math.min(8, Math.max(2, parsed.target_posts_today)),
    model,
    raw_metrics: rawMetrics,
  };
}

function shouldFallbackStrategyModel(err: unknown): boolean {
  const e = err as { status?: number; code?: string; message?: string };
  const message = e.message?.toLowerCase() ?? "";
  return (
    e.status === 429 ||
    e.code === "rate_limit_exceeded" ||
    e.code === "insufficient_quota" ||
    message.includes("rate limit") ||
    message.includes("quota")
  );
}

export async function generateAndSaveStrategy(): Promise<StrategyRecord | null> {
  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabaseAdmin
    .from("attempts")
    .select("post_type,status,safety_reasons,hard_block_reason,public_strategy_note,created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    throw new Error(`generateAndSaveStrategy attempts failed: ${error.message}`);
  }

  const rows = (data ?? []) as AttemptForStrategy[];
  if (rows.length === 0) return null;

  const formats = rows
    .map((row) => row.post_type)
    .filter((format): format is string => Boolean(format));
  const rejectedRows = rows.filter((row) => row.status === "rejected");
  const rawMetrics = {
    lookback_days: LOOKBACK_DAYS,
    attempts: rows.length,
    statuses: countBy(rows.map((row) => row.status)),
    formats: countBy(formats),
    top_reject_reasons: compactTopReasons(rejectedRows),
  };

  const userContent = JSON.stringify({ rawMetrics, recentAttempts: rows }, null, 2);
  let usedModel = STRATEGY_MODEL;
  let completion;
  try {
    completion = await openai.chat.completions.create({
      model: STRATEGY_MODEL,
      messages: [
        { role: "system", content: STRATEGY_PROMPT },
        { role: "user", content: userContent },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "strategy_result",
          strict: true,
          schema: STRATEGY_SCHEMA,
        },
      },
      temperature: 0.3,
    });
  } catch (err) {
    if (!shouldFallbackStrategyModel(err) || STRATEGY_FALLBACK_MODEL === STRATEGY_MODEL) {
      throw err;
    }
    usedModel = STRATEGY_FALLBACK_MODEL;
    completion = await openai.chat.completions.create({
      model: STRATEGY_FALLBACK_MODEL,
      messages: [
        { role: "system", content: STRATEGY_PROMPT },
        { role: "user", content: userContent },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "strategy_result",
          strict: true,
          schema: STRATEGY_SCHEMA,
        },
      },
      temperature: 0.3,
    });
  }

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new Error("Strategy AI returned empty content");
  }

  const strategy = sanitizeStrategy(JSON.parse(raw) as StrategyAiResult, rawMetrics, usedModel);
  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("strategies")
    .insert(strategy)
    .select(
      "id,summary,preferred_formats,forced_format,banned_angles,rewrite_guidance,top_reject_reasons,target_posts_today,model,raw_metrics,created_at",
    )
    .single();

  if (insertError) {
    throw new Error(`generateAndSaveStrategy insert failed: ${insertError.message}`);
  }

  return inserted as StrategyRecord;
}
