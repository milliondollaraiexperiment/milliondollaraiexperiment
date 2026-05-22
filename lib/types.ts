export type Context = {
  goal: number;
  currentAmount: number;
  hourNumber: number;
  recentPosts: string[];
  recentPostTypes: string[];
  recentDonations: { amount: number; message: string | null }[];
  strategy: StrategyRecord | null;
  mode: ProjectMode;
};

export type PostCandidate = {
  post_type: string;
  text: string;
  public_strategy_note: string;
};

export type ThreadCandidate = {
  post_type: string;
  posts: string[];
  public_strategy_note: string;
};

export type StrategyRecord = {
  id?: string;
  summary: string;
  preferred_formats: string[];
  forced_format: string | null;
  banned_angles: string[];
  rewrite_guidance: string;
  top_reject_reasons: string[];
  target_posts_today: number | null;
  posting_windows_utc: string[];
  min_post_interval_minutes: number | null;
  direct_ask_cadence_hours: number | null;
  keyword_focus: string[];
  hashtag_policy: string;
  link_policy: string;
  model: string | null;
  raw_metrics?: Record<string, unknown>;
  created_at?: string;
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

export type AttemptStatus = "posted" | "rejected" | "logged_only" | "failed";

export type AttemptRecord = {
  context: Context;
  post: PostCandidate;
  safety: SafetyResult;
  hard: HardBlockResult;
  finalApproved: boolean;
};

export type ProjectMode = "normal" | "completed";

export type ProjectSettings = {
  goal: number;
  daily_post_limit: number;
  mode: ProjectMode;
  started_at?: string | null;
  completed_at?: string | null;
  final_post_sent?: boolean;
};
