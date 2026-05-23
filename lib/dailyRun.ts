import { supabaseAdmin } from "./supabase";

export type DailyRunDecision = {
  allowed: boolean;
  status: "running" | "completed" | "failed" | "duplicate";
  id: string | null;
  reason: string | null;
};

function isMissingTable(error: { code?: string; message?: string } | null) {
  const message = error?.message?.toLowerCase() ?? "";
  return error?.code === "42P01" || error?.code?.startsWith("PGRST") || message.includes("daily_runs");
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
    .select("id,status,last_error")
    .eq("et_date", args.etDate)
    .maybeSingle();

  if (existing.error) {
    throw new Error(`beginDailyRun lookup failed: ${existing.error.message}`);
  }

  return {
    allowed: false,
    status: (existing.data?.status as DailyRunDecision["status"]) ?? "duplicate",
    id: (existing.data?.id as string | undefined) ?? null,
    reason: existing.data?.last_error ?? `daily run already exists for ${args.etDate}`,
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
