import { getContext } from "@/lib/getContext";
import { generatePost } from "@/lib/generatePost";
import { checkSafety } from "@/lib/checkSafety";
import { hardBlock } from "@/lib/hardBlock";
import { saveAttempt } from "@/lib/saveAttempt";
import { getTodayPostedCount, getDailyPostLimit } from "@/lib/rateLimit";
import { postToX } from "@/lib/postToX";
import { supabaseAdmin } from "@/lib/supabase";
import { getGenerationThrottleState } from "@/lib/generationThrottle";
import { isWithinPostingWindows } from "@/lib/postingWindows";
import { getCompletionState, markProjectCompleted } from "@/lib/projectState";
import type { AttemptStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

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

    const context = await getContext();
    const postingWindows = context.strategy?.posting_windows_utc ?? [];
    if (!isWithinPostingWindows(postingWindows)) {
      return Response.json({
        status: "skipped",
        reason: "outside strategy posting window",
        posting_windows_utc: postingWindows,
      });
    }

    const throttle = await getGenerationThrottleState(context.strategy?.min_post_interval_minutes);
    if (throttle.shouldSkip) {
      return Response.json({
        status: "skipped",
        reason: "generation interval not elapsed",
        min_post_interval_minutes:
          context.strategy?.min_post_interval_minutes ?? Number(process.env.GENERATION_MIN_INTERVAL_MINUTES ?? 60),
        minutes_until_next: throttle.minutesUntilNext,
        last_attempt_at: throttle.lastAttemptAt,
      });
    }

    const post = await generatePost(context);
    const safety = await checkSafety(post.text, context.recentPosts, context.strategy);
    const hard = hardBlock(post.text, context.recentPosts);

    const [todayPostedCount, dailyLimit] = await Promise.all([
      getTodayPostedCount(),
      getDailyPostLimit(),
    ]);
    const strategyTarget = context.strategy?.target_posts_today;
    const effectiveDailyLimit = strategyTarget
      ? Math.min(dailyLimit, strategyTarget)
      : dailyLimit;
    const underDailyLimit = todayPostedCount < effectiveDailyLimit;
    const dryRun = process.env.DRY_RUN === "true";
    const safe = safety.approved && hard.ok;

    let status: AttemptStatus;
    let xPostId: string | null = null;

    if (!safe) {
      status = "rejected";
    } else if (dryRun || !underDailyLimit) {
      status = "logged_only";
    } else {
      xPostId = await postToX(post.text);
      // postToX is a Phase 5 stub returning null. Only claim "posted"
      // when we actually got an id back.
      status = xPostId ? "posted" : "logged_only";
    }

    const saved = await saveAttempt(
      { context, post, safety, hard, finalApproved: safe },
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
