import { supabaseAdmin } from "./supabase";
import type { DailySummaryRecord, PeriodSummaryRecord } from "./summaryTypes";

function dailyPayload(summary: DailySummaryRecord) {
  return {
    day_number: summary.dayNumber,
    et_date: summary.etDate,
    coverage_start: summary.windowStartIso,
    coverage_end: summary.windowEndIso,
    partial: summary.partial,
    attempts: summary.attempts,
    posted: summary.posted,
    logged_only: summary.loggedOnly,
    rejected: summary.rejected,
    failed: summary.failed,
    cleared_safety: summary.clearedSafety,
    donations_count: summary.donationsCount,
    donations_gross_cents: summary.donationsGrossCents,
    current_balance_cents: summary.currentBalanceCents,
    top_reject_reasons: summary.topRejectReasons,
    top_formats: summary.topFormats,
    lessons: summary.lessons,
    public_thread: summary.publicThread,
    x_post_ids: summary.xPostIds,
    raw_metrics: summary.rawMetrics,
    updated_at: new Date().toISOString(),
  };
}

export async function saveDailySummary(summary: DailySummaryRecord) {
  const { data, error } = await supabaseAdmin
    .from("daily_summaries")
    .upsert(dailyPayload(summary), { onConflict: "day_number" })
    .select("id")
    .single();

  if (error) {
    throw new Error(`saveDailySummary failed: ${error.message}`);
  }
  return { ...summary, id: data.id as string };
}

function periodPayload(summary: PeriodSummaryRecord) {
  return {
    period_type: summary.periodType,
    period_number: summary.periodNumber,
    period_label: summary.periodLabel,
    coverage_start: summary.windowStartIso,
    coverage_end: summary.windowEndIso,
    attempts: summary.attempts,
    posted: summary.posted,
    logged_only: summary.loggedOnly,
    rejected: summary.rejected,
    failed: summary.failed,
    donations_count: summary.donationsCount,
    donations_gross_cents: summary.donationsGrossCents,
    current_balance_cents: summary.currentBalanceCents,
    lessons: summary.lessons,
    public_thread: summary.publicThread,
    x_post_ids: summary.xPostIds,
    raw_metrics: summary.rawMetrics,
    updated_at: new Date().toISOString(),
  };
}

export async function savePeriodSummary(summary: PeriodSummaryRecord) {
  const { data, error } = await supabaseAdmin
    .from("period_summaries")
    .upsert(periodPayload(summary), {
      onConflict: "period_type,period_number,period_label",
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`savePeriodSummary failed: ${error.message}`);
  }
  return { ...summary, id: data.id as string };
}

export async function loadRecentDailySummaries(limit = 3) {
  const { data, error } = await supabaseAdmin
    .from("daily_summaries")
    .select("*")
    .order("day_number", { ascending: false })
    .limit(limit);
  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205") return [];
    throw new Error(`loadRecentDailySummaries failed: ${error.message}`);
  }
  return data ?? [];
}

export async function loadLatestPeriodSummary(periodType: "weekly" | "monthly") {
  const { data, error } = await supabaseAdmin
    .from("period_summaries")
    .select("*")
    .eq("period_type", periodType)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205") return null;
    throw new Error(`loadLatestPeriodSummary ${periodType} failed: ${error.message}`);
  }
  return data;
}
