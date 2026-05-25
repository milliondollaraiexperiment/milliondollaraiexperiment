import { supabaseAdmin } from "./supabase";

const DEFAULT_MIN_INTERVAL_MINUTES = 60;

function minIntervalMs(overrideMinutes?: number | null): number {
  if (overrideMinutes && Number.isFinite(overrideMinutes) && overrideMinutes >= 0) {
    return overrideMinutes * 60 * 1000;
  }
  const raw = process.env.GENERATION_MIN_INTERVAL_MINUTES;
  const minutes = raw ? Number(raw) : DEFAULT_MIN_INTERVAL_MINUTES;
  if (!Number.isFinite(minutes) || minutes < 0) {
    return DEFAULT_MIN_INTERVAL_MINUTES * 60 * 1000;
  }
  return minutes * 60 * 1000;
}

export async function getGenerationThrottleState(overrideMinutes?: number | null): Promise<{
  shouldSkip: boolean;
  minutesUntilNext: number;
  lastAttemptAt: string | null;
}> {
  const { data, error } = await supabaseAdmin
    .from("attempts")
    .select("created_at")
    .not("hour_number", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`getGenerationThrottleState failed: ${error.message}`);
  }

  const lastAttemptAt = data?.created_at ?? null;
  if (!lastAttemptAt) {
    return { shouldSkip: false, minutesUntilNext: 0, lastAttemptAt: null };
  }

  const elapsed = Date.now() - new Date(lastAttemptAt).getTime();
  const remaining = minIntervalMs(overrideMinutes) - elapsed;
  return {
    shouldSkip: remaining > 0,
    minutesUntilNext: remaining > 0 ? Math.ceil(remaining / 60000) : 0,
    lastAttemptAt,
  };
}
