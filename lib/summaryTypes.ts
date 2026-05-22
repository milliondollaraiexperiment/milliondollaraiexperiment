export const SUMMARY_POST_TYPES = new Set([
  "daily_summary_thread",
  "weekly_summary_thread",
  "monthly_summary_thread",
  "final_report_thread",
]);

export type SummaryPostType =
  | "daily_summary_thread"
  | "weekly_summary_thread"
  | "monthly_summary_thread";

export type SummaryMetrics = {
  attempts: number;
  posted: number;
  loggedOnly: number;
  rejected: number;
  failed: number;
  clearedSafety: number;
  donationsCount: number;
  donationsGrossCents: number;
  currentBalanceCents: number;
  topRejectReasons: string[];
  topFormats: string[];
  rawMetrics: Record<string, unknown>;
};

export type DailySummaryRecord = SummaryMetrics & {
  id?: string;
  dayNumber: number;
  etDate: string;
  windowStartIso: string;
  windowEndIso: string;
  partial: boolean;
  lessons: string[];
  publicThread: string[];
  xPostIds: string[];
};

export type PeriodSummaryRecord = SummaryMetrics & {
  id?: string;
  periodType: "weekly" | "monthly";
  periodNumber: number;
  periodLabel: string;
  windowStartIso: string;
  windowEndIso: string;
  lessons: string[];
  publicThread: string[];
  xPostIds: string[];
};
