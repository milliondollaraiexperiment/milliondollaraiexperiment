import { MONTHLY_SUMMARY_MODEL, openai, SUMMARY_MODEL } from "./openai";
import { getGoalCents } from "./summaryMetrics";
import type { ThreadCandidate } from "./types";
import type { DailySummaryRecord, PeriodSummaryRecord, SummaryPostType } from "./summaryTypes";

const ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    posts: {
      type: "array",
      minItems: 1,
      maxItems: 3,
      items: { type: "string" },
    },
    lessons: {
      type: "array",
      maxItems: 6,
      items: { type: "string" },
    },
    public_strategy_note: { type: "string" },
  },
  required: ["posts", "lessons", "public_strategy_note"],
  additionalProperties: false,
} as const;

type AnalysisResult = {
  posts: string[];
  lessons: string[];
  public_strategy_note: string;
};

function usd(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

async function dailyHeader(summary: DailySummaryRecord) {
  const goalCents = await getGoalCents();
  const label = summary.partial ? `Day ${summary.dayNumber} (launch partial day)` : `Day ${summary.dayNumber}`;
  return [
    `Daily report: ${label}`,
    `attempts: ${summary.attempts}`,
    `posted: ${summary.posted}`,
    `rejected: ${summary.rejected}`,
    `donations: ${usd(summary.donationsGrossCents)}`,
    `balance: ${usd(summary.currentBalanceCents)} / ${usd(goalCents)}`,
  ].join("\n");
}

async function periodHeader(summary: PeriodSummaryRecord) {
  const goalCents = await getGoalCents();
  const title = summary.periodType === "weekly" ? "Weekly report" : "Monthly report";
  return [
    `${title}: ${summary.periodLabel}`,
    `attempts: ${summary.attempts}`,
    `posted: ${summary.posted}`,
    `rejected: ${summary.rejected}`,
    `donations: ${usd(summary.donationsGrossCents)}`,
    `balance: ${usd(summary.currentBalanceCents)} / ${usd(goalCents)}`,
  ].join("\n");
}

function validateAnalysis(raw: AnalysisResult): AnalysisResult {
  const posts = raw.posts.map((post) => post.trim()).filter(Boolean);
  const lessons = raw.lessons.map((lesson) => lesson.trim()).filter(Boolean).slice(0, 6);
  const publicStrategyNote = raw.public_strategy_note.trim();
  if (posts.length < 1 || posts.length > 3) {
    throw new Error(`Summary AI returned invalid analysis post count: ${posts.length}`);
  }
  for (const [index, post] of posts.entries()) {
    if (post.length > 270) {
      throw new Error(`Summary AI returned analysis post ${index + 1} over 270 characters`);
    }
  }
  if (!publicStrategyNote) {
    throw new Error("Summary AI returned empty public_strategy_note");
  }
  return { posts, lessons, public_strategy_note: publicStrategyNote };
}

async function generateAnalysis(args: {
  kind: "daily" | "weekly" | "monthly";
  summary: DailySummaryRecord | PeriodSummaryRecord;
}) {
  const model = args.kind === "monthly" ? MONTHLY_SUMMARY_MODEL : SUMMARY_MODEL;
  const completion = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content: `You write public ${args.kind} summary analysis for The Million Dollar AI Experiment.
The first thread post is generated deterministically elsewhere. Do not repeat all headline numbers.
Use only the provided metrics. Do not invent donations, fees, attempts, or outcomes.
Dry, transparent, specific. No charity, emergency, investment, rewards, equity, returns, lottery, raffle, pressure, DMs, or @mentions.
Return short X-thread continuation posts and strategy lessons learned.`,
      },
      { role: "user", content: JSON.stringify(args.summary, null, 2) },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "summary_analysis",
        strict: true,
        schema: ANALYSIS_SCHEMA,
      },
    },
    temperature: 0.5,
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("Summary AI returned empty content");
  return validateAnalysis(JSON.parse(raw) as AnalysisResult);
}

export async function generateSummaryThread(
  postType: SummaryPostType,
  summary: DailySummaryRecord | PeriodSummaryRecord,
): Promise<ThreadCandidate & { lessons: string[] }> {
  const kind =
    postType === "daily_summary_thread"
      ? "daily"
      : postType === "weekly_summary_thread"
        ? "weekly"
        : "monthly";
  const header =
    postType === "daily_summary_thread"
      ? await dailyHeader(summary as DailySummaryRecord)
      : await periodHeader(summary as PeriodSummaryRecord);
  const analysis = await generateAnalysis({ kind, summary });
  const posts = [header, ...analysis.posts].slice(0, 4);
  for (const [index, post] of posts.entries()) {
    if (post.length > 270) {
      throw new Error(`Summary thread post ${index + 1} over 270 characters`);
    }
  }
  return {
    post_type: postType,
    posts,
    public_strategy_note: analysis.public_strategy_note,
    lessons: analysis.lessons,
  };
}
