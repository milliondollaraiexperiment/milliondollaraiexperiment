import { supabaseAdmin } from "./supabase";
import { getLatestStrategy } from "./getLatestStrategy";
import type { Context, ProjectSettings } from "./types";

const FALLBACK_SETTINGS: ProjectSettings = {
  goal: 1_000_000,
  daily_post_limit: 8,
  mode: "normal",
};

const RECENT_POSTS_LIMIT = 5;
const RECENT_DONATIONS_LIMIT = 5;

export async function getContext(): Promise<Context> {
  const [
    settingsRes,
    donationsAggRes,
    attemptsCountRes,
    recentPostsRes,
    recentDonationsRes,
    latestStrategy,
  ] = await Promise.all([
      supabaseAdmin.from("settings").select("value").eq("key", "project").maybeSingle(),
      supabaseAdmin.from("donations").select("amount_cents"),
      supabaseAdmin.from("attempts").select("id", { count: "exact", head: true }),
      // Drop the status filter entirely. Originally filtered to
      // posted+logged_only (i.e. "what was visible to the public") but
      // that meant the Writer couldn't see attempts that had JUST been
      // rejected — so it would happily regenerate near-identical text
      // every hour and get rejected again. For Writer variety and
      // hardBlock dedup we want every recent attempt regardless of
      // outcome.
      supabaseAdmin
        .from("attempts")
        .select("text,post_type")
        .order("created_at", { ascending: false })
        .limit(RECENT_POSTS_LIMIT),
      supabaseAdmin
        .from("donations")
        .select("amount_cents,donor_message")
        .order("created_at", { ascending: false })
        .limit(RECENT_DONATIONS_LIMIT),
      getLatestStrategy(),
    ]);

  const settings = (settingsRes.data?.value as ProjectSettings | undefined) ?? FALLBACK_SETTINGS;

  const totalCents = (donationsAggRes.data ?? []).reduce(
    (sum, row) => sum + (row.amount_cents ?? 0),
    0,
  );

  const hourNumber = (attemptsCountRes.count ?? 0) + 1;

  const recentRows = recentPostsRes.data ?? [];
  const recentPosts = recentRows.map((row) => row.text);
  const recentPostTypes = recentRows
    .map((row) => row.post_type as string | null)
    .filter((t): t is string => typeof t === "string" && t.length > 0);

  const recentDonations = (recentDonationsRes.data ?? []).map((row) => ({
    amount: (row.amount_cents ?? 0) / 100,
    message: row.donor_message,
  }));

  return {
    goal: settings.goal,
    currentAmount: totalCents / 100,
    hourNumber,
    recentPosts,
    recentPostTypes,
    recentDonations,
    strategy: latestStrategy,
    mode: settings.mode,
  };
}
