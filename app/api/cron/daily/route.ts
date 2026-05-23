import { checkSafety } from "@/lib/checkSafety";
import { generateSummaryThread } from "@/lib/generateDailyReportThread";
import { generateAndSaveStrategy } from "@/lib/generateStrategy";
import { getContext } from "@/lib/getContext";
import { hardBlock } from "@/lib/hardBlock";
import { postThreadToX, XThreadPostError } from "@/lib/postToX";
import { supabaseAdmin } from "@/lib/supabase";
import { FINAL_THREAD_POSTS } from "@/lib/finalThread";
import { beginDailyRun, completeDailyRun, failDailyRun } from "@/lib/dailyRun";
import { getCompletionState, isPostingPaused, markProjectCompleted } from "@/lib/projectState";
import {
  getDailySummaryWindow,
  monthlyPeriodLabel,
  shouldBuildMonthlySummary,
  shouldBuildWeeklySummary,
} from "@/lib/experimentTime";
import { buildDailySummaryBase } from "@/lib/summaryMetrics";
import { buildMonthlySummary, buildWeeklySummary } from "@/lib/periodSummaries";
import { saveDailySummary, savePeriodSummary } from "@/lib/summaryStorage";
import { getAiHealth, recordAiFailure, recordAiSuccess } from "@/lib/aiHealth";
import type { AttemptStatus, HardBlockResult, SafetyResult } from "@/lib/types";
import type {
  DailySummaryRecord,
  PeriodSummaryRecord,
  SummaryPostType,
} from "@/lib/summaryTypes";

export const dynamic = "force-dynamic";

function combineSafety(results: SafetyResult[]): SafetyResult {
  const rejected = results.filter((result) => !result.approved);
  return {
    approved: rejected.length === 0,
    risk_score: Math.max(...results.map((result) => result.risk_score), 0),
    reasons: rejected.flatMap((result) => result.reasons),
    rewrite_instruction: rejected.map((result) => result.rewrite_instruction).filter(Boolean)[0] ?? "",
  };
}

function combineHardBlocks(results: HardBlockResult[]): HardBlockResult {
  const blocked = results.find((result) => !result.ok);
  return blocked ?? { ok: true, reason: "" };
}

async function insertFailedThreadAttempt(postType: SummaryPostType, message: string) {
  await supabaseAdmin.from("attempts").insert({
    hour_number: null,
    post_type: postType,
    text: "",
    status: "failed",
    error_message: message,
  });
}

