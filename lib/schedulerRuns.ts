import { supabaseAdmin } from "./supabase";

export type SchedulerJob = "hourly" | "daily" | "watchdog";

export type SchedulerRunRecord = {
  id: string;
  job: SchedulerJob;
  source: string;
  status: string;
  status_code: number | null;
  reason: string | null;
  response: Record<string, unknown>;
  started_at: string;
  completed_at: string | null;
  created_at: string;
};

type SchedulerRunInput = {
  job: SchedulerJob;
  source: string;
  status: string;
  statusCode?: number | null;
  reason?: string | null;
  response?: Record<string, unknown>;
  startedAt?: string;
};

function isMissingSchedulerTable(error: { code?: string; message?: string } | null) {
  const message = error?.message?.toLowerCase() ?? "";
  return (
    error?.code === "42P01" ||
    error?.code === "42703" ||
    error?.code?.startsWith("PGRST") ||
    message.includes("scheduler_runs")
  );
}

export async function recordSchedulerRun(input: SchedulerRunInput): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabaseAdmin.from("scheduler_runs").insert({
    job: input.job,
    source: input.source,
    status: input.status,
    status_code: input.statusCode ?? null,
    reason: input.reason ?? null,
    response: input.response ?? {},
    started_at: input.startedAt ?? now,
    completed_at: now,
  });

  if (isMissingSchedulerTable(error)) return;
  if (error) {
    console.error(`recordSchedulerRun failed: ${error.message}`);
  }
}

export async function getLatestSchedulerRun(
  job?: SchedulerJob,
): Promise<{ data: SchedulerRunRecord | null; error: string | null; missing: boolean }> {
  let query = supabaseAdmin
    .from("scheduler_runs")
    .select("id,job,source,status,status_code,reason,response,started_at,completed_at,created_at")
    .order("created_at", { ascending: false })
    .limit(1);

  if (job) {
    query = query.eq("job", job);
  }

  const { data, error } = await query.maybeSingle();
  if (isMissingSchedulerTable(error)) {
    return { data: null, error: "scheduler_runs table missing", missing: true };
  }
  if (error) {
    return { data: null, error: error.message, missing: false };
  }
  return { data: (data as SchedulerRunRecord | null) ?? null, error: null, missing: false };
}
