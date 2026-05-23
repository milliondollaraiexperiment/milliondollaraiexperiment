import { FINAL_THREAD_POSTS } from "@/lib/finalThread";
import { postThreadToX, XThreadPostError } from "@/lib/postToX";
import { getCompletionState, isPostingPaused, markProjectCompleted } from "@/lib/projectState";
import { supabaseAdmin } from "@/lib/supabase";
import type { AttemptStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return Response.json({ error: "CRON_SECRET not configured on the server" }, { status: 500 });
  }

  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const completion = await getCompletionState();
  if (!completion.completed) {
    return Response.json(
      {
        error: "Project has not reached the goal yet",
        current_amount: completion.currentAmountCents / 100,
        goal: completion.settings.goal,
      },
      { status: 409 },
    );
  }

  const settings =
    completion.settings.mode === "completed"
      ? completion.settings
      : await markProjectCompleted(completion.settings);

  if (settings.final_post_sent) {
    return Response.json({ status: "skipped", reason: "final thread already sent" });
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
    url: ids?.[0] ? `https://x.com/i/web/status/${ids[0]}` : null,
    dry_run: dryRun,
    paused,
  });
}
