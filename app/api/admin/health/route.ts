import { requireCronBearer } from "@/lib/adminAuth";
import { getAiHealthMap } from "@/lib/aiHealth";
import { getStrategyHealth } from "@/lib/strategyHealth";
import { getProjectSettings, isPostingPaused } from "@/lib/projectState";
import { getLatestSchedulerRun } from "@/lib/schedulerRuns";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

async function maybeSingle<T>(query: PromiseLike<{ data: T | null; error: { message: string } | null }>) {
  const { data, error } = await query;
  if (error) {
    return { data: null, error: error.message };
  }
  return { data, error: null };
}

export async function GET(req: Request) {
  const authError = requireCronBearer(req);
  if (authError) return authError;

  const [
    settings,
    aiHealth,
    strategyHealth,
    latestHourly,
    latestDaily,
    latestPosted,
    latestDonation,
    latestHourlyScheduler,
    latestDailyScheduler,
  ] =
    await Promise.all([
      getProjectSettings(),
      getAiHealthMap(),
      getStrategyHealth(),
      maybeSingle(
        supabaseAdmin
          .from("attempts")
          .select("id,hour_number,status,post_type,created_at,error_message")
          .not("hour_number", "is", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ),
      maybeSingle(
        supabaseAdmin
          .from("daily_runs")
          .select("id,et_date,day_number,status,started_at,completed_at,last_error,details")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ),
      maybeSingle(
        supabaseAdmin
          .from("attempts")
          .select("id,hour_number,post_type,x_post_id,created_at")
          .eq("status", "posted")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ),
      maybeSingle(
        supabaseAdmin
          .from("donations")
          .select(
            "id,amount_cents,gross_amount_cents,stripe_fee_cents,net_amount_cents,currency,paid_at,created_at,provider_session_id",
          )
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ),
      getLatestSchedulerRun("hourly"),
      getLatestSchedulerRun("daily"),
    ]);

  return Response.json({
    project: {
      mode: settings.mode,
      posting_paused: isPostingPaused(settings),
      started_at: settings.started_at ?? null,
      completed_at: settings.completed_at ?? null,
      final_post_sent: settings.final_post_sent ?? false,
      daily_post_limit: settings.daily_post_limit,
    },
    ai_health: aiHealth,
    strategy_health: strategyHealth,
    latest_hourly_run: latestHourly,
    latest_daily_run: latestDaily,
    latest_scheduler_runs: {
      hourly: latestHourlyScheduler,
      daily: latestDailyScheduler,
    },
    latest_x_post: latestPosted,
    latest_stripe_webhook: latestDonation,
    generated_at: new Date().toISOString(),
  });
}