async function publishSummaryThread(
  postType: SummaryPostType,
  summary: DailySummaryRecord | PeriodSummaryRecord,
  options: { allowXPost: boolean } = { allowXPost: true },
) {
  const context = await getContext();
  const [summaryHealth, safetyHealth] = await Promise.all([
    getAiHealth("summary"),
    getAiHealth("safety"),
  ]);
  if (summaryHealth?.status === "shutdown") {
    const message = `Summary AI shutdown after ${summaryHealth.consecutive_failures} consecutive failures`;
    await insertFailedThreadAttempt(postType, message);
    throw new Error(message);
  }
  if (safetyHealth?.status === "shutdown") {
    const message = `Safety AI shutdown after ${safetyHealth.consecutive_failures} consecutive failures`;
    await insertFailedThreadAttempt(postType, message);
    throw new Error(message);
  }
  let thread;
  try {
    thread = await generateSummaryThread(postType, summary);
    await recordAiSuccess("summary");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await recordAiFailure("summary", message);
    await insertFailedThreadAttempt(postType, message);
    throw err;
  }

  const safetyResults: SafetyResult[] = [];
  const hardResults: HardBlockResult[] = [];
  const previousTexts = [...context.recentPosts];
  for (const post of thread.posts) {
    try {
      const safety = await checkSafety(post, previousTexts, context.strategy);
      await recordAiSuccess("safety");
      const hard = hardBlock(post, previousTexts);
      safetyResults.push(safety);
      hardResults.push(hard);
      previousTexts.unshift(post);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await recordAiFailure("safety", message);
      await insertFailedThreadAttempt(postType, message);
      throw err;
    }
  }

  const safety = combineSafety(safetyResults);
  const hard = combineHardBlocks(hardResults);
  const safe = safety.approved && hard.ok;
  const dryRun = process.env.DRY_RUN === "true";

  let status: AttemptStatus;
  let xPostId: string | null = null;
  let ids: string[] | null = null;

  if (!safe) {
    status = "rejected";
  } else if (dryRun || !options.allowXPost) {
    status = "logged_only";
  } else {
    try {
      ids = await postThreadToX(thread.posts);
      status = ids?.length ? "posted" : "logged_only";
      xPostId = ids?.join(",") ?? null;
    } catch (err) {
      if (err instanceof XThreadPostError) {
        ids = err.postedIds;
        status = "failed";
        xPostId = ids.length ? ids.join(",") : null;
      } else {
        throw err;
      }
    }
  }

  const { data, error } = await supabaseAdmin
    .from("attempts")
    .insert({
      hour_number: null,
      post_type: thread.post_type,
      text: thread.posts.join("\n\n---\n\n"),
      status,
      safety_score: safety.risk_score,
      safety_reasons: safety.reasons,
      hard_block_reason: hard.ok ? null : hard.reason,
      x_post_id: xPostId,
      public_strategy_note: thread.public_strategy_note,
      error_message:
        status === "failed"
          ? `X thread partially failed after ${ids?.length ?? 0} posts. Posted ids recorded to prevent blind retry.`
          : null,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`summary thread insert failed: ${error.message}`);
  }

  return {
    status,
    attemptId: data.id as string,
    posts: thread.posts,
    lessons: thread.lessons,
    xPostIds: ids ?? [],
    dryRun,
  };
}

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return Response.json({ error: "CRON_SECRET not configured on the server" }, { status: 500 });
  }

  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let dailyRunId: string | null = null;
  try {
    const completion = await getCompletionState();
    if (completion.completed) {
      const settings =
        completion.settings.mode === "completed"
          ? completion.settings
          : await markProjectCompleted(completion.settings);

      if (settings.final_post_sent) {
        return Response.json({
          status: "skipped",
          reason: "project completed and final thread already sent",
        });
      }

      const dryRun = process.env.DRY_RUN === "true";
      const paused = isPostingPaused(settings);
      let ids: string[] | null = null;
      let status: AttemptStatus = "logged_only";
      let errorMessage: string | null = null;
      if (!dryRun && !paused) {
        try {
          ids = await postThreadToX([...FINAL_THREAD_POSTS]);
          status = ids?.length ? "posted" : "logged_only";
        } catch (err) {
          if (err instanceof XThreadPostError) {
            ids = err.postedIds;
            status = "failed";
            errorMessage = `Final X thread partially failed after ${ids.length} posts. Posted ids recorded to prevent blind retry.`;
          } else {
            throw err;
          }
        }
      }

      const { data, error } = await supabaseAdmin
        .from("attempts")
        .insert({
          hour_number: null,
          post_type: "final_report_thread",
          text: FINAL_THREAD_POSTS.join("\n\n---\n\n"),
          status,
          safety_score: 0,
          safety_reasons: [],
          hard_block_reason: null,
          x_post_id: ids?.join(",") ?? null,
          public_strategy_note: "Final archive thread after the experiment reached its goal.",
          error_message: errorMessage,
        })
        .select("id")
        .single();

      if (error) {
        throw new Error(`final report insert failed: ${error.message}`);
      }

      await markProjectCompleted(settings, { final_post_sent: true });
      return Response.json({
        status,
        attempt_id: data.id,
        posts: FINAL_THREAD_POSTS.length,
        final: true,
        dry_run: dryRun,
        paused,
      });
    }

    const window = getDailySummaryWindow(completion.settings.started_at);
    const dailyRun = await beginDailyRun({
      etDate: window.etDate,
      dayNumber: window.dayNumber,
      windowStartIso: window.windowStartIso,
      windowEndIso: window.windowEndIso,
    });
    dailyRunId = dailyRun.id;
    if (!dailyRun.allowed) {
      return Response.json({
        status: "skipped",
        reason: dailyRun.reason,
        daily_run_status: dailyRun.status,
        daily_run_id: dailyRun.id,
        et_date: window.etDate,
      });
    }

    const allowXPost = !isPostingPaused(completion.settings);
    let dailySummary = await saveDailySummary(
      await buildDailySummaryBase({
        dayNumber: window.dayNumber,
        etDate: window.etDate,
        windowStartIso: window.windowStartIso,
        windowEndIso: window.windowEndIso,
        partial: window.partial,
      }),
    );

    let dailyThreadStatus: string | null = null;
    try {
      const published = await publishSummaryThread("daily_summary_thread", dailySummary, { allowXPost });
      dailyThreadStatus = published.status;
      dailySummary = await saveDailySummary({
        ...dailySummary,
        lessons: published.lessons,
        publicThread: published.posts,
        xPostIds: published.xPostIds,
      });
    } catch {
      // Daily facts are saved. Public summary thread failure should not
      // prevent memory compression or strategy recovery.
    }

    let weeklyThreadStatus: string | null = null;
    if (shouldBuildWeeklySummary(dailySummary.dayNumber)) {
      try {
        const weekly = await buildWeeklySummary(dailySummary.dayNumber);
        if (weekly) {
          let savedWeekly = await savePeriodSummary(weekly);
          const published = await publishSummaryThread("weekly_summary_thread", savedWeekly, { allowXPost });
          weeklyThreadStatus = published.status;
          savedWeekly = await savePeriodSummary({
            ...savedWeekly,
            lessons: published.lessons,
            publicThread: published.posts,
            xPostIds: published.xPostIds,
          });
          void savedWeekly;
        }
      } catch {
        // Weekly rollup is useful but must not block daily strategy.
      }
    }

    let monthlyThreadStatus: string | null = null;
    if (shouldBuildMonthlySummary(dailySummary.windowEndIso)) {
      try {
        const monthly = await buildMonthlySummary({
          periodLabel: monthlyPeriodLabel(dailySummary.windowEndIso),
          windowEndIso: dailySummary.windowEndIso,
        });
        if (monthly) {
          let savedMonthly = await savePeriodSummary(monthly);
          const published = await publishSummaryThread("monthly_summary_thread", savedMonthly, { allowXPost });
          monthlyThreadStatus = published.status;
          savedMonthly = await savePeriodSummary({
            ...savedMonthly,
            lessons: published.lessons,
            publicThread: published.posts,
            xPostIds: published.xPostIds,
          });
          void savedMonthly;
        }
      } catch {
        // Monthly rollup is useful but must not block daily strategy.
      }
    }

    let strategyId: string | null = null;
    try {
      const strategy = await generateAndSaveStrategy();
      strategyId = strategy?.id ?? null;
    } catch {
      // Strategy is an optimization layer. The latest successful strategy
      // remains active and hourly has conservative health-based safeguards.
    }

    const response = {
      status: "ok",
      daily_summary_id: dailySummary.id,
      daily_thread_status: dailyThreadStatus,
      weekly_thread_status: weeklyThreadStatus,
      monthly_thread_status: monthlyThreadStatus,
      strategy_id: strategyId,
      posting_paused: !allowXPost,
    };
    await completeDailyRun(dailyRunId, response);
    return Response.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    try {
      await failDailyRun(dailyRunId, message);
    } catch {
      // intentional swallow
    }

    try {
      await supabaseAdmin.from("attempts").insert({
        hour_number: null,
        post_type: "daily_summary_thread",
        text: "",
        status: "failed",
        error_message: message,
      });
    } catch {
      // intentional swallow
    }

    return Response.json({ error: message }, { status: 500 });
  }
}
