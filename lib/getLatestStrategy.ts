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
  target_posts_today: number | null;
  posting_windows_utc: string[] | null;
  min_post_interval_minutes: number | null;
  direct_ask_cadence_hours: number | null;
  keyword_focus: string[] | null;
  hashtag_policy: string | null;
  link_policy: string | null;
  model: string | null;
  raw_metrics: Record<string, unknown> | null;
  created_at: string;
};

export async function getLatestStrategy(): Promise<StrategyRecord | null> {
  const { data, error } = await supabaseAdmin
    .from("strategies")
    .select(
      "id,summary,preferred_formats,forced_format,banned_angles,rewrite_guidance,top_reject_reasons,target_posts_today,posting_windows_utc,min_post_interval_minutes,direct_ask_cadence_hours,keyword_focus,hashtag_policy,link_policy,model,raw_metrics,created_at",
    )
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    // Fail open if the table hasn't been created yet. Strategy improves
    // quality, but it must never block the posting safety pipeline.
    if (
      error.code === "42P01" ||
      error.code === "42703" ||
      error.code === "PGRST204" ||
      error.code === "PGRST205" ||
      error.message.toLowerCase().includes("column")
    ) {
      return null;
    }
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
    target_posts_today: row.target_posts_today,
    posting_windows_utc: row.posting_windows_utc ?? [],
    min_post_interval_minutes: row.min_post_interval_minutes,
    direct_ask_cadence_hours: row.direct_ask_cadence_hours,
    keyword_focus: row.keyword_focus ?? [],
    hashtag_policy: row.hashtag_policy ?? "",
    link_policy: row.link_policy ?? "",
    model: row.model,
    raw_metrics: row.raw_metrics ?? {},
    created_at: row.created_at,
  };
}
