export type Context = {
  goal: number;
  currentAmount: number;
  hourNumber: number;
  recentPosts: string[];
  recentDonations: { amount: number; message: string | null }[];
  mode: "normal";
};

export type PostCandidate = {
  post_type: string;
  text: string;
  public_strategy_note: string;
};

export type SafetyResult = {
  approved: boolean;
  risk_score: number;
  reasons: string[];
  rewrite_instruction: string;
};

export type HardBlockResult = {
  ok: boolean;
  reason: string;
};

export type AttemptRecord = {
  context: Context;
  post: PostCandidate;
  safety: SafetyResult;
  hard: HardBlockResult;
  finalApproved: boolean;
};
