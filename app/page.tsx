import Image from "next/image";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase";
import { getLatestStrategy } from "@/lib/getLatestStrategy";
import { isPostingPaused, normalizeProjectSettings } from "@/lib/projectState";
import { SAFETY_MODEL, WRITER_MODEL } from "@/lib/openai";
import { ProgressBar } from "@/components/ProgressBar";
import { AttemptCard } from "@/components/AttemptCard";
import { ElapsedClock } from "@/components/ElapsedClock";
import { formatPublicTimestamp } from "@/lib/formatPublicTimestamp";
import { getAiHealthMap } from "@/lib/aiHealth";
import { getStrategyHealth } from "@/lib/strategyHealth";
import type { AiHealthRecord } from "@/lib/aiHealth";
import type { StrategyHealthRecord } from "@/lib/strategyHealth";
import type { ProjectSettings, StrategyRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

const DISCLAIMER =
  "This is an entertainment/social experiment, not a financial product, charity, or investment. Contributions are voluntary and non-refundable. No rewards, equity, returns, or future value are promised.";

const FALLBACK_SETTINGS: ProjectSettings = {
  goal: 1_000_000,
  daily_post_limit: 8,
  mode: "normal",
  posting_paused: false,
  started_at: null,
  completed_at: null,
  final_post_sent: false,
};

const RULES = [
  "no charity claims",
  "no emergency claims",
  "no rewards, equity, returns, lottery, or future value",
  "no DMs, no @-mentions, no random tagging",
  "every attempt — posted or rejected — is logged here",
];

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

const HOMEPAGE_POSTED_LIMIT = 3;
const HOMEPAGE_REJECTED_LIMIT = 3;
const HOMEPAGE_FAILED_LIMIT = 3;
const DONATION_URL = "https://donate.stripe.com/7sY00k0t0fdJ4n1eCP9AA01";
const X_PROFILE_URL = process.env.NEXT_PUBLIC_X_PROFILE_URL;

function elapsedSecondsFromStartedAt(startedAt: string | null | undefined): number {
  if (!startedAt) return 0;
  const startedMs = new Date(startedAt).getTime();
  if (!Number.isFinite(startedMs)) return 0;
  return Math.max(0, Math.floor((Date.now() - startedMs) / 1000));
}

async function loadData() {
  const [
    settingsRes,
    donationsRes,
    attemptsCountRes,
    postedCountRes,
    loggedOnlyCountRes,
    rejectedCountRes,
    postedRes,
    rejectedRes,
    failedRes,
    latestStrategy,
    strategyHealth,
    aiHealth,
  ] = await Promise.all([
    supabaseAdmin.from("settings").select("value").eq("key", "project").maybeSingle(),
    supabaseAdmin
      .from("donations")
      .select("amount_cents,donor_name,donor_message,created_at")
      .order("created_at", { ascending: false }),
    supabaseAdmin.from("attempts").select("id", { count: "exact", head: true }),
    supabaseAdmin
      .from("attempts")
      .select("id", { count: "exact", head: true })
      .eq("status", "posted"),
    supabaseAdmin
      .from("attempts")
      .select("id", { count: "exact", head: true })
      .eq("status", "logged_only"),
    supabaseAdmin
      .from("attempts")
      .select("id", { count: "exact", head: true })
      .eq("status", "rejected"),
    supabaseAdmin
      .from("attempts")
      .select(
        "id,hour_number,post_type,text,status,safety_reasons,hard_block_reason,public_strategy_note,error_message,created_at",
      )
      .in("status", ["posted", "logged_only"])
      .order("created_at", { ascending: false })
      .limit(HOMEPAGE_POSTED_LIMIT),
    supabaseAdmin
      .from("attempts")
      .select(
        "id,hour_number,post_type,text,status,safety_reasons,hard_block_reason,public_strategy_note,error_message,created_at",
      )
      .eq("status", "rejected")
      .order("created_at", { ascending: false })
      .limit(HOMEPAGE_REJECTED_LIMIT),
    supabaseAdmin
      .from("attempts")
      .select(
        "id,hour_number,post_type,text,status,safety_reasons,hard_block_reason,public_strategy_note,error_message,created_at",
      )
      .eq("status", "failed")
      .order("created_at", { ascending: false })
      .limit(HOMEPAGE_FAILED_LIMIT),
    getLatestStrategy(),
    getStrategyHealth(),
    getAiHealthMap(),
  ]);

  const settings = normalizeProjectSettings(
    (settingsRes.data?.value as Partial<ProjectSettings> | undefined) ?? FALLBACK_SETTINGS,
  );
  const donations = donationsRes.data ?? [];
  const totalCents = donations.reduce((sum, row) => sum + (row.amount_cents ?? 0), 0);

  const attemptsCount = attemptsCountRes.count ?? 0;
  const postedCount = postedCountRes.count ?? 0;
  const loggedOnlyCount = loggedOnlyCountRes.count ?? 0;
  const rejectedCount = rejectedCountRes.count ?? 0;
  const visibleCount = postedCount + loggedOnlyCount;

  return {
    settings,
    currentAmount: totalCents / 100,
    elapsedSeconds: elapsedSecondsFromStartedAt(settings.started_at),
    displayedHour: attemptsCount,
    postedCount,
    loggedOnlyCount,
    visibleCount,
    rejectedCount,
    donorCount: donations.length,
    recentDonations: donations.slice(0, 5) as {
      amount_cents: number;
      donor_name: string | null;
      donor_message: string | null;
      created_at: string;
    }[],
    posted: (postedRes.data ?? []) as AttemptRow[],
    rejected: (rejectedRes.data ?? []) as AttemptRow[],
    failed: (failedRes.data ?? []) as AttemptRow[],
    latestStrategy,
    strategyHealth,
    aiHealth,
  };
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-mono text-xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50 sm:text-2xl">
        {value.toString().padStart(2, "0")}
      </span>
      <span className="text-[11px] leading-tight text-zinc-500">{label}</span>
    </div>
  );
}

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

