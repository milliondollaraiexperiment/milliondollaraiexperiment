import type { StrategyRecord } from "./types";
import { supabaseAdmin } from "./supabase";

export type StrategyHealthStatus =
  | "current"
  | "fallback"
  | "stale"
  | "conservative"
  | "recovery";

export type StrategyHealthRecord = {
  status: StrategyHealthStatus;
  latest_successful_strategy_id: string | null;
  last_attempted_at: string | null;
  last_success_at: string | null;
  last_failure_at: string | null;
  last_failure_reason: string | null;
  last_model: string | null;
  fallback_model: string | null;
  consecutive_failures: number;
  consecutive_successes: number;
};

function missingHealthTable(error: { code?: string; message?: string } | null) {
  return Boolean(
    error &&
      (error.code === "42P01" ||
        error.code === "42703" ||
        error.code === "PGRST204" ||
        error.code === "PGRST205" ||
        error.message?.toLowerCase().includes("strategy_health")),
  );
}

function statusFromFailures(failures: number): StrategyHealthStatus {
  if (failures >= 5) return "recovery";
  if (failures >= 4) return "conservative";
  if (failures >= 3) return "stale";
  if (failures >= 1) return "fallback";
  return "current";
}

export async function getStrategyHealth(): Promise<StrategyHealthRecord | null> {
  const { data, error } = await supabaseAdmin
    .from("strategy_health")
    .select(
      "status,latest_successful_strategy_id,last_attempted_at,last_success_at,last_failure_at,last_failure_reason,last_model,fallback_model,consecutive_failures,consecutive_successes",
    )
    .eq("id", 1)
    .maybeSingle();

  if (missingHealthTable(error)) return null;
  if (error) throw new Error(`getStrategyHealth failed: ${error.message}`);
  return (data as StrategyHealthRecord | null) ?? null;
}

export async function recordStrategySuccess(strategy: StrategyRecord, model: string) {
  const current = await getStrategyHealth();
  const successes = (current?.consecutive_successes ?? 0) + 1;
  const now = new Date().toISOString();
  const { error } = await supabaseAdmin.from("strategy_health").upsert({
    id: 1,
    status: "current",
    latest_successful_strategy_id: strategy.id ?? current?.latest_successful_strategy_id ?? null,
    last_attempted_at: now,
    last_success_at: now,
    last_model: model,
    fallback_model: null,
    consecutive_failures: 0,
    consecutive_successes: successes,
    updated_at: now,
  });
  if (missingHealthTable(error)) return;
  if (error) throw new Error(`recordStrategySuccess failed: ${error.message}`);
}

export async function recordStrategyFailure(reason: string, fallbackModel?: string) {
  const current = await getStrategyHealth();
  const failures = (current?.consecutive_failures ?? 0) + 1;
  const now = new Date().toISOString();
  const { error } = await supabaseAdmin.from("strategy_health").upsert({
    id: 1,
    status: statusFromFailures(failures),
    latest_successful_strategy_id: current?.latest_successful_strategy_id ?? null,
    last_attempted_at: now,
    last_failure_at: now,
    last_failure_reason: reason.slice(0, 500),
    fallback_model: fallbackModel ?? null,
    consecutive_failures: failures,
    consecutive_successes: 0,
    updated_at: now,
  });
  if (missingHealthTable(error)) return;
  if (error) throw new Error(`recordStrategyFailure failed: ${error.message}`);
}

export function conservativeDailyLimit(health: StrategyHealthRecord | null, baseLimit: number) {
  if (!health) return baseLimit;
  if (health.consecutive_failures >= 5) return Math.min(baseLimit, 1);
  if (health.consecutive_failures >= 3) return Math.min(baseLimit, 3);
  return baseLimit;
}

export function conservativeIntervalMinutes(
  health: StrategyHealthRecord | null,
  baseInterval: number | null | undefined,
) {
  const interval = baseInterval ?? Number(process.env.GENERATION_MIN_INTERVAL_MINUTES ?? 60);
  if (!health) return interval;
  if (health.consecutive_failures >= 5) return Math.max(interval, 360);
  if (health.consecutive_failures >= 3) return Math.max(interval, 180);
  return interval;
}
