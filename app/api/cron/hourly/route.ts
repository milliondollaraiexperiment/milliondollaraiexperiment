import { getContext } from "@/lib/getContext";
import { generatePost, type PostRewriteFeedback } from "@/lib/generatePost";
import { checkSafety } from "@/lib/checkSafety";
import { hardBlock } from "@/lib/hardBlock";
import { saveAttempt } from "@/lib/saveAttempt";
import { getTodayPostedCount, getDailyPostLimit } from "@/lib/rateLimit";
import { postToX } from "@/lib/postToX";
import { supabaseAdmin } from "@/lib/supabase";
import { getGenerationThrottleState } from "@/lib/generationThrottle";
import { enforceCostGuard } from "@/lib/costGuard";
import { isWithinPostingWindows } from "@/lib/postingWindows";
import { getCompletionState, isPostingPaused, markProjectCompleted } from "@/lib/projectState";
import { autonomousPostingShutdownReason, recordAiFailure, recordAiSuccess } from "@/lib/aiHealth";
import {
  conservativeDailyLimit,
  conservativeIntervalMinutes,
  getStrategyHealth,
} from "@/lib/strategyHealth";
import type { AttemptRecord, AttemptStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const MAX_CANDIDATE_ATTEMPTS = 3;

function rejectionReason(record: AttemptRecord) {
  const reasons = [
    ...record.safety.reasons,
    record.safety.rewrite_instruction,
    record.hard.ok ? null : record.hard.reason,
  ].filter((reason): reason is string => Boolean(reason));

  return reasons.join(" / ") || "Candidate rejected by safety checks";
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

  try {
    const completion = await getCompletionState();
    if (completion.completed) {
      if (completion.settings.mode !== "completed") {
        await markProjectCompleted(completion.settings);
      }
      return Response.json({
        status: "skipped",
        reason: "project completed",
        current_amount: completion.currentAmountCents / 100,
        goal: completion.settings.goal,
      });
    }

    if (isPostingPaused(completion.settings)) {
      return Response.json({
        status: "skipped",
        reason: "autonomous posting paused",
        mode: completion.settings.mode,
      });
    }

    const costGuard = await enforceCostGuard(completion.settings);
    if (!costGuard.allowed) {
      return Response.json({
        status: "skipped",
        reason: costGuard.reason,
        hourly_attempts_today: costGuard.hourlyAttemptsToday,
        failed_attempts_today: costGuard.failedAttemptsToday,
      });
    }

    const shutdownReason = await autonomousPostingShutdownReason();
    if (shutdownReason) {
      return Response.json({
        status: "skipped",
        reason: shutdownReason,
      });
    }

    const context = await getContext();
    if (!context.strategy) {
      return Response.json({
        status: "skipped",
        reason: "waiting for Strategy AI",
      });
    }

    const strategyHealth = await getStrategyHealth();
    const postingWindows = context.strategy?.posting_windows_utc ?? [];
    if (!isWithinPostingWindows(postingWindows)) {
      return Response.json({
        status: "skipped",
        reason: "outside strategy posting window",
        posting_windows_utc: postingWindows,
      });
    }

    const minInterval = conservativeIntervalMinutes(
      strategyHealth,
      context.strategy?.min_post_interval_minutes,
    );
    const throttle = await getGenerationThrottleState(minInterval);
    if (throttle.shouldSkip) {
      return Response.json({
        status: "skipped",
        reason: "generation interval not elapsed",
        min_post_interval_minutes:
          minInterval,
        minutes_until_next: throttle.minutesUntilNext,
        last_attempt_at: throttle.lastAttemptAt,
      });
    }

    let finalRecord: AttemptRecord | null = null;
    let savedRejectedAttemptId: string | null = null;
    const rewriteFeedback: PostRewriteFeedback[] = [];

    for (let candidateAttempt = 1; candidateAttempt <= MAX_CANDIDATE_ATTEMPTS; candidateAttempt++) {
      let post;
      try {
        post = await generatePost(context, { rewriteFeedback });
        await recordAiSuccess("writer");
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await recordAiFailure("writer", message);
        rewriteFeedback.push({
          source: "writer",
          reason: message,
        });
        if (candidateAttempt === MAX_CANDIDATE_ATTEMPTS) {
          throw err;
        }
        continue;
      }

      let safety;
      try {
        safety = await checkSafety(post.text, context.recentPosts, context.strategy);
        await recordAiSuccess("safety");
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await recordAiFailure("safety", message);
        throw err;
      }
      const hard = hardBlock(post.text, context.recentPosts);
      const candidateRecord: AttemptRecord = {
        context,
        post,
        safety,
        hard,
        finalApproved: safety.approved && hard.ok,
      };

      if (candidateRecord.finalApproved) {
        finalRecord = candidateRecord;
        break;
      }

      const reason = rejectionReason(candidateRecord);
      const savedRejected = await saveAttempt(candidateRecord, {
        status: "rejected",
        xPostId: null,
        errorMessage:
          candidateAttempt < MAX_CANDIDATE_ATTEMPTS
            ? `Rejected before rewrite attempt ${candidateAttempt + 1}: ${reason}`
            : `Rejected after ${MAX_CANDIDATE_ATTEMPTS} candidate attempts: ${reason}`,
      });
      savedRejectedAttemptId = savedRejected.id;

      rewriteFeedback.push({
        source: safety.approved ? "hardBlock" : "safety",
        reason,
        post_type: post.post_type,
        text: post.text,
      });
    }

    const [todayPostedCount, dailyLimit] = await Promise.all([
      getTodayPostedCount(),
      getDailyPostLimit(),
    ]);
    const strategyTarget = context.strategy?.target_posts_today;
    const effectiveDailyLimit = strategyTarget
      ? conservativeDailyLimit(strategyHealth, Math.min(dailyLimit, strategyTarget))
      : conservativeDailyLimit(strategyHealth, dailyLimit);
    const underDailyLimit = todayPostedCount < effectiveDailyLimit;
    const dryRun = process.env.DRY_RUN === "true";

    if (!finalRecord) {
      return Response.json({
        status: "rejected",
        attempt_id: savedRejectedAttemptId,
        hour_number: context.hourNumber,
        candidate_attempts: rewriteFeedback.length,
        rewrite_reasons: rewriteFeedback.map((item) => item.reason),
        today_posted_count: todayPostedCount,
        daily_limit: effectiveDailyLimit,
        settings_daily_limit: dailyLimit,
        strategy_target_posts_today: strategyTarget ?? null,
        dry_run: dryRun,
      });
    }

    let status: AttemptStatus;
    let xPostId: string | null = null;

    if (dryRun || !underDailyLimit) {
      status = "logged_only";
    } else {
      xPostId = await postToX(finalRecord.post.text);
      // postToX is a Phase 5 stub returning null. Only claim "posted"
      // when we actually got an id back.
      status = xPostId ? "posted" : "logged_only";
    }

    const saved = await saveAttempt(
      finalRecord,
      { status, xPostId, errorMessage: null },
    );

    return Response.json({
      status,
      attempt_id: saved.id,
      hour_number: context.hourNumber,
      today_posted_count: todayPostedCount,
      daily_limit: effectiveDailyLimit,
      settings_daily_limit: dailyLimit,
      strategy_target_posts_today: strategyTarget ?? null,
      candidate_attempts: rewriteFeedback.length + 1,
      rewrite_reasons: rewriteFeedback.map((item) => item.reason),
      dry_run: dryRun,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    // Best-effort failure record. Swallow inner error so we still return 500.
    try {
      await supabaseAdmin.from("attempts").insert({
        hour_number: null,
        post_type: null,
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
