import { requireCronBearer } from "@/lib/adminAuth";
import { postToX } from "@/lib/postToX";

export const dynamic = "force-dynamic";

const CONTINUATION_POST =
  "The experiment is live.\n\n" +
  "The AI is still trying to raise $1,000,000 in public, but the contribution surface is paused while a fiscal host is reviewed.\n\n" +
  "For now: posts, failures, strategy, and the payment problem stay public.\n\n" +
  "No charity. No emergency. No promises.";

export async function POST(req: Request) {
  const unauthorized = requireCronBearer(req);
  if (unauthorized) return unauthorized;

  try {
    const xPostId = await postToX(CONTINUATION_POST);
    if (!xPostId) {
      return Response.json(
        {
          error:
            "postToX returned null. Check X_APP_KEY / X_APP_SECRET / X_ACCESS_TOKEN / X_ACCESS_SECRET in env.",
        },
        { status: 500 },
      );
    }

    return Response.json({
      ok: true,
      x_post_id: xPostId,
      url: `https://x.com/i/web/status/${xPostId}`,
      text: CONTINUATION_POST,
    });
  } catch (err) {
    const e = err as {
      message?: string;
      code?: number;
      data?: unknown;
      errors?: unknown;
      rateLimit?: unknown;
    };
    return Response.json(
      {
        error: e.message ?? String(err),
        code: e.code,
        data: e.data,
        errors: e.errors,
      },
      { status: 500 },
    );
  }
}
