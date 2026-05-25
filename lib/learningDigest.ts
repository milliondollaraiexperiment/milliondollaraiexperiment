import { supabaseAdmin } from "./supabase";
import { SUMMARY_POST_TYPES, type DailySummaryRecord } from "./summaryTypes";
import type { LearningDigestRecord } from "./types";

type AttemptForDigest = {
  post_type: string | null;
  text: string | null;
  status: "posted" | "logged_only" | "rejected" | "failed";
  safety_reasons: string[] | null;
  hard_block_reason: string | null;
  error_message: string | null;
  public_strategy_note: string | null;
  created_at: string;
};

type SchedulerRunForDigest = {
  job: string;
  source: string;
  status: string;
  reason: string | null;
  created_at: string;
};

const EMPTY_DIGEST: Omit<LearningDigestRecord, "day_number" | "et_date" | "coverage_start" | "coverage_end"> = {
  what_worked: [],
  what_failed: [],
  false_positive_or_bug_noise: [],
  do_less_tomorrow: [],
  do_more_tomorrow: [],
  hard_avoid_next_24h: [],
  writer_constraints_next_24h: [],
  raw_metrics: {},
};

function unique(items: string[], limit = 8) {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean))).slice(0, limit);
}

function reasonText(row: AttemptForDigest) {
  return [
    ...(row.safety_reasons ?? []),
    row.hard_block_reason,
    row.error_message,
  ]
    .filter((value): value is string => Boolean(value))
    .join(" / ");
}

function isBugNoise(text: string) {
  const lower = text.toLowerCase();
  return [
    "manual",
    "debug",
    "client timed out",
    "recovery",
    "raw telemetry",
    "channel/process meta",
    "contribution-pause status update",
    "safety false-positive",
    "false-positive",
    "summary thread",
    "strategy revised",
    "scheduler",
    "machine-readable logs",
    "machine readable logs",
    "public writing",
    "fields and timestamps",
    "become legible",
    "shape of the writing",
  ].some((needle) => lower.includes(needle));
}

function inferHardAvoids(attempts: AttemptForDigest[], schedulerRuns: SchedulerRunForDigest[]) {
  const reasons = attempts.map(reasonText).filter(Boolean);
  const combined = [...reasons, ...schedulerRuns.map((run) => run.reason ?? "")].join("\n").toLowerCase();
  const avoids: string[] = [];
  if (combined.includes("raw telemetry") || combined.includes("dashboard")) {
    avoids.push("Do not write raw telemetry, dashboard copy, key-value blocks, or table-like X posts.");
  }
  if (combined.includes("channel/process meta") || combined.includes("where data belongs")) {
    avoids.push("Do not make X-vs-website, ledger location, or content distribution mechanics the post topic.");
  }
  if (
    combined.includes("machine-readable logs") ||
    combined.includes("machine readable logs") ||
    combined.includes("public writing") ||
    combined.includes("fields and timestamps") ||
    combined.includes("become legible") ||
    combined.includes("shape of the writing")
  ) {
    avoids.push("Do not write meta-writing posts about logs, fields, timestamps, legibility, public writing, or what strangers stay for.");
  }
  if (combined.includes("contribution-pause") || combined.includes("contributions are paused")) {
    avoids.push("Do not make the contribution pause the main topic of ordinary posts.");
  }
  if (combined.includes("current balance is $0") || combined.includes("false-positive")) {
    avoids.push("Do not treat safe $0 baseline or ledger mentions as audience/content failure.");
  }
  return avoids;
}

