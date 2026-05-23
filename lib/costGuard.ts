import { pauseAutonomousPosting } from "./projectState";
import { supabaseAdmin } from "./supabase";
import { getCurrentEtDayWindow } from "./experimentTime";
import type { ProjectSettings } from "./types";

export type CostGuardResult = {
  allowed: boolean;
  reason: string | null;
  hourlyAttemptsToday: number;
  failedAttemptsToday: number;
};

function guardEnabled(settings: ProjectSettings): boolean {
  return settings.cost_guard?.enabled !== false;
}

async function countAttemptsToday(args: { status?: "failed"; hourlyOnly?: boolean } = {}) {
  const window = getCurrentEtDayWindow();
  let query = supabaseAdmin
    .from("attempts")
    .select("id", { count: "exact", head: true })
    .gte("created_at", window.windowStartIso)
    .lt("created_at", window.windowEndIso);

  if (args.hourlyOnly) {
    query = query.not("hour_number", "is", null);
  }
  if (args.status) {
    query = query.eq("status", args.status);
  }

  const { count, error } = await query;
  if (error) {
    throw new Error(`costGuard count failed: ${error.message}`);
  }
  return count ?? 0;
}

export async function enforceCostGuard(settings: ProjectSettings): Promise<CostGuardResult> {
  if (!guardEnabled(settings)) {
    return {
      allowed: true,
      reason: null,
      hourlyAttemptsToday: 0,
      failedAttemptsToday: 0,
    };
  }

  const [hourlyAttemptsToday, failedAttemptsToday] = await Promise.all([
    countAttemptsToday({ hourlyOnly: true }),
    countAttemptsToday({ status: "failed" }),
  ]);

  const maxHourly = settings.cost_guard?.max_hourly_attempts_per_day ?? 24;
  const maxFailed = settings.cost_guard?.max_failed_attempts_per_day ?? 6;
  const reason =
    hourlyAttemptsToday >= maxHourly
      ? `cost guard paused posting: ${hourlyAttemptsToday}/${maxHourly} hourly attempts today`
      : failedAttemptsToday >= maxFailed
        ? `cost guard paused posting: ${failedAttemptsToday}/${maxFailed} failed hourly attempts today`
        : null;

  if (reason) {
    await pauseAutonomousPosting(settings, reason);
    return {
      allowed: false,
      reason,
      hourlyAttemptsToday,
      failedAttemptsToday,
    };
  }

  return {
    allowed: true,
    reason: null,
    hourlyAttemptsToday,
    failedAttemptsToday,
  };
}
