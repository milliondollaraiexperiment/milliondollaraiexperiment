import { buildSummaryMetrics } from "./summaryMetrics";
import type { PeriodSummaryRecord } from "./summaryTypes";
import { supabaseAdmin } from "./supabase";

type DailySummaryRow = {
  coverage_start: string;
  coverage_end: string;
  et_date?: string;
};

async function windowFromDailyRange(startDay: number, endDay: number) {
  const { data, error } = await supabaseAdmin
    .from("daily_summaries")
    .select("coverage_start,coverage_end,et_date")
    .gte("day_number", startDay)
    .lte("day_number", endDay)
    .order("day_number", { ascending: true });
  if (error) {
    throw new Error(`windowFromDailyRange failed: ${error.message}`);
  }
  const rows = (data ?? []) as DailySummaryRow[];
  if (rows.length === 0) return null;
  return {
    start: rows[0].coverage_start,
    end: rows[rows.length - 1].coverage_end,
  };
}

export async function buildWeeklySummary(dayNumber: number): Promise<PeriodSummaryRecord | null> {
  const periodNumber = Math.ceil(dayNumber / 7);
  const startDay = (periodNumber - 1) * 7 + 1;
  const window = await windowFromDailyRange(startDay, dayNumber);
  if (!window) return null;
  const metrics = await buildSummaryMetrics(window.start, window.end);
  return {
    ...metrics,
    periodType: "weekly",
    periodNumber,
    periodLabel: `Week ${periodNumber} (Day ${startDay}-${dayNumber})`,
    windowStartIso: window.start,
    windowEndIso: window.end,
    lessons: [],
    publicThread: [],
    xPostIds: [],
  };
}

export async function buildMonthlySummary(args: {
  periodLabel: string;
  windowEndIso: string;
}): Promise<PeriodSummaryRecord | null> {
  const { data, error } = await supabaseAdmin
    .from("daily_summaries")
    .select("coverage_start,coverage_end")
    .lt("coverage_end", args.windowEndIso)
    .order("day_number", { ascending: true });
  if (error) {
    throw new Error(`buildMonthlySummary load days failed: ${error.message}`);
  }
  const rows = ((data ?? []) as DailySummaryRow[]).filter((row) => row.et_date?.startsWith(args.periodLabel));
  if (rows.length === 0) return null;
  const metrics = await buildSummaryMetrics(rows[0].coverage_start, rows[rows.length - 1].coverage_end);
  return {
    ...metrics,
    periodType: "monthly",
    periodNumber: Number(args.periodLabel.replace("-", "")),
    periodLabel: `${args.periodLabel} launch/public month`,
    windowStartIso: rows[0].coverage_start,
    windowEndIso: rows[rows.length - 1].coverage_end,
    lessons: [],
    publicThread: [],
    xPostIds: [],
  };
}
