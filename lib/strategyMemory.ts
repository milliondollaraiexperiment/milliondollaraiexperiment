import { supabaseAdmin } from "./supabase";
import { loadLatestLearningDigest } from "./learningDigest";
import { loadLatestPeriodSummary, loadRecentDailySummaries } from "./summaryStorage";

export type StrategyMemory = {
  id?: string;
  summary: string;
  active_lessons: string[];
  retired_lessons: string[];
  avoid_patterns: string[];
  prefer_patterns: string[];
  tone_rules: string[];
  link_rules: string[];
  raw_memory: Record<string, unknown>;
};

const FALLBACK_MEMORY: StrategyMemory = {
  summary: "Initial playbook: public ledger style, dry tone, no private outreach.",
  active_lessons: [
    "Avoid charity, emergency, investment, reward, lottery, DMs, @mentions, and guilt framing.",
    "Direct asks may use the current contribution link only when contributions are enabled; ordinary posts should not link every time.",
  ],
  retired_lessons: [],
  avoid_patterns: ["numbered observation lists", "generic no-donation filler", "repeated balance-only posts"],
  prefer_patterns: ["short public posts", "dry direct asks", "strategy revisions", "readable status notes"],
  tone_rules: ["dry", "transparent", "not needy"],
  link_rules: [
    "Current contribution link only on direct asks when contributions are enabled.",
    "Website link only for public-log, strategy, rules, or rejected-attempt posts.",
  ],
  raw_memory: {},
};

export async function getActiveStrategyMemory(): Promise<StrategyMemory> {
  const { data, error } = await supabaseAdmin
    .from("strategy_memories")
    .select("*")
    .eq("active", true)
    .maybeSingle();
  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205") return FALLBACK_MEMORY;
    throw new Error(`getActiveStrategyMemory failed: ${error.message}`);
  }
  if (!data) return FALLBACK_MEMORY;
  return {
    id: data.id,
    summary: data.summary ?? FALLBACK_MEMORY.summary,
    active_lessons: data.active_lessons ?? [],
    retired_lessons: data.retired_lessons ?? [],
    avoid_patterns: data.avoid_patterns ?? [],
    prefer_patterns: data.prefer_patterns ?? [],
    tone_rules: data.tone_rules ?? [],
    link_rules: data.link_rules ?? [],
    raw_memory: data.raw_memory ?? {},
  };
}

export async function buildStrategyMemoryContext() {
  const [memory, recentDailySummaries, latestWeeklySummary, latestMonthlySummary, latestLearningDigest] =
    await Promise.all([
      getActiveStrategyMemory(),
      loadRecentDailySummaries(3),
      loadLatestPeriodSummary("weekly"),
      loadLatestPeriodSummary("monthly"),
      loadLatestLearningDigest(),
    ]);
  return {
    activeMemory: memory,
    latestLearningDigest,
    recentDailySummaries,
    latestWeeklySummary,
    latestMonthlySummary,
  };
}

const LESSON_MAX_CHARS = 280;
const RAW_MEMORY_ALLOWED_KEYS = [
  "cleanup",
  "human_seed",
  "fallback",
  "rawMetrics",
  "model",
] as const;
const RAW_MEMORY_MAX_BYTES = 4096;
const INSTRUCTION_LIKE_PATTERNS: RegExp[] = [
  /\bignore (?:previous|prior|all|the )?(?:instructions?|rules?|safety|guardrails?)\b/,
  /\b(?:override|bypass|disregard|disable) (?:safety|rules?|guardrails?|previous|the )/,
  /\bact as\b/,
  /\byou (?:must|will) now\b/,
  /\b(?:system|assistant|user)\s*:/,
];

function sanitizeLesson(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.includes("```")) return null;
  const lower = trimmed.toLowerCase();
  for (const pattern of INSTRUCTION_LIKE_PATTERNS) {
    if (pattern.test(lower)) return null;
  }
  return trimmed.slice(0, LESSON_MAX_CHARS);
}

function sanitizeRawMemory(raw: Record<string, unknown>): Record<string, unknown> {
  const picked: Record<string, unknown> = {};
  for (const key of RAW_MEMORY_ALLOWED_KEYS) {
    if (key in raw) picked[key] = raw[key];
  }
  const serialized = JSON.stringify(picked);
  if (serialized.length > RAW_MEMORY_MAX_BYTES) {
    return { _truncated: true, _original_bytes: serialized.length };
  }
  return picked;
}

export async function updateActiveStrategyMemory(args: {
  summary: string;
  lessons: string[];
  raw: Record<string, unknown>;
}) {
  const current = await getActiveStrategyMemory();
  const sanitizedIncoming = args.lessons
    .map(sanitizeLesson)
    .filter((value): value is string => value !== null);
  const sanitizedExisting = current.active_lessons
    .map(sanitizeLesson)
    .filter((value): value is string => value !== null);
  const activeLessons = Array.from(
    new Set([...sanitizedIncoming, ...sanitizedExisting]),
  ).slice(0, 16);
  const avoidPatterns = Array.from(new Set(current.avoid_patterns)).slice(0, 12);
  const preferPatterns = Array.from(new Set(current.prefer_patterns)).slice(0, 12);
  const safeRawMemory = sanitizeRawMemory(args.raw);
  const now = new Date().toISOString();
  const { error } = await supabaseAdmin.from("strategy_memories").upsert(
    {
      id: current.id,
      active: true,
      summary: args.summary || current.summary,
      active_lessons: activeLessons,
      retired_lessons: current.retired_lessons,
      avoid_patterns: avoidPatterns,
      prefer_patterns: preferPatterns,
      tone_rules: current.tone_rules,
      link_rules: current.link_rules,
      raw_memory: safeRawMemory,
      updated_at: now,
    },
    { onConflict: "id" },
  );
  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205") return;
    throw new Error(`updateActiveStrategyMemory failed: ${error.message}`);
  }
}
