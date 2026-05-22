import { getContext } from "@/lib/getContext";
import { generatePost } from "@/lib/generatePost";
import { checkSafety } from "@/lib/checkSafety";
import { hardBlock } from "@/lib/hardBlock";
import { saveAttempt } from "@/lib/saveAttempt";
import { getTodayPostedCount, getDailyPostLimit } from "@/lib/rateLimit";
import { postToX } from "@/lib/postToX";
import { supabaseAdmin } from "@/lib/supabase";
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
    const context = await getContext();
    const post = await generatePost(context);
    const safety = await checkSafety(post.text, context.recentPosts);
    const hard = hardBlock(post.text, context.recentPosts);

    const [todayPostedCount, dailyLimit] = await Promise.all([
      getTodayPostedCount(),
      getDailyPostLimit(),
    ]);
    const underDailyLimit = todayPostedCount < dailyLimit;
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
      daily_limit: dailyLimit,
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
