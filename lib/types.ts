export type Context = {
  goal: number;
  currentAmount: number;
  hourNumber: number;
  recentPosts: string[];
  recentPostTypes: string[];
  recentDonations: { amount: number; message: string | null }[];
  strategy: StrategyRecord | null;
  mode: ProjectMode;
  contributionsDisabled: boolean;
  learningDigest: LearningDigestRecord | null;
};

export type LearningDigestRecord = {
  id?: string;
  day_number: number;
  et_date: string;
  coverage_start: string;
  coverage_end: string;
  what_worked: string[];
  what_failed: string[];
  false_positive_or_bug_noise: string[];
  do_less_tomorrow: string[];
  do_more_tomorrow: string[];
  hard_avoid_next_24h: string[];
  writer_constraints_next_24h: string[];
  raw_metrics?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
};

export type PostCandidate = {
  post_type: string;
  text: string;
  public_strategy_note: string;
  writer_model?: string;
  writer_model_failures?: string[];
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
  phase: string;
  tone_guidance: string;
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

export type ProjectMode = "normal" | "paused" | "completed";

export type ProjectSettings = {
  goal: number;
  daily_post_limit: number;
  mode: ProjectMode;
  posting_paused?: boolean;
  cost_guard?: {
    enabled?: boolean;
    max_hourly_attempts_per_day?: number;
    max_failed_attempts_per_day?: number;
  };
  started_at?: string | null;
  completed_at?: string | null;
  final_post_sent?: boolean;
  contributions_disabled?: boolean;
};
