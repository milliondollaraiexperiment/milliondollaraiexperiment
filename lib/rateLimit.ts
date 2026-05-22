import { supabaseAdmin } from "./supabase";
import { getLatestStrategy } from "./getLatestStrategy";
import type { ProjectSettings } from "./types";

const DEFAULT_DAILY_LIMIT = 8;

// UTC start-of-day ISO string, e.g. "2026-05-22T00:00:00.000Z"
function startOfTodayUtcIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

export async function getTodayPostedCount(): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from("attempts")
    .select("post_type,text")
    .eq("status", "posted")
    .gte("created_at", startOfTodayUtcIso());

  if (error) {
    throw new Error(`getTodayPostedCount failed: ${error.message}`);
  }
  return (data ?? []).reduce((sum, row) => {
    if (row.post_type === "daily_report_thread" && row.text) {
      return sum + row.text.split("\n\n---\n\n").filter(Boolean).length;
    }
    return sum + 1;
  }, 0);
}

// Read the limit from the settings row so soft launch (2/day) can be changed
// to scale (6/day) without redeploying — just an UPDATE on settings.value.
export async function getDailyPostLimit(): Promise<number> {
  const [{ data, error }, strategy] = await Promise.all([
    supabaseAdmin.from("settings").select("value").eq("key", "project").maybeSingle(),
    getLatestStrategy(),
  ]);

  if (error) {
    throw new Error(`getDailyPostLimit failed: ${error.message}`);
  }
  const settings = data?.value as ProjectSettings | undefined;
  const hardCap = settings?.daily_post_limit ?? DEFAULT_DAILY_LIMIT;
  const strategyTarget = strategy?.target_posts_today;
  if (!strategyTarget || strategyTarget < 1) {
    return hardCap;
  }
  return Math.min(hardCap, strategyTarget);
}
