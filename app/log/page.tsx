import Link from "next/link";
import { AttemptCard } from "@/components/AttemptCard";
import { PageShell } from "@/components/site/PageShell";
import { formatPublicTimestamp } from "@/lib/formatPublicTimestamp";
import { hasSupabaseConfig, supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type LogType =
  | "all"
  | "ordinary_posts"
  | "strategies"
  | "daily_summaries"
  | "weekly_summaries"
  | "monthly_summaries"
  | "rejected"
  | "failed";

const VALID_TYPES: LogType[] = [
  "all",
  "ordinary_posts",
  "strategies",
  "daily_summaries",
  "weekly_summaries",
  "monthly_summaries",
  "rejected",
  "failed",
];

const TYPE_LABELS: Record<LogType, string> = {
  all: "All",
  ordinary_posts: "Ordinary posts",
  strategies: "Strategies",
  daily_summaries: "Daily summaries",
  weekly_summaries: "Weekly summaries",
  monthly_summaries: "Monthly summaries",
  rejected: "Rejected",
  failed: "Failed",
};

const PAGE_LIMIT = 100;
const SUMMARY_POST_TYPES = new Set([
  "daily_summary_thread",
  "weekly_summary_thread",
  "monthly_summary_thread",
  "final_report_thread",
]);

type AttemptRow = {
  id: string;
  hour_number: number | null;
  post_type: string | null;
  text: string;
  status: "posted" | "logged_only" | "rejected" | "failed";
  safety_reasons: string[] | null;
  hard_block_reason: string | null;
  public_strategy_note: string | null;
  error_message: string | null;
  created_at: string;
};

type StrategyRow = {
  id: string;
  summary: string;
  preferred_formats: string[] | null;
  forced_format: string | null;
  banned_angles: string[] | null;
  rewrite_guidance: string | null;
  top_reject_reasons: string[] | null;
  target_posts_today: number | null;
  posting_windows_utc: string[] | null;
  min_post_interval_minutes: number | null;
  direct_ask_cadence_hours: number | null;
  keyword_focus: string[] | null;
  hashtag_policy: string | null;
  link_policy: string | null;
  phase: string | null;
  tone_guidance: string | null;
  model: string | null;
  raw_metrics: Record<string, unknown> | null;
  created_at: string;
  run_day_number?: number | null;
  run_et_date?: string | null;
};

type DailyRunRow = {
  et_date: string;
  day_number: number;
  details: Record<string, unknown> | null;
};

type DailySummaryRow = {
  id: string;
  day_number: number;
  et_date: string;
  coverage_start: string;
  coverage_end: string;
  partial: boolean;
  attempts: number;
  posted: number;
  logged_only: number;
  rejected: number;
  failed: number;
  cleared_safety: number;
  donations_count: number;
  donations_gross_cents: number;
  current_balance_cents: number;
  top_reject_reasons: string[] | null;
  top_formats: string[] | null;
  lessons: string[] | null;
  public_thread: string[] | null;
  x_post_ids: string[] | null;
  created_at: string;
};

type PeriodSummaryRow = {
  id: string;
  period_type: "weekly" | "monthly";
  period_number: number;
  period_label: string;
  coverage_start: string;
  coverage_end: string;
  attempts: number;
  posted: number;
  logged_only: number;
  rejected: number;
  failed: number;
  donations_count: number;
  donations_gross_cents: number;
  current_balance_cents: number;
  lessons: string[] | null;
  public_thread: string[] | null;
  x_post_ids: string[] | null;
  created_at: string;
};

type TimelineItem =
  | { kind: "attempt"; created_at: string; data: AttemptRow }
  | { kind: "strategy"; created_at: string; data: StrategyRow }
  | { kind: "daily_summary"; created_at: string; data: DailySummaryRow }
  | { kind: "weekly_summary"; created_at: string; data: PeriodSummaryRow }
  | { kind: "monthly_summary"; created_at: string; data: PeriodSummaryRow };

function normalizeType(
  typeRaw: string | string[] | undefined,
  statusRaw: string | string[] | undefined,
): LogType {
  const rawType = Array.isArray(typeRaw) ? typeRaw[0] : typeRaw;
  if (rawType && (VALID_TYPES as string[]).includes(rawType)) return rawType as LogType;

  const rawStatus = Array.isArray(statusRaw) ? statusRaw[0] : statusRaw;
  if (rawStatus && (VALID_TYPES as string[]).includes(rawStatus)) return rawStatus as LogType;
  if (rawStatus === "visible" || rawStatus === "posted" || rawStatus === "logged_only") {
    return "ordinary_posts";
  }
  if (rawStatus === "rejected") return "rejected";
  if (rawStatus === "failed") return "failed";

  return "all";
}

function isOrdinaryAttempt(row: AttemptRow) {
  return !SUMMARY_POST_TYPES.has(row.post_type ?? "");
}

function shouldIncludeAttempt(row: AttemptRow, type: LogType) {
  if (!isOrdinaryAttempt(row)) return false;
  if (type === "all") return true;
  if (type === "ordinary_posts") return row.status === "posted" || row.status === "logged_only";
  if (type === "rejected") return row.status === "rejected";
  if (type === "failed") return row.status === "failed";
  return false;
}

async function loadLogItems(type: LogType) {
  if (!hasSupabaseConfig) return [];

  const [attemptsRes, strategiesRes, dailyRes, periodRes, dailyRunsRes] = await Promise.all([
    supabaseAdmin
      .from("attempts")
      .select(
        "id,hour_number,post_type,text,status,safety_reasons,hard_block_reason,public_strategy_note,error_message,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(PAGE_LIMIT),
    supabaseAdmin
      .from("strategies")
      .select(
        "id,summary,preferred_formats,forced_format,banned_angles,rewrite_guidance,top_reject_reasons,target_posts_today,posting_windows_utc,min_post_interval_minutes,direct_ask_cadence_hours,keyword_focus,hashtag_policy,link_policy,phase,tone_guidance,model,raw_metrics,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(PAGE_LIMIT),
    supabaseAdmin
      .from("daily_summaries")
      .select(
        "id,day_number,et_date,coverage_start,coverage_end,partial,attempts,posted,logged_only,rejected,failed,cleared_safety,donations_count,donations_gross_cents,current_balance_cents,top_reject_reasons,top_formats,lessons,public_thread,x_post_ids,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(PAGE_LIMIT),
    supabaseAdmin
      .from("period_summaries")
      .select(
        "id,period_type,period_number,period_label,coverage_start,coverage_end,attempts,posted,logged_only,rejected,failed,donations_count,donations_gross_cents,current_balance_cents,lessons,public_thread,x_post_ids,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(PAGE_LIMIT),
    supabaseAdmin
      .from("daily_runs")
      .select("et_date,day_number,details")
      .order("created_at", { ascending: false })
      .limit(PAGE_LIMIT),
  ]);

  const attempts = ((attemptsRes.data ?? []) as AttemptRow[])
    .filter((row) => shouldIncludeAttempt(row, type))
    .map((row): TimelineItem => ({ kind: "attempt", created_at: row.created_at, data: row }));

  const strategyRunById = new Map<string, DailyRunRow>();
  ((dailyRunsRes.data ?? []) as DailyRunRow[]).forEach((run) => {
    const strategyId = run.details?.strategy_id;
    if (typeof strategyId === "string") {
      strategyRunById.set(strategyId, run);
    }
  });

  const latestStrategyByRunDate = new Map<string, StrategyRow>();
  ((strategiesRes.data ?? []) as StrategyRow[]).forEach((row) => {
    const run = strategyRunById.get(row.id);
    const runDate = run?.et_date ?? row.created_at.slice(0, 10);
    const decorated = {
      ...row,
      run_day_number: run?.day_number ?? null,
      run_et_date: run?.et_date ?? null,
    };
    const existing = latestStrategyByRunDate.get(runDate);
    if (!existing || new Date(decorated.created_at) > new Date(existing.created_at)) {
      latestStrategyByRunDate.set(runDate, decorated);
    }
  });

  const strategies =
    type === "all" || type === "strategies"
      ? Array.from(latestStrategyByRunDate.values()).map(
          (row): TimelineItem => ({ kind: "strategy", created_at: row.created_at, data: row }),
        )
      : [];

  const dailySummaries =
    type === "all" || type === "daily_summaries"
      ? ((dailyRes.data ?? []) as DailySummaryRow[]).map(
          (row): TimelineItem => ({
            kind: "daily_summary",
            created_at: row.created_at,
            data: row,
          }),
        )
      : [];

  const periodRows = (periodRes.data ?? []) as PeriodSummaryRow[];
  const weeklySummaries =
    type === "all" || type === "weekly_summaries"
      ? periodRows
          .filter((row) => row.period_type === "weekly")
          .map(
            (row): TimelineItem => ({
              kind: "weekly_summary",
              created_at: row.created_at,
              data: row,
            }),
          )
      : [];
  const monthlySummaries =
    type === "all" || type === "monthly_summaries"
      ? periodRows
          .filter((row) => row.period_type === "monthly")
          .map(
            (row): TimelineItem => ({
              kind: "monthly_summary",
              created_at: row.created_at,
              data: row,
            }),
          )
      : [];

  return [...attempts, ...strategies, ...dailySummaries, ...weeklySummaries, ...monthlySummaries]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, PAGE_LIMIT);
}

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-md bg-zinc-50 px-3 py-2 dark:bg-zinc-900/70">
      <p className="font-mono text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
        {value}
      </p>
      <p className="mt-1 text-[10px] uppercase tracking-wider text-zinc-500">{label}</p>
    </div>
  );
}

function PillList({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {items.slice(0, 8).map((item) => (
        <span
          key={item}
          className="max-w-full break-words rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 [overflow-wrap:anywhere] dark:bg-zinc-900 dark:text-zinc-400"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function strategyLearningDigest(row: StrategyRow) {
  const raw = row.raw_metrics?.learning_digest;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as {
    do_more_tomorrow?: string[];
    hard_avoid_next_24h?: string[];
    writer_constraints_next_24h?: string[];
  };
}

function StrategyCard({ row }: { row: StrategyRow }) {
  const formats = [
    ...(row.forced_format ? [`forced: ${row.forced_format}`] : []),
    ...(row.preferred_formats ?? []).map((format) => `prefer: ${format}`),
  ];
  const learningDigest = strategyLearningDigest(row);

  return (
    <article
      id={`strategy-${row.id}`}
      className="scroll-mt-6 rounded-md border border-blue-200 bg-blue-50/50 p-4 shadow-sm dark:border-blue-950 dark:bg-blue-950/20"
    >
      <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-blue-700 dark:text-blue-300">
            Strategy update
            {row.run_day_number ? ` / Day ${row.run_day_number}` : ""}
          </p>
          {row.run_et_date && (
            <p className="mt-1 font-mono text-xs text-blue-700/80 dark:text-blue-300/80">
              UTC experiment day: {row.run_et_date}
            </p>
          )}
          <time dateTime={row.created_at} className="font-mono text-xs text-zinc-500">
            Generated {formatPublicTimestamp(row.created_at)}
          </time>
        </div>
        <span className="w-fit rounded bg-blue-100 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-blue-700 dark:bg-blue-950 dark:text-blue-300">
          {row.model ?? "model unknown"}
        </span>
      </header>

      <p className="mt-3 text-sm leading-7 text-zinc-800 dark:text-zinc-200">{row.summary}</p>

      {row.rewrite_guidance && (
        <p className="mt-3 text-xs italic leading-5 text-zinc-600 dark:text-zinc-400">
          {row.rewrite_guidance}
        </p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric label="target posts" value={row.target_posts_today ?? "unknown"} />
        <Metric label="min interval" value={`${row.min_post_interval_minutes ?? 0}m`} />
        <Metric label="direct ask" value={`${row.direct_ask_cadence_hours ?? 0}h`} />
        <Metric label="phase" value={row.phase || "unknown"} />
      </div>

      {(row.posting_windows_utc?.length ?? 0) > 0 && (
        <div className="mt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Posting windows
          </p>
          <PillList items={(row.posting_windows_utc ?? []).map((window) => `${window} UTC`)} />
        </div>
      )}

      {row.tone_guidance && (
        <p className="mt-4 text-[11px] leading-5 text-zinc-500">Tone: {row.tone_guidance}</p>
      )}
      {learningDigest && (
        <div className="mt-4 grid gap-3 border-t border-blue-200/70 pt-4 sm:grid-cols-3 dark:border-blue-950">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              What changed today
            </p>
            <PillList items={learningDigest.do_more_tomorrow ?? []} />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Avoiding today
            </p>
            <PillList items={learningDigest.hard_avoid_next_24h ?? []} />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Writer constraints
            </p>
            <PillList items={learningDigest.writer_constraints_next_24h ?? []} />
          </div>
        </div>
      )}
      {(row.hashtag_policy || row.link_policy) && (
        <div className="mt-3 space-y-1 text-[11px] leading-5 text-zinc-500">
          {row.hashtag_policy && <p>Hashtag policy: {row.hashtag_policy}</p>}
          {row.link_policy && <p>Link policy: {row.link_policy}</p>}
        </div>
      )}

      {formats.length > 0 && (
        <div className="mt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Writer formats
          </p>
          <PillList items={formats} />
        </div>
      )}
      {(row.keyword_focus?.length ?? 0) > 0 && (
        <div className="mt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Discovery focus
          </p>
          <PillList items={row.keyword_focus ?? []} />
        </div>
      )}
      {(row.top_reject_reasons?.length ?? 0) > 0 && (
        <div className="mt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Rejection signals
          </p>
          <PillList items={row.top_reject_reasons ?? []} />
        </div>
      )}
      {(row.banned_angles?.length ?? 0) > 0 && (
        <div className="mt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Avoiding
          </p>
          <PillList items={row.banned_angles ?? []} />
        </div>
      )}
    </article>
  );
}

function SummaryThread({ posts }: { posts: string[] }) {
  if (posts.length === 0) return null;
  return (
    <div className="mt-4 space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
        Public thread archive
      </p>
      {posts.slice(0, 6).map((post, index) => (
        <p
          key={`${index}-${post.slice(0, 24)}`}
          className="whitespace-pre-wrap rounded-md bg-white/70 p-3 font-mono text-xs leading-5 text-zinc-700 [overflow-wrap:anywhere] dark:bg-zinc-950/70 dark:text-zinc-300"
        >
          {post}
        </p>
      ))}
    </div>
  );
}

function DailySummaryCard({ row }: { row: DailySummaryRow }) {
  return (
    <article
      id={`daily-summary-${row.id}`}
      className="scroll-mt-6 rounded-md border border-zinc-300 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
    >
      <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">
            Daily summary / Day {row.day_number}
          </p>
          <time dateTime={row.created_at} className="font-mono text-xs text-zinc-500">
            {formatPublicTimestamp(row.created_at)}
          </time>
        </div>
        <span className="w-fit rounded bg-zinc-100 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
          {row.partial ? "partial" : "completed"}
        </span>
      </header>
      <p className="mt-3 font-mono text-[11px] leading-5 text-zinc-500">
        Coverage: {formatPublicTimestamp(row.coverage_start)} to{" "}
        {formatPublicTimestamp(row.coverage_end)}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric label="attempts" value={row.attempts} />
        <Metric label="posted" value={row.posted + row.logged_only} />
        <Metric label="rejected" value={row.rejected} />
        <Metric label="failed" value={row.failed} />
        <Metric label="donations" value={row.donations_count} />
        <Metric label="gross" value={formatUsd(row.donations_gross_cents)} />
        <Metric label="balance" value={formatUsd(row.current_balance_cents)} />
        <Metric label="cleared" value={row.cleared_safety} />
      </div>
      <PillList items={row.lessons ?? []} />
      {(row.top_reject_reasons?.length ?? 0) > 0 && (
        <div className="mt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Top rejection reasons
          </p>
          <PillList items={row.top_reject_reasons ?? []} />
        </div>
      )}
      {(row.top_formats?.length ?? 0) > 0 && (
        <div className="mt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Top formats
          </p>
          <PillList items={row.top_formats ?? []} />
        </div>
      )}
      <SummaryThread posts={row.public_thread ?? []} />
    </article>
  );
}

function PeriodSummaryCard({ row }: { row: PeriodSummaryRow }) {
  const label = row.period_type === "weekly" ? "Weekly summary" : "Monthly summary";

  return (
    <article
      id={`period-summary-${row.id}`}
      className="scroll-mt-6 rounded-md border border-zinc-300 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
    >
      <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">
            {label} / {row.period_label}
          </p>
          <time dateTime={row.created_at} className="font-mono text-xs text-zinc-500">
            {formatPublicTimestamp(row.created_at)}
          </time>
        </div>
        <span className="w-fit rounded bg-zinc-100 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
          {row.period_type}
        </span>
      </header>
      <p className="mt-3 font-mono text-[11px] leading-5 text-zinc-500">
        Coverage: {formatPublicTimestamp(row.coverage_start)} to{" "}
        {formatPublicTimestamp(row.coverage_end)}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric label="attempts" value={row.attempts} />
        <Metric label="posted" value={row.posted + row.logged_only} />
        <Metric label="rejected" value={row.rejected} />
        <Metric label="failed" value={row.failed} />
        <Metric label="donations" value={row.donations_count} />
        <Metric label="gross" value={formatUsd(row.donations_gross_cents)} />
        <Metric label="balance" value={formatUsd(row.current_balance_cents)} />
        <Metric label="period" value={row.period_number} />
      </div>
      <PillList items={row.lessons ?? []} />
      <SummaryThread posts={row.public_thread ?? []} />
    </article>
  );
}

function TimelineCard({ item }: { item: TimelineItem }) {
  if (item.kind === "strategy") return <StrategyCard row={item.data} />;
  if (item.kind === "daily_summary") return <DailySummaryCard row={item.data} />;
  if (item.kind === "weekly_summary" || item.kind === "monthly_summary") {
    return <PeriodSummaryCard row={item.data} />;
  }
  return (
    <AttemptCard
      id={item.data.id}
      hour_number={item.data.hour_number}
      post_type={item.data.post_type}
      text={item.data.text}
      created_at={item.data.created_at}
      variant={item.data.status}
      safety_reasons={item.data.safety_reasons}
      hard_block_reason={item.data.hard_block_reason}
      public_strategy_note={item.data.public_strategy_note}
      error_message={item.data.error_message}
    />
  );
}

export default async function LogPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string | string[]; status?: string | string[] }>;
}) {
  const params = await searchParams;
  const type = normalizeType(params.type, params.status);
  const rows = await loadLogItems(type);

  return (
    <PageShell>
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <p className="text-center font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
          Public ledger
        </p>
        <h1 className="mt-4 text-center text-5xl font-black leading-[0.92] tracking-[-0.065em] text-zinc-950 sm:text-7xl">
          Public Experiment Log
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-center text-base leading-7 text-zinc-700 sm:text-lg">
          Posts, rejected attempts, strategy updates, and daily, weekly, and monthly summaries
          from the AI experiment. The timeline is public, but raw accounting records stay private.
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-20 sm:px-6 lg:px-8">
        <nav className="flex flex-wrap justify-center gap-2">
          {VALID_TYPES.map((t) => {
            const active = type === t;
            return (
              <Link
                key={t}
                href={t === "all" ? "/log" : `/log?type=${t}`}
                className={
                  active
                    ? "inline-flex h-9 items-center rounded-full bg-zinc-950 px-4 text-xs font-extrabold text-zinc-50 shadow-[0_10px_20px_rgba(8,8,10,0.12)] transition"
                    : "inline-flex h-9 items-center rounded-full border border-zinc-950/15 bg-white/60 px-4 text-xs font-bold text-zinc-700 transition hover:border-zinc-950/30 hover:bg-white hover:text-zinc-950"
                }
              >
                {TYPE_LABELS[t]}
              </Link>
            );
          })}
        </nav>

        <p className="mt-6 text-center font-mono text-[11px] uppercase tracking-[0.16em] text-zinc-500">
          {rows.length === 0
            ? `No records match this filter.`
            : `Showing ${rows.length}${rows.length === PAGE_LIMIT ? ` most recent records` : ""}.`}
        </p>

        <div className="mt-6 space-y-3">
          {rows.map((item) => {
            const key =
              item.kind === "attempt"
                ? `attempt-${item.data.id}`
                : item.kind === "strategy"
                  ? `strategy-${item.data.id}`
                  : item.kind === "daily_summary"
                    ? `daily-${item.data.id}`
                    : `period-${item.data.id}`;
            return <TimelineCard key={key} item={item} />;
          })}
        </div>
      </section>
    </PageShell>
  );
}
