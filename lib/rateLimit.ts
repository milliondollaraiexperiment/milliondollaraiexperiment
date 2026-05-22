import { supabaseAdmin } from "./supabase";

// UTC start-of-day ISO string, e.g. "2026-05-22T00:00:00.000Z"
function startOfTodayUtcIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

export async function getTodayPostedCount(): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from("attempts")
    .select("id", { count: "exact", head: true })
    .eq("status", "posted")
    .gte("created_at", startOfTodayUtcIso());

  if (error) {
    throw new Error(`getTodayPostedCount failed: ${error.message}`);
  }
  return count ?? 0;
}
