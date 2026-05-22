import { postToX } from "@/lib/postToX";
import { supabaseAdmin } from "@/lib/supabase";
import type { ProjectSettings } from "@/lib/types";

export const dynamic = "force-dynamic";

const FALLBACK_SETTINGS: ProjectSettings = {
  goal: 1_000_000,
  daily_post_limit: 8,
  mode: "normal",
  started_at: null,
};

async function markExperimentStarted() {
  const { data, error } = await supabaseAdmin
    .from("settings")
    .select("value")
    .eq("key", "project")
    .maybeSingle();

  if (error) {
    throw new Error(`markExperimentStarted read failed: ${error.message}`);
  }

  const current = (data?.value as ProjectSettings | undefined) ?? FALLBACK_SETTINGS;
  const next: ProjectSettings = {
    ...FALLBACK_SETTINGS,
    ...current,
    started_at: new Date().toISOString(),
  };

  const { error: upsertError } = await supabaseAdmin
    .from("settings")
    .upsert({ key: "project", value: next }, { onConflict: "key" });

  if (upsertError) {
    throw new Error(`markExperimentStarted write failed: ${upsertError.message}`);
  }
  return next.started_at;
}

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
    const startedAt = await markExperimentStarted();
    return Response.json({
      ok: true,
      x_post_id: xPostId,
      url: `https://x.com/i/web/status/${xPostId}`,
      started_at: startedAt,
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
