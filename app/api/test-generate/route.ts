import { getContext } from "@/lib/getContext";
import { generatePost } from "@/lib/generatePost";
import { checkSafety } from "@/lib/checkSafety";
import { hardBlock } from "@/lib/hardBlock";
import { saveAttempt } from "@/lib/saveAttempt";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const context = await getContext();
    const post = await generatePost(context);
    const safety = await checkSafety(post.text, context.recentPosts);
    const hard = hardBlock(post.text, context.recentPosts);
    const finalApproved = safety.approved && hard.ok;

    const record = { context, post, safety, hard, finalApproved };
    await saveAttempt(record);

    return Response.json(record);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
