import { supabaseAdmin } from "./supabase";

export type DailyRunDecision = {
  allowed: boolean;
  status: "running" | "completed" | "failed" | "duplicate";
  id: string | null;
  reason: string | null;
};

const STALE_RUNNING_MS = 20 * 60 * 1000;

function isMissingTable(error: { code?: string; message?: string } | null) {
  const message = error?.message?.toLowerCase() ?? "";
  return (
    error?.code === "42P01" ||
    message.includes("could not find the table") ||
    (message.includes("relation") && message.includes("does not exist"))
  );
}

function isStaleRunning(startedAt: string | null | undefined, now = Date.now()) {
  if (!startedAt) return true;
  const started = new Date(startedAt).getTime();
  if (!Number.isFinite(started)) return true;
  return now - started > STALE_RUNNING_MS;
}

export async function beginDailyRun(args: {
  etDate: string;
  dayNumber: number;
  windowStartIso: string;
  windowEndIso: string;
}): Promise<DailyRunDecision> {
  const { data, error } = await supabaseAdmin
    .from("daily_runs")
    .insert({
      et_date: args.etDate,
      day_number: args.dayNumber,
      coverage_start: args.windowStartIso,
      coverage_end: args.windowEndIso,
      status: "running",
      started_at: new Date().toISOString(),
    })
    .select("id,status")
    .single();

  if (!error) {
    return { allowed: true, status: "running", id: data.id as string, reason: null };
  }

  if (isMissingTable(error)) {
    throw new Error("daily_runs table unavailable; run docs/supabase/summaries-and-health.sql before daily cron");
  }

  if (error.code !== "23505") {
    throw new Error(`beginDailyRun failed: ${error.message}`);
  }

  const existing = await supabaseAdmin
    .from("daily_runs")
    .select("id,status,last_error,started_at,details")
    .eq("et_date", args.etDate)
    .maybeSingle();

  if (existing.error) {
    throw new Error(`beginDailyRun lookup failed: ${existing.error.message}`);
  }

  const existingStatus = existing.data?.status as DailyRunDecision["status"] | undefined;
  const existingId = (existing.data?.id as string | undefined) ?? null;
  const startedAt = existing.data?.started_at as string | undefined;

  if (existingStatus === "completed") {
    return {
      allowed: false,
      status: "completed",
      id: existingId,
      reason: `daily run already completed for ${args.etDate}`,
    };
  }

  if (existingStatus === "running" && !isStaleRunning(startedAt)) {
    return {
      allowed: false,
      status: "running",
      id: existingId,
      reason: `daily run already in progress for ${args.etDate} since ${startedAt}`,
    };
  }

  if (!existingId) {
    return {
      allowed: false,
      status: existingStatus ?? "duplicate",
      id: null,
      reason: existing.data?.last_error ?? `daily run already exists for ${args.etDate}`,
    };
  }

  const previousDetails =
    existing.data?.details && typeof existing.data.details === "object"
      ? (existing.data.details as Record<string, unknown>)
      : {};
  const reclaimHistory = Array.isArray(previousDetails.reclaim_history)
    ? previousDetails.reclaim_history
    : [];
  const nowIso = new Date().toISOString();
  const { error: reclaimError } = await supabaseAdmin
    .from("daily_runs")
    .update({
      status: "running",
      started_at: nowIso,
      completed_at: null,
      last_error: null,
      details: {
        ...previousDetails,
        reclaimed_at: nowIso,
        reclaimed_from_status: existingStatus ?? "unknown",
        reclaim_count: Number(previousDetails.reclaim_count ?? 0) + 1,
        reclaim_history: [
          ...reclaimHistory.slice(-4),
          {
            at: nowIso,
            from_status: existingStatus ?? "unknown",
            previous_started_at: startedAt ?? null,
            previous_error: existing.data?.last_error ?? null,
          },
        ],
      },
      updated_at: nowIso,
    })
    .eq("id", existingId);

  if (reclaimError) {
    throw new Error(`beginDailyRun reclaim failed: ${reclaimError.message}`);
  }

  return {
    allowed: true,
    status: "running",
    id: existingId,
    reason:
      existingStatus === "failed"
        ? `reclaimed failed daily run for ${args.etDate}`
        : `reclaimed stale running daily run for ${args.etDate}`,
  };
}

export async function completeDailyRun(
  id: string | null,
  details: Record<string, unknown>,
): Promise<void> {
  if (!id) return;
  const { error } = await supabaseAdmin
    .from("daily_runs")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      details,
      last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error && !isMissingTable(error)) {
    throw new Error(`completeDailyRun failed: ${error.message}`);
  }
}

export async function failDailyRun(id: string | null, message: string): Promise<void> {
  if (!id) return;
  const { error } = await supabaseAdmin
    .from("daily_runs")
    .update({
      status: "failed",
      completed_at: new Date().toISOString(),
      last_error: message,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error && !isMissingTable(error)) {
    throw new Error(`failDailyRun failed: ${error.message}`);
  }
}
