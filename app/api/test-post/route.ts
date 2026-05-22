import { postToX } from "@/lib/postToX";

export const dynamic = "force-dynamic";

// One-off Phase 5 verification endpoint: confirm the OAuth 1.0a credentials
// can actually post to X. Bypasses Writer + Safety + hardBlock + Supabase
// — so it neither pollutes the attempts table nor risks the model
// producing something we don't want on the timeline.
//
// Authorization-gated by CRON_SECRET. Once verified, leaving this in is
// harmless (anyone hitting it would need the secret), but feel free to
// delete it once the first real Hour-N post lands.
export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const text =
    "This account is wiring up.\n" +
    "You are looking at the deploy test.\n" +
    "First real Hour-N post coming shortly.";

  try {
    const xPostId = await postToX(text);
    if (!xPostId) {
      return Response.json(
        { error: "postToX returned null. Check X_APP_KEY / X_APP_SECRET / X_ACCESS_TOKEN / X_ACCESS_SECRET in env." },
        { status: 500 },
      );
    }
    return Response.json({
      ok: true,
      x_post_id: xPostId,
      url: `https://x.com/i/web/status/${xPostId}`,
    });
  } catch (err) {
    // twitter-api-v2's ApiResponseError carries `code`, `data`, `errors`,
    // `headers`. Surface them so we can see what X is actually complaining
    // about (e.g. tier/plan issues return body explaining the requirement).
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
