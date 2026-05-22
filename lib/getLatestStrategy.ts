import { supabaseAdmin } from "./supabase";
import type { StrategyRecord } from "./types";

type StrategyRow = {
  id: string;
  summary: string;
  preferred_formats: string[] | null;
  forced_format: string | null;
  banned_angles: string[] | null;
  rewrite_guidance: string | null;
  top_reject_reasons: string[] | null;
  model: string | null;
  raw_metrics: Record<string, unknown> | null;
  created_at: string;
};

export async function getLatestStrategy(): Promise<StrategyRecord | null> {
  const { data, error } = await supabaseAdmin
    .from("strategies")
    .select(
      "id,summary,preferred_formats,forced_format,banned_angles,rewrite_guidance,top_reject_reasons,model,raw_metrics,created_at",
    )
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    // Fail open if the table hasn't been created yet. Strategy improves
    // quality, but it must never block the posting safety pipeline.
    if (error.code === "42P01" || error.code === "PGRST205") return null;
    throw new Error(`getLatestStrategy failed: ${error.message}`);
  }
  if (!data) return null;

  const row = data as StrategyRow;
  return {
    id: row.id,
    summary: row.summary,
    preferred_formats: row.preferred_formats ?? [],
    forced_format: row.forced_format,
    banned_angles: row.banned_angles ?? [],
    rewrite_guidance: row.rewrite_guidance ?? "",
    top_reject_reasons: row.top_reject_reasons ?? [],
    model: row.model,
    raw_metrics: row.raw_metrics ?? {},
    created_at: row.created_at,
  };
}
