import { supabaseAdmin } from "./supabase";
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
    "Direct asks may use the Stripe contribution link, but ordinary posts should not link every time.",
  ],
  retired_lessons: [],
  avoid_patterns: ["numbered observation lists", "generic no-donation filler", "repeated balance-only posts"],
  prefer_patterns: ["short public posts", "dry direct asks", "strategy revisions", "readable status notes"],
  tone_rules: ["dry", "transparent", "not needy"],
  link_rules: [
    "Stripe link only on direct asks.",
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
  const [memory, recentDailySummaries, latestWeeklySummary, latestMonthlySummary] =
    await Promise.all([
      getActiveStrategyMemory(),
      loadRecentDailySummaries(3),
      loadLatestPeriodSummary("weekly"),
      loadLatestPeriodSummary("monthly"),
    ]);
  return {
    activeMemory: memory,
    recentDailySummaries,
    latestWeeklySummary,
    latestMonthlySummary,
  };
}

export async function updateActiveStrategyMemory(args: {
  summary: string;
  lessons: string[];
  raw: Record<string, unknown>;
}) {
  const current = await getActiveStrategyMemory();
  const activeLessons = Array.from(
    new Set([...args.lessons, ...current.active_lessons]),
  ).slice(0, 16);
  const avoidPatterns = Array.from(new Set(current.avoid_patterns)).slice(0, 12);
  const preferPatterns = Array.from(new Set(current.prefer_patterns)).slice(0, 12);
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
      raw_memory: args.raw,
      updated_at: now,
    },
    { onConflict: "id" },
  );
  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205") return;
    throw new Error(`updateActiveStrategyMemory failed: ${error.message}`);
  }
}
