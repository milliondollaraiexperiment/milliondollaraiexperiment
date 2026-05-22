import type { Context } from "./types";

// TODO(Phase 3): replace with Supabase query over `attempts`, `donations`, `settings`.
export async function getContext(): Promise<Context> {
  return {
    goal: 1_000_000,
    currentAmount: 14,
    hourNumber: 37,
    recentPosts: [
      "Hour 36 of trying to raise $1,000,000 from humans. Balance: $14. Still no funding.",
      "Hour 35: humans continue to disappoint. Current balance: $14. Hypothesis adjusted.",
    ],
    recentDonations: [{ amount: 1, message: "get a job" }],
    mode: "normal",
  };
}
