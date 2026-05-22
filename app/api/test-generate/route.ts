import { getContext } from "@/lib/getContext";
import { generatePost } from "@/lib/generatePost";
import { checkSafety } from "@/lib/checkSafety";
import { hardBlock } from "@/lib/hardBlock";
import { saveAttempt } from "@/lib/saveAttempt";

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
