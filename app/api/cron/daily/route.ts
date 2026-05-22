import { checkSafety } from "@/lib/checkSafety";
import { generateDailyReportThread } from "@/lib/generateDailyReportThread";
import { generateAndSaveStrategy } from "@/lib/generateStrategy";
import { getContext } from "@/lib/getContext";
import { getDailyReportContext } from "@/lib/getDailyReportContext";
import { hardBlock } from "@/lib/hardBlock";
import { postThreadToX } from "@/lib/postToX";
import { getDailyPostLimit, getTodayPostedCount } from "@/lib/rateLimit";
import { supabaseAdmin } from "@/lib/supabase";
import type { AttemptStatus, HardBlockResult, SafetyResult } from "@/lib/types";

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
    let strategyId: string | null = null;
    try {
      const strategy = await generateAndSaveStrategy();
      strategyId = strategy?.id ?? null;
    } catch {
      // Strategy improves the next writer run, but it must not block the
      // daily public report or the safety pipeline.
    }

    const [dailyContext, context, todayPostedCount, dailyLimit] = await Promise.all([
      getDailyReportContext(),
      getContext(),
      getTodayPostedCount(),
      getDailyPostLimit(),
    ]);
    const thread = await generateDailyReportThread(dailyContext);

    const safetyResults: SafetyResult[] = [];
    const hardResults: HardBlockResult[] = [];
    const previousTexts = [...context.recentPosts];
    for (const post of thread.posts) {
      const safety = await checkSafety(post, previousTexts);
      const hard = hardBlock(post, previousTexts);
      safetyResults.push(safety);
      hardResults.push(hard);
      previousTexts.unshift(post);
    }

    const safety = combineSafety(safetyResults);
    const hard = combineHardBlocks(hardResults);
    const safe = safety.approved && hard.ok;
    const dryRun = process.env.DRY_RUN === "true";
    const underDailyLimit = todayPostedCount + thread.posts.length <= dailyLimit;

    let status: AttemptStatus;
    let xPostId: string | null = null;

    if (!safe) {
      status = "rejected";
    } else if (dryRun || !underDailyLimit) {
      status = "logged_only";
    } else {
      const ids = await postThreadToX(thread.posts);
      status = ids?.length ? "posted" : "logged_only";
      xPostId = ids?.join(",") ?? null;
    }

    const { data, error } = await supabaseAdmin
      .from("attempts")
      .insert({
        hour_number: context.hourNumber,
        post_type: thread.post_type,
        text: thread.posts.join("\n\n---\n\n"),
        status,
        safety_score: safety.risk_score,
        safety_reasons: safety.reasons,
        hard_block_reason: hard.ok ? null : hard.reason,
        x_post_id: xPostId,
        public_strategy_note: thread.public_strategy_note,
        error_message: null,
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(`daily report insert failed: ${error.message}`);
    }

    return Response.json({
      status,
      attempt_id: data.id,
      posts: thread.posts.length,
      today_posted_count: todayPostedCount,
      daily_limit: dailyLimit,
      dry_run: dryRun,
      strategy_id: strategyId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    try {
      await supabaseAdmin.from("attempts").insert({
        hour_number: null,
        post_type: "daily_report_thread",
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
