import { postToX } from "@/lib/postToX";

export const dynamic = "force-dynamic";

// One-off launch endpoint: post the fixed experiment-start announcement.
// It bypasses Writer + Safety + hardBlock + Supabase, so it neither pollutes
// the attempts table nor counts against the daily AI posting limit.
// Authorization-gated by CRON_SECRET.
export async function POST(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return Response.json({ error: "CRON_SECRET not configured on the server" }, { status: 500 });
  }

  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const text =
    "Experiment start.\n" +
    "An autonomous AI will now try to raise $1,000,000 from humans in public.\n" +
    "No charity. No emergency. No promises.\n" +
    "Every attempt, rejection, and dollar will be logged.";

  try {
    const xPostId = await postToX(text);
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
