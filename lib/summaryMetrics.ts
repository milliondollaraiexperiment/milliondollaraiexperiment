import { getProjectSettings } from "./projectState";
import { supabaseAdmin } from "./supabase";
import { SUMMARY_POST_TYPES, type DailySummaryRecord, type SummaryMetrics } from "./summaryTypes";

type AttemptSummaryRow = {
  post_type: string | null;
  status: "posted" | "logged_only" | "rejected" | "failed";
  safety_reasons: string[] | null;
  hard_block_reason: string | null;
  created_at: string;
};

type DonationSummaryRow = {
  amount_cents: number | null;
  gross_amount_cents?: number | null;
  created_at: string;
  paid_at?: string | null;
};

function countBy(items: string[]): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, item) => {
    acc[item] = (acc[item] ?? 0) + 1;
    return acc;
  }, {});
}

function topItems(counts: Record<string, number>, limit: number): string[] {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([item, count]) => `${item} (${count})`);
}

function topRejectReasons(rows: AttemptSummaryRow[]) {
  const reasons = rows.flatMap((row) => [
    ...(row.safety_reasons ?? []),
    ...(row.hard_block_reason ? [row.hard_block_reason] : []),
  ]);
  return topItems(countBy(reasons), 6);
}

async function loadDonations(windowStartIso: string, windowEndIso: string) {
  const withAccounting = await supabaseAdmin
    .from("donations")
    .select("amount_cents,gross_amount_cents,created_at,paid_at")
    .gte("created_at", windowStartIso)
    .lt("created_at", windowEndIso);

  if (!withAccounting.error) {
    return (withAccounting.data ?? []) as DonationSummaryRow[];
  }

  const fallback = await supabaseAdmin
    .from("donations")
    .select("amount_cents,created_at")
    .gte("created_at", windowStartIso)
    .lt("created_at", windowEndIso);

  if (fallback.error) {
    throw new Error(`loadDonations failed: ${fallback.error.message}`);
  }
  return (fallback.data ?? []) as DonationSummaryRow[];
}

async function currentBalanceCents() {
  const { data, error } = await supabaseAdmin.from("donations").select("amount_cents");
  if (error) {
    throw new Error(`currentBalanceCents failed: ${error.message}`);
  }
  return (data ?? []).reduce((sum, row) => sum + (row.amount_cents ?? 0), 0);
}

async function loadAccountingSummary() {
  const { data, error } = await supabaseAdmin
    .from("accounting_summary")
    .select("*")
    .maybeSingle();
  if (error) return null;
  return data ?? null;
}

export async function buildSummaryMetrics(
  windowStartIso: string,
  windowEndIso: string,
): Promise<SummaryMetrics> {
  const [attemptsRes, donations, balance, accountingSummary] = await Promise.all([
    supabaseAdmin
      .from("attempts")
      .select("post_type,status,safety_reasons,hard_block_reason,created_at")
      .gte("created_at", windowStartIso)
      .lt("created_at", windowEndIso),
    loadDonations(windowStartIso, windowEndIso),
    currentBalanceCents(),
    loadAccountingSummary(),
  ]);

  if (attemptsRes.error) {
    throw new Error(`buildSummaryMetrics attempts failed: ${attemptsRes.error.message}`);
  }

  const allAttempts = (attemptsRes.data ?? []) as AttemptSummaryRow[];
  const attempts = allAttempts.filter((row) => !SUMMARY_POST_TYPES.has(row.post_type ?? ""));
  const posted = attempts.filter((row) => row.status === "posted").length;
  const loggedOnly = attempts.filter((row) => row.status === "logged_only").length;
  const rejected = attempts.filter((row) => row.status === "rejected").length;
  const failed = attempts.filter((row) => row.status === "failed").length;
  const formats = attempts
    .map((row) => row.post_type)
    .filter((format): format is string => Boolean(format));
  const donationsGrossCents = donations.reduce(
    (sum, row) => sum + (row.gross_amount_cents ?? row.amount_cents ?? 0),
    0,
  );

  const rawMetrics = {
    all_attempts_including_summary_threads: allAttempts.length,
    status_counts: {
      posted,
      logged_only: loggedOnly,
      rejected,
      failed,
    },
    format_counts: countBy(formats),
    top_reject_reasons: topRejectReasons(attempts),
    accounting_summary: accountingSummary,
  };

  return {
    attempts: attempts.length,
    posted,
    loggedOnly,
    rejected,
    failed,
    clearedSafety: posted + loggedOnly,
    donationsCount: donations.length,
    donationsGrossCents,
    currentBalanceCents: balance,
    topRejectReasons: topRejectReasons(attempts),
    topFormats: topItems(countBy(formats), 6),
    rawMetrics,
  };
}

export async function buildDailySummaryBase(args: {
  dayNumber: number;
  etDate: string;
  windowStartIso: string;
  windowEndIso: string;
  partial: boolean;
}): Promise<DailySummaryRecord> {
  const metrics = await buildSummaryMetrics(args.windowStartIso, args.windowEndIso);
  return {
    ...metrics,
    ...args,
    lessons: [],
    publicThread: [],
    xPostIds: [],
  };
}

export async function getGoalCents() {
  const settings = await getProjectSettings();
  return settings.goal * 100;
}