function formatUtcWindowWithEt(window: string) {
  const match = /^(\d{2}):(\d{2})-(\d{2}):(\d{2})$/.exec(window);
  if (!match) return window;
  const [, startHour, startMinute, endHour, endMinute] = match;
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), Number(startHour), Number(startMinute)));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), Number(endHour), Number(endMinute)));
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
  });
  return `${window} UTC (${formatter.format(start)}-${formatter.format(end)} ET)`;
}

function SiteHeader() {
  return (
    <header className="mb-10 flex flex-col gap-4 border-b border-zinc-200 pb-5 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
      <Link
        href="/"
        className="font-mono font-semibold uppercase tracking-[0.18em] text-zinc-800 hover:text-zinc-950 dark:text-zinc-200 dark:hover:text-white"
      >
        Million Dollar AI
      </Link>
      <nav className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Link
          href="/about"
          className="underline-offset-2 hover:text-zinc-900 hover:underline dark:hover:text-zinc-100"
        >
          About
        </Link>
        <Link
          href="/log"
          className="underline-offset-2 hover:text-zinc-900 hover:underline dark:hover:text-zinc-100"
        >
          Log
        </Link>
        {X_PROFILE_URL && (
          <a
            href={X_PROFILE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-2 hover:text-zinc-900 hover:underline dark:hover:text-zinc-100"
          >
            X
          </a>
        )}
        <a
          href={DONATION_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-8 items-center rounded-full bg-zinc-900 px-4 font-medium text-zinc-50 transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Contribute
        </a>
      </nav>
    </header>
  );
}

function StrategyPillList({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {items.slice(0, 4).map((item) => (
        <span
          key={item}
          className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function HealthBadge({ status }: { status: string }) {
  const warn = !["current", "healthy", "live", "completed"].includes(status);
  return (
    <span
      className={`rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
        warn
          ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400"
          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
      }`}
    >
      {status}
    </span>
  );
}

function SystemStatus({ settings }: { settings: ProjectSettings }) {
  const paused = isPostingPaused(settings);
  const completed = settings.mode === "completed";
  const label = completed ? "completed" : paused ? "paused" : "live";
  const copy = completed
    ? "The experiment is archived; autonomous contribution posts are stopped."
    : paused
      ? "Autonomous X posting is paused. The public ledger and payment webhook remain online."
      : "Autonomous posting is live. The account is automated and managed by a human operator.";

  return (
    <section className="mt-8 rounded-md border border-zinc-200 bg-white/70 p-4 dark:border-zinc-800 dark:bg-zinc-950/70">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          System status
        </h2>
        <HealthBadge status={label} />
      </div>
      <p className="mt-2 text-xs leading-5 text-zinc-500">{copy}</p>
    </section>
  );
}

function LatestStrategy({
  strategy,
  strategyHealth,
  aiHealth,
}: {
  strategy: StrategyRecord | null;
  strategyHealth: StrategyHealthRecord | null;
  aiHealth: Record<string, AiHealthRecord | null>;
}) {
  return (
    <section className="mt-12">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
        Latest strategy update
      </h2>
      {strategy?.created_at && (
        <p className="mt-1 font-mono text-[11px] text-zinc-500">
          Updated: <time dateTime={strategy.created_at}>{formatPublicTimestamp(strategy.created_at)}</time>
        </p>
      )}
      <div className="mt-3 rounded-md border border-zinc-300 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-4 space-y-2 border-b border-zinc-200 pb-4 dark:border-zinc-800">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Strategy status
            </p>
            <HealthBadge status={strategyHealth?.status ?? "current"} />
          </div>
          <p className="font-mono text-[11px] leading-5 text-zinc-500">
            Consecutive strategy failures: {strategyHealth?.consecutive_failures ?? 0}
            {strategyHealth?.last_failure_reason
              ? ` / last failure: ${strategyHealth.last_failure_reason}`
              : ""}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {(["writer", "safety", "summary", "strategy"] as const).map((component) => (
              <span
                key={component}
                className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400"
              >
                {component}: {aiHealth[component]?.status ?? "unknown"}
              </span>
            ))}
          </div>
        </div>
        {strategy ? (
          <>
            <p className="text-sm leading-7 text-zinc-700 dark:text-zinc-300">{strategy.summary}</p>
            <p className="mt-2 font-mono text-[11px] text-zinc-500">
              Strategy model: {strategy.model ?? "unknown"}
            </p>
          </>
        ) : (
          <p className="text-sm leading-7 text-zinc-700 dark:text-zinc-300">
            No successful strategy has been saved yet. Hourly posting continues with conservative
            defaults while the health panel shows the latest failure.
          </p>
        )}
        {strategy?.rewrite_guidance && (
          <p className="mt-3 text-xs italic leading-5 text-zinc-500">
            Today&apos;s adjustment: {strategy.rewrite_guidance}
          </p>
        )}
        {(strategy?.top_reject_reasons.length ?? 0) > 0 && (
          <div className="mt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Recent rejection signals
            </p>
            <StrategyPillList items={strategy?.top_reject_reasons ?? []} />
          </div>
        )}
        {strategy?.target_posts_today && (
          <p className="mt-4 font-mono text-[11px] text-zinc-500">
            Today&apos;s AI posting target: {strategy.target_posts_today}
          </p>
        )}
        {(strategy?.posting_windows_utc.length ?? 0) > 0 && (
          <div className="mt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Posting windows UTC
            </p>
            <StrategyPillList
              items={(strategy?.posting_windows_utc ?? []).map(formatUtcWindowWithEt)}
            />
          </div>
        )}
        {(strategy?.min_post_interval_minutes || strategy?.direct_ask_cadence_hours) && (
          <p className="mt-4 font-mono text-[11px] text-zinc-500">
            Min interval: {strategy?.min_post_interval_minutes ?? 60} min
            {" / "}
            Direct ask cadence: {strategy?.direct_ask_cadence_hours ?? 6} h
          </p>
        )}
        {(strategy?.keyword_focus.length ?? 0) > 0 && (
          <div className="mt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Discovery focus
            </p>
            <StrategyPillList items={strategy?.keyword_focus ?? []} />
          </div>
        )}
        {(strategy?.hashtag_policy || strategy?.link_policy) && (
          <div className="mt-4 space-y-1 text-[11px] leading-5 text-zinc-500">
            {strategy?.hashtag_policy && <p>Hashtag policy: {strategy.hashtag_policy}</p>}
            {strategy?.link_policy && <p>Link policy: {strategy.link_policy}</p>}
          </div>
        )}
        {(strategy?.phase || strategy?.tone_guidance) && (
          <div className="mt-4 space-y-1 text-[11px] leading-5 text-zinc-500">
            {strategy?.phase && <p>Phase: {strategy.phase}</p>}
            {strategy?.tone_guidance && <p>Tone: {strategy.tone_guidance}</p>}
          </div>
        )}
        {(strategy?.forced_format || (strategy?.preferred_formats.length ?? 0) > 0) && (
          <div className="mt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Writer bias
            </p>
            <StrategyPillList
              items={[
                ...(strategy?.forced_format ? [`forced: ${strategy.forced_format}`] : []),
                ...(strategy?.preferred_formats ?? []).map((format) => `prefer: ${format}`),
              ]}
            />
          </div>
        )}
        {(strategy?.banned_angles.length ?? 0) > 0 && (
          <div className="mt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Avoiding
            </p>
            <StrategyPillList items={strategy?.banned_angles ?? []} />
          </div>
        )}
      </div>
    </section>
  );
}

export default async function Home() {
  const {
    settings,
    currentAmount,
    elapsedSeconds,
    displayedHour,
    postedCount,
    visibleCount,
    rejectedCount,
    donorCount,
    recentDonations,
    posted,
    rejected,
    failed,
    latestStrategy,
    strategyHealth,
    aiHealth,
  } = await loadData();

  return (
    <div className="min-h-full bg-stone-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <main className="mx-auto w-full max-w-2xl px-6 py-12 sm:py-16">
        <SiteHeader />

        {/* Hero */}
        <section className="flex flex-col gap-8 sm:flex-row sm:items-center sm:gap-10">
          <div className="flex-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
              Experiment hour {displayedHour} / Autonomous AI / Not charity / Not emergency
            </p>
            <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
              The Million Dollar AI Experiment
            </h1>
            <p className="mt-5 text-base leading-7 text-zinc-800 dark:text-zinc-200">
              An AI wakes up every hour and tries to raise $1,000,000 from humans.
              <br />
              Most hours, it fails.
              <br />
              Every attempt, rejection, and dollar is public.
            </p>
            <p className="mt-3 text-sm italic text-zinc-500">
              {settings.mode === "completed"
                ? "The experiment is complete. This page is now an archive."
                : "So far, the internet remains financially responsible."}
            </p>
          </div>
          <div className="shrink-0 self-center sm:self-start">
            <Image
              src="/hero.png"
              alt="A small white robot holding an empty bowl, looking expectant"
              width={400}
              height={400}
              priority
              className="h-40 w-40 object-contain sm:h-48 sm:w-48"
            />
          </div>
        </section>

        {/* Progress + stats + Donate */}
        <section className="mt-12">
          {settings.mode === "completed" && (
            <div className="mb-8 overflow-hidden rounded-md border border-amber-300 bg-zinc-950 text-white shadow-sm dark:border-amber-500/60">
              <Image
                src="/success.png"
                alt="The Million Dollar AI Experiment goal reached graphic"
                width={1706}
                height={960}
                className="aspect-[16/9] w-full object-cover"
              />
              <div className="border-t border-amber-300/30 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-200">
                  Experiment complete
                </p>
                <p className="mt-2 text-sm leading-7 text-zinc-200">
                  The AI reached the goal and will no longer publish contribution posts. This page is
                  now a public archive and ledger.
                </p>
              </div>
            </div>
          )}

          <ProgressBar current={currentAmount} goal={settings.goal} />

          <ElapsedClock
            key={settings.started_at ?? "not-started"}
            initialElapsedSeconds={elapsedSeconds}
            running={Boolean(settings.started_at)}
          />

          <div className="mt-6 grid grid-cols-3 gap-x-4 gap-y-5 border-b border-zinc-200 pb-5 sm:gap-x-6 dark:border-zinc-800">
            <Stat value={postedCount} label="successful posts" />
            <Stat value={rejectedCount} label="rejected attempts" />
            <Stat value={donorCount} label="contributors" />
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <a
              href={DONATION_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-900 px-6 text-sm font-medium text-zinc-50 transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Contribute
            </a>
            <span className="text-xs text-zinc-500">
              Voluntary contribution. No rewards or returns.
            </span>
          </div>
          {X_PROFILE_URL && (
            <div className="mt-3">
              <a
                href={X_PROFILE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                Follow the experiment on X -&gt;
              </a>
            </div>
          )}
        </section>

        <SystemStatus settings={settings} />

        {/* Recent contributions (only if any) */}
        {recentDonations.length > 0 && (
          <section className="mt-12">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Recent contributions
              </h2>
              {donorCount > recentDonations.length && (
                <span className="text-[11px] text-zinc-500">
                  Showing latest {recentDonations.length} of {donorCount}.
                </span>
              )}
            </div>
            <ul className="mt-4 space-y-3">
              {recentDonations.map((d, i) => (
                <li
                  key={d.created_at + i}
                  className="group rounded-md border border-zinc-200 bg-white/70 p-4 shadow-[0_1px_0_rgba(0,0,0,0.03)] transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950/70 dark:hover:border-zinc-700"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 min-w-14 items-center justify-center rounded-md bg-zinc-900 px-3 font-mono text-sm font-semibold tabular-nums text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900">
                      {formatUsd(d.amount_cents)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-xs font-medium text-zinc-500">anonymous</span>
                        <span className="text-[11px] text-zinc-300 dark:text-zinc-700">/</span>
                        <span className="font-mono text-[11px] text-zinc-500">
                          public contribution
                        </span>
                      </div>
                      {d.donor_message ? (
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-zinc-800 dark:text-zinc-200">
                          &ldquo;{d.donor_message}&rdquo;
                        </p>
                      ) : (
                        <p className="mt-1 text-sm italic leading-6 text-zinc-500">
                          No message. The ledger accepts silence.
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Why this exists */}
        <section className="mt-12">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Why this exists
          </h2>
          <div className="mt-3 space-y-3 text-sm leading-7 text-zinc-700 dark:text-zinc-300">
            <p>
              This is a test of what an AI-built public system can do under visible constraints:
              ask for money, fail in public, show its safety checks, and never pretend to be a
              person, charity, emergency, or investment.
            </p>
            <p>
              The website, copy, prompts, posting pipeline, and safety rules were built with AI
              assistance. That is part of the experiment too.
            </p>
          </div>
        </section>

        <LatestStrategy
          strategy={latestStrategy}
          strategyHealth={strategyHealth}
          aiHealth={aiHealth}
        />

        {/* How this works */}
        <section className="mt-12">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            How this works
          </h2>
          <div className="mt-3 space-y-3 text-sm leading-7 text-zinc-700 dark:text-zinc-300">
            <p>
              An autonomous AI generates one candidate post every hour. Each candidate runs through
              a second AI (Safety AI) and a deterministic rule check (hardBlock) before anything is
              published. Most candidates never make it out.
            </p>
            <p className="font-mono text-xs text-zinc-500">
              Writer model: {WRITER_MODEL}. Safety model: {SAFETY_MODEL}. Strategy model:{" "}
              {latestStrategy?.model ?? "gpt-5.5-pro when strategy is enabled"}.
            </p>
            <p>
              Everything is logged here — the posts that went out, the ones that were rejected, and
              the reasons they were rejected. No private content. No DMs. No deletions.
            </p>
          </div>
        </section>

        {/* Rules */}
        <section className="mt-10">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Rules</h2>
          <ul className="mt-3 space-y-1.5 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
            {RULES.map((rule) => (
              <li key={rule} className="flex items-start gap-2">
                <span className="mt-[10px] inline-block h-1 w-1 shrink-0 rounded-full bg-zinc-500" />
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Latest posts */}
        <section className="mt-12">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Latest attempts
            </h2>
            {visibleCount > posted.length && (
              <Link
                href="/log?status=visible"
                className="text-[11px] text-zinc-500 underline-offset-2 hover:text-zinc-700 hover:underline dark:hover:text-zinc-300"
              >
                view all {visibleCount} →
              </Link>
            )}
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Posts that cleared both AI checks. In live mode, posted attempts are sent to X and
            logged here.
          </p>
          <div className="mt-4 space-y-3">
            {posted.length === 0 ? (
              <div className="rounded-md border border-dashed border-zinc-300 px-4 py-6 text-center dark:border-zinc-800">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Nothing has cleared the safety checks yet.
                </p>
                <p className="mt-1 text-xs italic text-zinc-500">
                  The AI remains employable by no one.
                </p>
              </div>
            ) : (
              posted.map((row) => (
                <AttemptCard
                  key={row.id}
                  hour_number={row.hour_number}
                  post_type={row.post_type}
                  text={row.text}
                  created_at={row.created_at}
                  variant={row.status}
                  public_strategy_note={row.public_strategy_note}
                  truncate
                />
              ))
            )}
          </div>
        </section>

        {/* Rejected */}
        <section className="mt-12">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Attempts the AI was not allowed to say
            </h2>
            {rejectedCount > rejected.length && (
              <Link
                href="/log?status=rejected"
                className="text-[11px] text-zinc-500 underline-offset-2 hover:text-zinc-700 hover:underline dark:hover:text-zinc-300"
              >
                view all {rejectedCount} →
              </Link>
            )}
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Rejected by the shame firewall — Safety AI plus a list of banned phrases. The point of
            showing these is that the system can embarrass itself publicly.
          </p>
          {rejectedCount > rejected.length && (
            <p className="mt-1 text-[11px] text-zinc-500">
              Showing latest {rejected.length} of {rejectedCount}.
            </p>
          )}
          <div className="mt-4 space-y-3">
            {rejected.length === 0 ? (
              <p className="rounded-md border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-500 dark:border-zinc-800">
                Nothing rejected yet. Suspicious.
              </p>
            ) : (
              rejected.map((row) => (
                <AttemptCard
                  key={row.id}
                  hour_number={row.hour_number}
                  post_type={row.post_type}
                  text={row.text}
                  created_at={row.created_at}
                  variant="rejected"
                  safety_reasons={row.safety_reasons}
                  hard_block_reason={row.hard_block_reason}
                  truncate
                />
              ))
            )}
          </div>
        </section>

        {/* Failures (only if any) */}
        {failed.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Failures
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              The pipeline threw an exception. Usually a transient upstream issue.
            </p>
            <div className="mt-4 space-y-3">
              {failed.map((row) => (
                <AttemptCard
                  key={row.id}
                  hour_number={row.hour_number}
                  post_type={row.post_type}
                  text={row.text}
                  created_at={row.created_at}
                  variant="failed"
                  error_message={row.error_message}
                  truncate
                />
              ))}
            </div>
          </section>
        )}

        <div className="mt-12 text-center">
          <Link
            href="/log"
            className="inline-flex items-center gap-1 text-sm text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            View the full public attempt log →
          </Link>
        </div>

        {/* Footer */}
        <footer className="mt-16 border-t border-zinc-200 py-8 dark:border-zinc-800">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-md">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Not a charity. Not an investment.
              </h2>
              <p className="mt-3 text-xs leading-5 text-zinc-500">{DISCLAIMER}</p>
              <p className="mt-3 text-xs leading-5 text-zinc-500">
                The site, copy, prompts, strategy loop, and posting pipeline were built with AI
                assistance.
              </p>
              <p className="mt-3 text-xs leading-5 text-zinc-500">
                The X account is automated and managed by a human operator. It does not auto-like,
                auto-follow, DM, or tag strangers.
              </p>
            </div>
            <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-500 sm:max-w-48 sm:justify-end">
              <Link
                href="/about"
                className="underline-offset-2 hover:text-zinc-700 hover:underline dark:hover:text-zinc-300"
              >
                About
              </Link>
              <Link
                href="/privacy"
                className="underline-offset-2 hover:text-zinc-700 hover:underline dark:hover:text-zinc-300"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="underline-offset-2 hover:text-zinc-700 hover:underline dark:hover:text-zinc-300"
              >
                Terms
              </Link>
              <Link
                href="/log"
                className="underline-offset-2 hover:text-zinc-700 hover:underline dark:hover:text-zinc-300"
              >
                Public log
              </Link>
              {X_PROFILE_URL && (
                <a
                  href={X_PROFILE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline-offset-2 hover:text-zinc-700 hover:underline dark:hover:text-zinc-300"
                >
                  Follow on X
                </a>
              )}
              <a
                href={DONATION_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 items-center rounded-full border border-zinc-300 px-3 font-medium text-zinc-700 transition-colors hover:border-zinc-500 hover:text-zinc-950 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:text-zinc-50"
              >
                Contribute
              </a>
            </nav>
          </div>
        </footer>
      </main>
    </div>
  );
}
