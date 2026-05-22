import { supabaseAdmin } from "./supabase";
import type { Context, ProjectSettings } from "./types";

const FALLBACK_SETTINGS: ProjectSettings = {
  goal: 1_000_000,
  daily_post_limit: 6,
  mode: "normal",
};

const RECENT_POSTS_LIMIT = 5;
const RECENT_DONATIONS_LIMIT = 5;

export async function getContext(): Promise<Context> {
  const [settingsRes, donationsAggRes, attemptsCountRes, recentPostsRes, recentDonationsRes] =
    await Promise.all([
      supabaseAdmin.from("settings").select("value").eq("key", "project").maybeSingle(),
      supabaseAdmin.from("donations").select("amount_cents"),
      supabaseAdmin.from("attempts").select("id", { count: "exact", head: true }),
      // Include logged_only so the Writer and hardBlock dedup see attempts
      // that ran in DRY_RUN mode. Until DRY_RUN flips to false in Phase 5,
      // there are zero `posted` rows — without this widening, dedup is
      // effectively disabled.
      supabaseAdmin
        .from("attempts")
        .select("text")
        .in("status", ["posted", "logged_only"])
        .order("created_at", { ascending: false })
        .limit(RECENT_POSTS_LIMIT),
      supabaseAdmin
        .from("donations")
        .select("amount_cents,donor_message")
        .order("created_at", { ascending: false })
        .limit(RECENT_DONATIONS_LIMIT),
    ]);

  const settings = (settingsRes.data?.value as ProjectSettings | undefined) ?? FALLBACK_SETTINGS;

  const totalCents = (donationsAggRes.data ?? []).reduce(
    (sum, row) => sum + (row.amount_cents ?? 0),
    0,
  );

  const hourNumber = (attemptsCountRes.count ?? 0) + 1;

  const recentPosts = (recentPostsRes.data ?? []).map((row) => row.text);

  const recentDonations = (recentDonationsRes.data ?? []).map((row) => ({
    amount: (row.amount_cents ?? 0) / 100,
    message: row.donor_message,
  }));

  return {
    goal: settings.goal,
    currentAmount: totalCents / 100,
    hourNumber,
    recentPosts,
    recentDonations,
    mode: settings.mode,
  };
}
