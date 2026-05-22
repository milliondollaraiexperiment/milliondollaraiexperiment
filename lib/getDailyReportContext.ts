import { supabaseAdmin } from "./supabase";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

type AttemptRow = {
  status: "posted" | "logged_only" | "rejected" | "failed";
  safety_reasons: string[] | null;
  hard_block_reason: string | null;
};

type DonationRow = {
  amount_cents: number | null;
};

export type DailyReportContext = {
  windowStartIso: string;
  windowEndIso: string;
  attempts: number;
  posted: number;
  loggedOnly: number;
  rejected: number;
  failed: number;
  clearedSafety: number;
  donationsCents: number;
  mostRejectedReason: string;
};

function mostCommonReason(rows: AttemptRow[]): string {
  const counts = new Map<string, number>();
  for (const row of rows) {
    for (const reason of row.safety_reasons ?? []) {
      counts.set(reason, (counts.get(reason) ?? 0) + 1);
    }
    if (row.hard_block_reason) {
      counts.set(row.hard_block_reason, (counts.get(row.hard_block_reason) ?? 0) + 1);
    }
  }

  let best = "";
  let bestCount = 0;
  for (const [reason, count] of counts) {
    if (count > bestCount) {
      best = reason;
      bestCount = count;
    }
  }
  return best || "none";
}

export async function getDailyReportContext(): Promise<DailyReportContext> {
  const end = new Date();
  const start = new Date(end.getTime() - ONE_DAY_MS);
  const windowStartIso = start.toISOString();
  const windowEndIso = end.toISOString();

  const [attemptsRes, donationsRes] = await Promise.all([
    supabaseAdmin
      .from("attempts")
      .select("status,safety_reasons,hard_block_reason")
      .gte("created_at", windowStartIso)
      .lt("created_at", windowEndIso),
    supabaseAdmin
      .from("donations")
      .select("amount_cents")
      .gte("created_at", windowStartIso)
      .lt("created_at", windowEndIso),
  ]);

  if (attemptsRes.error) {
    throw new Error(`getDailyReportContext attempts failed: ${attemptsRes.error.message}`);
  }
  if (donationsRes.error) {
    throw new Error(`getDailyReportContext donations failed: ${donationsRes.error.message}`);
  }

  const attempts = (attemptsRes.data ?? []) as AttemptRow[];
  const donations = (donationsRes.data ?? []) as DonationRow[];
  const posted = attempts.filter((row) => row.status === "posted").length;
  const loggedOnly = attempts.filter((row) => row.status === "logged_only").length;
  const rejected = attempts.filter((row) => row.status === "rejected").length;
  const failed = attempts.filter((row) => row.status === "failed").length;
  const donationsCents = donations.reduce((sum, row) => sum + (row.amount_cents ?? 0), 0);

  return {
    windowStartIso,
    windowEndIso,
    attempts: attempts.length,
    posted,
    loggedOnly,
    rejected,
    failed,
    clearedSafety: posted + loggedOnly,
    donationsCents,
    mostRejectedReason: mostCommonReason(attempts),
  };
}