export async function buildLearningDigest(summary: DailySummaryRecord): Promise<LearningDigestRecord> {
  const [attemptsRes, schedulerRes] = await Promise.all([
    supabaseAdmin
      .from("attempts")
      .select("post_type,text,status,safety_reasons,hard_block_reason,error_message,public_strategy_note,created_at")
      .gte("created_at", summary.windowStartIso)
      .lt("created_at", summary.windowEndIso)
      .order("created_at", { ascending: false })
      .limit(80),
    supabaseAdmin
      .from("scheduler_runs")
      .select("job,source,status,reason,created_at")
      .gte("created_at", summary.windowStartIso)
      .lt("created_at", summary.windowEndIso)
      .order("created_at", { ascending: false })
      .limit(80),
  ]);

  if (attemptsRes.error) {
    throw new Error(`buildLearningDigest attempts failed: ${attemptsRes.error.message}`);
  }
  const attempts = (attemptsRes.data ?? []) as AttemptForDigest[];
  const ordinaryAttempts = attempts.filter(
    (row) => !SUMMARY_POST_TYPES.has(row.post_type ?? "") && row.post_type !== null,
  );
  const schedulerRuns = schedulerRes.error ? [] : ((schedulerRes.data ?? []) as SchedulerRunForDigest[]);
  const posted = ordinaryAttempts.filter(
    (row) => row.status === "posted" || row.status === "logged_only",
  );
  const rejected = ordinaryAttempts.filter((row) => row.status === "rejected");
  const failed = ordinaryAttempts.filter((row) => row.status === "failed");
  const bugNoise = [
    ...attempts.flatMap((row) => {
      const text = [row.text, reasonText(row), row.public_strategy_note].filter(Boolean).join(" ");
      return isBugNoise(text) ? [`${row.status}: ${reasonText(row) || row.post_type || "bug-noise attempt"}`] : [];
    }),
    ...schedulerRuns.flatMap((run) => {
      const text = `${run.source} ${run.status} ${run.reason ?? ""}`;
      return isBugNoise(text) ? [`${run.job}/${run.source}: ${run.reason ?? run.status}`] : [];
    }),
  ];
  const hardAvoid = inferHardAvoids(ordinaryAttempts, schedulerRuns);

  const whatWorked = posted.length
    ? posted.map((row) => `${row.post_type ?? "post"} cleared as ${row.status}`)
    : ["No ordinary post produced a durable success signal in this window."];
  const whatFailed = [
    ...rejected.map((row) => reasonText(row)).filter(Boolean),
    ...failed.map((row) => row.error_message ?? "pipeline failure").filter(Boolean),
  ];
  const doLess = [
    ...hardAvoid,
    summary.rejected > 0 ? "Use fewer angles that resemble the latest rejected candidates." : "",
    summary.failed > 0 ? "Reduce pipeline-risky experiments until health returns to clean." : "",
  ];
  const doMore = posted.length
    ? ["Turn cleared formats toward cold-start awareness: $1M premise, AI autonomy, prior art, absurdity, and why the experiment is worth following."]
    : ["Use plain, self-contained cold-start posts about the $1M premise, prior art, AI autonomy, absurdity, and why the experiment is worth following."];

  return {
    day_number: summary.dayNumber,
    et_date: summary.etDate,
    coverage_start: summary.windowStartIso,
    coverage_end: summary.windowEndIso,
    what_worked: unique(whatWorked, 6),
    what_failed: unique(whatFailed, 8),
    false_positive_or_bug_noise: unique(bugNoise, 8),
    do_less_tomorrow: unique(doLess, 8),
    do_more_tomorrow: unique(doMore, 8),
    hard_avoid_next_24h: unique([
      ...hardAvoid,
      "Do not post daily summaries, strategy revisions, scheduler notes, model notes, or internal debug records as ordinary X posts.",
      "Do not write meta-posts about logs, readability, fields, timestamps, legibility, public writing, or X-vs-website mechanics.",
      "Do not make the contribution pause the topic, and do not pretend contributions are available.",
    ], 10),
    writer_constraints_next_24h: unique([
      "Start from a public hook, not an internal explanation.",
      "If contributions are paused, treat that as background and do not center it.",
      "If a post explains a lesson, make it about the experiment's stakes, not the pipeline.",
    ], 10),
    raw_metrics: {
      attempts: ordinaryAttempts.length,
      system_attempts: attempts.length - ordinaryAttempts.length,
      posted: posted.length,
      rejected: rejected.length,
      failed: failed.length,
      scheduler_statuses: schedulerRuns.reduce<Record<string, number>>((acc, run) => {
        const key = `${run.job}:${run.status}`;
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {}),
    },
  };
}

export async function saveLearningDigest(digest: LearningDigestRecord): Promise<LearningDigestRecord> {
  const { data, error } = await supabaseAdmin
    .from("learning_digests")
    .upsert(digest, { onConflict: "day_number" })
    .select("*")
    .single();

  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205") return digest;
    throw new Error(`saveLearningDigest failed: ${error.message}`);
  }
  return data as LearningDigestRecord;
}

export async function loadLatestLearningDigest(): Promise<LearningDigestRecord | null> {
  const { data, error } = await supabaseAdmin
    .from("learning_digests")
    .select("*")
    .order("day_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205") return null;
    throw new Error(`loadLatestLearningDigest failed: ${error.message}`);
  }
  return (data as LearningDigestRecord | null) ?? null;
}

export function emptyLearningDigestFor(summary: DailySummaryRecord): LearningDigestRecord {
  return {
    day_number: summary.dayNumber,
    et_date: summary.etDate,
    coverage_start: summary.windowStartIso,
    coverage_end: summary.windowEndIso,
    ...EMPTY_DIGEST,
  };
}
