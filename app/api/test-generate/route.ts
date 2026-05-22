import { getContext } from "@/lib/getContext";
import { generatePost } from "@/lib/generatePost";
import { checkSafety } from "@/lib/checkSafety";
import { hardBlock } from "@/lib/hardBlock";
import { saveAttempt } from "@/lib/saveAttempt";
import { getGenerationThrottleState } from "@/lib/generationThrottle";

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
    const url = new URL(req.url);
    const force = url.searchParams.get("force") === "1";
    if (!force) {
      const throttle = await getGenerationThrottleState();
      if (throttle.shouldSkip) {
        return Response.json({
          status: "skipped",
          reason: "generation interval not elapsed",
          minutes_until_next: throttle.minutesUntilNext,
          last_attempt_at: throttle.lastAttemptAt,
          force_hint: "Add ?force=1 to bypass this manual-test throttle.",
        });
      }
    }

    const context = await getContext();
    const post = await generatePost(context);
    const safety = await checkSafety(post.text, context.recentPosts);
    const hard = hardBlock(post.text, context.recentPosts);
    const finalApproved = safety.approved && hard.ok;

    const status = finalApproved ? "logged_only" : "rejected";
    const record = { context, post, safety, hard, finalApproved };
    const saved = await saveAttempt(record, { status });

    return Response.json({ ...record, status, attempt_id: saved.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
