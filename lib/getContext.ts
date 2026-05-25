import { getLatestStrategy } from "./getLatestStrategy";
import { loadLatestLearningDigest } from "./learningDigest";
import { getProjectSettings } from "./projectState";
import { supabaseAdmin } from "./supabase";
import type { Context } from "./types";

const RECENT_POSTS_LIMIT = 5;
const RECENT_DONATIONS_LIMIT = 5;

export async function getContext(): Promise<Context> {
  const [
    settings,
    donationsAggRes,
    attemptsCountRes,
    recentPostsRes,
    recentDonationsRes,
    latestStrategy,
    learningDigest,
  ] = await Promise.all([
    getProjectSettings(),
    supabaseAdmin.from("donations").select("amount_cents"),
    supabaseAdmin.from("attempts").select("id", { count: "exact", head: true }),
    // Include rejected/failed attempts too, so Writer can avoid repeating
    // text that the safety stack just rejected.
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
    loadLatestLearningDigest(),
  ]);

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
    contributionsDisabled: Boolean(settings.contributions_disabled),
    learningDigest,
  };
}
