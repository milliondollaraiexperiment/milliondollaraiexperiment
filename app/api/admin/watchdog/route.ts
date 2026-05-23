import { requireCronBearer } from "@/lib/adminAuth";
import { getAiHealthMap } from "@/lib/aiHealth";
import { getDailySummaryWindow } from "@/lib/experimentTime";
import { getLatestStrategy } from "@/lib/getLatestStrategy";
import { getProjectSettings, isPostingPaused } from "@/lib/projectState";
import { getLatestSchedulerRun, recordSchedulerRun } from "@/lib/schedulerRuns";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const DAILY_GRACE_MS = 3 * 60 * 60 * 1000;
const HOURLY_STALE_MS = 90 * 60 * 1000;

function ageMs(iso: string | null | undefined) {
  if (!iso) return Number.POSITIVE_INFINITY;
  const time = new Date(iso).getTime();
  if (!Number.isFinite(time)) return Number.POSITIVE_INFINITY;
  return Date.now() - time;
}

async function latestDailyRun() {
  const { data, error } = await supabaseAdmin
    .from("daily_runs")
    .select("id,et_date,day_number,status,started_at,completed_at,last_error,details")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { data: null, error: error.message };
  }
  return { data, error: null };
}

async function latestDonation() {
  const { data, error } = await supabaseAdmin
    .from("donations")
    .select("id,amount_cents,gross_amount_cents,currency,paid_at,created_at,provider_session_id")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { data: null, error: error.message };
  }
  return { data, error: null };
}

export async function GET(req: Request) {
  const authError = requireCronBearer(req);
  if (authError) return authError;

  const startedAt = new Date().toISOString();
  const checks: { name: string; ok: boolean; detail?: unknown }[] = [];
  const failures: string[] = [];

  const [settings, aiHealth, strategy, dailyRun, hourlyScheduler, dailyScheduler, donation] =
    await Promise.all([
      getProjectSettings(),
      getAiHealthMap(),
      getLatestStrategy(),
      latestDailyRun(),
      getLatestSchedulerRun("hourly"),
      getLatestSchedulerRun("daily"),
      latestDonation(),
    ]);

  if (settings.mode === "completed") {
    const response = {
      status: "ok",
      reason: "project completed",
      checks: [{ name: "project_completed", ok: true }],
      generated_at: new Date().toISOString(),
    };
    await recordSchedulerRun({
      job: "watchdog",
      source: req.headers.get("x-scheduler-source") ?? "watchdog",
      status: "ok",
      statusCode: 200,
      response,
      startedAt,
    });
    return Response.json(response);
  }

  const paused = isPostingPaused(settings);
  checks.push({ name: "project_not_paused", ok: !paused, detail: { mode: settings.mode } });
  if (paused) failures.push("project is paused");

  const shutdownComponents = Object.values(aiHealth)
    .filter((health) => health?.status === "shutdown")
    .map((health) => health?.component);
  checks.push({ name: "ai_not_shutdown", ok: shutdownComponents.length === 0, detail: aiHealth });
  if (shutdownComponents.length > 0) {
    failures.push(`AI shutdown: ${shutdownComponents.join(", ")}`);
  }

  if (hourlyScheduler.missing || dailyScheduler.missing) {
    failures.push("scheduler_runs table missing; run docs/supabase/scheduler-runs.sql");
  }
  checks.push({
    name: "scheduler_runs_table",
    ok: !hourlyScheduler.missing && !dailyScheduler.missing,
    detail: { hourly: hourlyScheduler.error, daily: dailyScheduler.error },
  });

  const dailyWindow = getDailySummaryWindow(settings.started_at);
  const dailyDue = Date.now() > new Date(dailyWindow.windowEndIso).getTime() + DAILY_GRACE_MS;
  const dailyOk =
    !dailyDue ||
    (dailyRun.data?.et_date === dailyWindow.etDate && dailyRun.data?.status === "completed");
  checks.push({
    name: "daily_run_current",
    ok: dailyOk,
    detail: {
      due: dailyDue,
      expected_et_date: dailyWindow.etDate,
      latest: dailyRun,
    },
  });
  if (!dailyOk) {
    failures.push(`no completed daily run for ET date ${dailyWindow.etDate}`);
  }

  const strategyOk = !dailyDue || Boolean(strategy?.id);
  checks.push({
    name: "strategy_after_daily",
    ok: strategyOk,
    detail: { due: dailyDue, strategy_id: strategy?.id ?? null },
  });
  if (!strategyOk) failures.push("no Strategy row after daily window");

  const hourlyAge = ageMs(hourlyScheduler.data?.completed_at ?? hourlyScheduler.data?.created_at);
  const hourlyOk = !strategy?.id || hourlyAge <= HOURLY_STALE_MS;
  checks.push({
    name: "hourly_scheduler_recent_after_strategy",
    ok: hourlyOk,
    detail: {
      strategy_id: strategy?.id ?? null,
      latest_hourly_scheduler: hourlyScheduler,
      stale_after_minutes: HOURLY_STALE_MS / 60000,
    },
  });
  if (!hourlyOk) failures.push("latest hourly scheduler heartbeat is stale");

  const accountingOk =
    !donation.data ||
    Boolean(donation.data.amount_cents && donation.data.currency && donation.data.provider_session_id);
  checks.push({ name: "latest_donation_accounting_basic", ok: accountingOk, detail: donation });
  if (!accountingOk) failures.push("latest donation is missing basic accounting fields");

  const ok = failures.length === 0;
  const statusCode = ok ? 200 : 503;
  const response = {
    status: ok ? "ok" : "unhealthy",
    failures,
    checks,
    generated_at: new Date().toISOString(),
  };

  await recordSchedulerRun({
    job: "watchdog",
    source: req.headers.get("x-scheduler-source") ?? "watchdog",
    status: response.status,
    reason: failures.join("; ") || null,
    statusCode,
    response,
    startedAt,
  });

  return Response.json(response, { status: statusCode });
}
