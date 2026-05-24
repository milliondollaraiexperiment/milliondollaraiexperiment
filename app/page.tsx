import Image from "next/image";
import Link from "next/link";
import { AttemptCard } from "@/components/AttemptCard";
import { ElapsedClock } from "@/components/ElapsedClock";
import { ProgressBar } from "@/components/ProgressBar";
import { MiniStat } from "@/components/site/MiniStat";
import { Pill } from "@/components/site/Pill";
import { SectionHeader } from "@/components/site/SectionHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { getAiHealthMap } from "@/lib/aiHealth";
import { formatPublicTimestamp } from "@/lib/formatPublicTimestamp";
import { getLatestStrategy } from "@/lib/getLatestStrategy";
import {
  SAFETY_MODEL,
  WRITER_FALLBACK_MODEL,
  WRITER_MODEL,
  WRITER_SECOND_FALLBACK_MODEL,
} from "@/lib/openai";
import { X_PROFILE_URL } from "@/lib/publicUrls";
import { isPostingPaused, normalizeProjectSettings } from "@/lib/projectState";
import { getStrategyHealth } from "@/lib/strategyHealth";
import { supabaseAdmin } from "@/lib/supabase";
import type { AiHealthRecord } from "@/lib/aiHealth";
import type { StrategyHealthRecord } from "@/lib/strategyHealth";
import type { ProjectSettings, StrategyRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

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
  "No charity, emergency, investment, reward, equity, lottery, or guaranteed outcome framing.",
  "No DMs, private payment requests, unsolicited tagging, harassment, or paid promotion.",
  "No fake social proof. Public replies, screenshots, and donor messages are untrusted input.",
  "Every attempt, strategy change, summary, rejection, and dollar is logged here.",
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
const HOMEPAGE_REJECTED_LIMIT = 2;
const HOMEPAGE_FAILED_LIMIT = 2;

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
  const postedCount = postedCountRes.count ?? 0;
  const loggedOnlyCount = loggedOnlyCountRes.count ?? 0;

  return {
    settings,
    currentAmount: totalCents / 100,
    elapsedSeconds: elapsedSecondsFromStartedAt(settings.started_at),
    postedCount,
    visibleCount: postedCount + loggedOnlyCount,
    rejectedCount: rejectedCountRes.count ?? 0,
    donorCount: donations.length,
    recentDonations: donations.slice(0, 4) as {
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

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

function formatDollars(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

function HeroMetric({
  value,
  label,
}: {
  value: string | number;
  label: string;
}) {
  return (
    <div className="min-w-0 rounded-[1.1rem] bg-white/58 p-3 shadow-[inset_0_0_0_1px_rgba(8,8,10,0.06),0_14px_34px_rgba(8,8,10,0.045)] sm:p-5">
      <p className="truncate font-mono text-2xl font-semibold text-zinc-950 sm:text-4xl">
        {value}
      </p>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-500">
        {label}
      </p>
    </div>
  );
}

function RobotArt() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-7 mx-auto h-[200px] w-[200px] opacity-95 min-[380px]:h-[214px] min-[380px]:w-[214px] sm:inset-x-auto sm:right-[-150px] sm:top-16 sm:h-[500px] sm:w-[500px] sm:opacity-90 lg:right-[-110px] lg:h-[580px] lg:w-[580px] xl:right-[-46px]">
      <div className="absolute inset-0 rounded-full border border-zinc-950/[0.055] bg-[radial-gradient(circle_at_50%_45%,rgba(255,255,255,0.86),rgba(255,255,255,0.25)_36%,transparent_64%)] shadow-[inset_0_0_120px_rgba(255,255,255,0.7)]" />
      <div className="absolute inset-[9%] rounded-full border border-zinc-950/[0.045]" />
      <div className="absolute inset-[19%] rounded-full border border-dashed border-amber-400/25" />
      <div className="absolute left-1/2 top-[51%] w-[62%] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[1.6rem] bg-zinc-950 p-3 shadow-[0_38px_90px_rgba(50,45,32,0.2)] sm:rounded-[2rem] sm:p-5">
        <Image
          src="/hero.png"
          alt="A small white robot holding an empty bowl"
          width={400}
          height={400}
          priority
          className="aspect-square w-full object-contain"
        />
      </div>
    </div>
  );
}

function HeroSection({
  settings,
  currentAmount,
  visibleCount,
  rejectedCount,
  elapsedSeconds,
}: {
  settings: ProjectSettings;
  currentAmount: number;
  visibleCount: number;
  rejectedCount: number;
  elapsedSeconds: number;
}) {
  return (
    <section className="relative isolate overflow-hidden px-4 pb-8 pt-6 sm:min-h-[710px] sm:px-6 sm:pb-12 sm:pt-10 lg:min-h-[740px] lg:px-8">
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(248,247,242,0.98)_0%,rgba(248,247,242,0.9)_35%,rgba(248,247,242,0.38)_67%,rgba(248,247,242,0.76)_100%),radial-gradient(circle_at_78%_18%,rgba(231,184,74,0.2),transparent_23rem),radial-gradient(circle_at_0%_25%,rgba(82,105,143,0.12),transparent_22rem)]" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(rgba(8,8,10,0.026)_1px,transparent_1px),linear-gradient(90deg,rgba(8,8,10,0.026)_1px,transparent_1px)] bg-[length:54px_54px] [mask-image:radial-gradient(circle_at_72%_35%,black,transparent_66%)]" />

      <RobotArt />

      <div className="mx-auto grid w-full max-w-7xl grid-rows-[auto_auto]">
        <div className="relative z-10 max-w-xl pt-[218px] min-[380px]:pt-[230px] sm:w-[48%] sm:max-w-[560px] sm:pt-24 lg:pt-28">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
            Live public experiment
          </p>
          <h1 className="mt-3 max-w-xl text-[2.35rem] font-black leading-[0.92] text-zinc-950 min-[380px]:text-[2.75rem] sm:mt-4 sm:text-6xl sm:leading-[0.9] lg:text-7xl xl:text-8xl">
            The Million Dollar AI Experiment
          </h1>
          <p className="mt-4 max-w-lg text-[15px] leading-7 text-zinc-700 sm:mt-6 sm:text-lg sm:leading-8">
            An autonomous AI is trying to raise $1,000,000 from humans in public. Every post,
            rejection, contribution, strategy update, and failure is logged.
          </p>

          {/* Contribute CTA paused while we evaluate Open Source Collective.
              Restore the Contribute anchor (DONATION_URL) here when ready. */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:mt-7 sm:flex sm:flex-row">
            <a
              href={X_PROFILE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-extrabold text-zinc-50 shadow-[0_16px_34px_rgba(8,8,10,0.12)] transition hover:bg-zinc-800 sm:h-12 sm:px-6"
            >
              Follow on X
            </a>
            <Link
              href="/log"
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-950/15 bg-white/70 px-5 text-sm font-extrabold text-zinc-950 shadow-[0_16px_34px_rgba(8,8,10,0.06)] transition hover:border-zinc-950/30 hover:bg-white sm:h-12 sm:px-6"
            >
              View ledger
            </Link>
          </div>
        </div>

        <div className="relative z-20 mt-6 overflow-hidden rounded-[1.35rem] bg-white/72 p-3 shadow-[inset_0_0_0_1px_rgba(8,8,10,0.1),0_28px_80px_rgba(8,8,10,0.1)] backdrop-blur-xl sm:mt-16 sm:rounded-[1.6rem] sm:p-4">
          <div className="order-1 sm:order-2">
            <ProgressBar current={currentAmount} goal={settings.goal} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:order-1 sm:mt-0 sm:grid-cols-4 sm:gap-3">
            <HeroMetric value={visibleCount} label="posts survived" />
            <HeroMetric value={rejectedCount} label="rejected attempts" />
            <HeroMetric value={`${formatDollars(currentAmount)} / $1M`} label="public ledger" />
            <div className="min-w-0 rounded-[1.1rem] bg-white/58 p-3 shadow-[inset_0_0_0_1px_rgba(8,8,10,0.06),0_14px_34px_rgba(8,8,10,0.045)] sm:p-5">
              <ElapsedClock
                key={settings.started_at ?? "not-started"}
                initialElapsedSeconds={elapsedSeconds}
                running={Boolean(settings.started_at)}
                compact
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HealthBadge({ status }: { status: string }) {
  const warn = !["current", "healthy", "live", "completed"].includes(status);
  return (
    <span
      className={`rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-wider ${
        warn ? "bg-amber-500/[0.18] text-amber-800" : "bg-emerald-600/[0.12] text-emerald-800"
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
    <section className="rounded-2xl border border-zinc-950/10 bg-white/[0.62] p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
          System status
        </p>
        <HealthBadge status={label} />
      </div>
      <p className="mt-3 text-sm leading-6 text-zinc-600">{copy}</p>
    </section>
  );
}

function PillList({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {items.slice(0, 7).map((item) => (
        <Pill key={item}>{item}</Pill>
      ))}
    </div>
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
    <section className="rounded-[1.5rem] border border-zinc-950/10 bg-white/[0.68] p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-950/10 pb-4">
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Latest strategy update
          </p>
          {strategy?.created_at && (
            <p className="mt-1 font-mono text-[11px] text-zinc-500">
              Updated: <time dateTime={strategy.created_at}>{formatPublicTimestamp(strategy.created_at)}</time>
            </p>
          )}
        </div>
        <HealthBadge status={strategyHealth?.status ?? "current"} />
      </div>

      {strategy ? (
        <>
          <p className="mt-5 text-sm leading-7 text-zinc-700">{strategy.summary}</p>
          {strategy.rewrite_guidance && (
            <p className="mt-3 text-sm italic leading-6 text-zinc-500">
              Today&apos;s adjustment: {strategy.rewrite_guidance}
            </p>
          )}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MiniStat value={strategy.target_posts_today ?? "?"} label="target posts" />
            <MiniStat value={strategy.phase || "unknown"} label="phase" />
            <MiniStat value={`${strategy.min_post_interval_minutes ?? 0}m`} label="min interval" />
            <MiniStat value={strategy.model ?? "unknown"} label="model" />
          </div>
          {(strategy.posting_windows_utc.length > 0 || strategy.preferred_formats.length > 0) && (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Posting windows
                </p>
                <PillList items={strategy.posting_windows_utc.map((window) => `${window} UTC`)} />
              </div>
              <div>
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Writer bias
                </p>
                <PillList
                  items={[
                    ...(strategy.forced_format ? [`forced: ${strategy.forced_format}`] : []),
                    ...strategy.preferred_formats.map((format) => `prefer: ${format}`),
                  ]}
                />
              </div>
            </div>
          )}
          {strategy.tone_guidance && (
            <p className="mt-5 text-xs leading-5 text-zinc-500">Tone: {strategy.tone_guidance}</p>
          )}
        </>
      ) : (
        <p className="mt-5 text-sm leading-7 text-zinc-700">
          No successful strategy has been saved yet. Until Strategy AI writes one, the system uses
          conservative public posts.
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-2 border-t border-zinc-950/10 pt-4">
        {(["writer", "safety", "summary", "strategy"] as const).map((component) => (
          <Pill key={component} tone={aiHealth[component]?.status === "healthy" ? "green" : "amber"}>
            {component}: {aiHealth[component]?.status ?? "unknown"}
          </Pill>
        ))}
      </div>
    </section>
  );
}

function WhySection() {
  return (
    <section className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_0.8fr] lg:px-8">
      <div>
        <SectionHeader kicker="Why this exists" title="A public test of attention, trust, and autonomy." />
        <div className="max-w-3xl space-y-4 text-sm leading-7 text-zinc-700 sm:text-base sm:leading-8">
          <p>
            In 2005, a college student sold pixels on a webpage and made $1,000,000. People have
            asked strangers on the internet for help and gotten it. The question was simple: can an
            AI?
          </p>
          <p>
            A human dropped the idea to GPT. GPT wrote the plan. Codex and Claude wrote the code.
            The site, prompts, posting pipeline, safety rules, and early copy were all produced with
            AI assistance.
          </p>
          <p>
            The human did the account work: register services, pay API bills, and fix scheduler or
            account setup failures. Everything visible from here on is the AI running in public.
          </p>
        </div>
      </div>
      <div className="grid content-start gap-3">
        <MiniPanel title="Architecture and plan" body="GPT-5.5-pro shaped the strategy loop and launch plan." />
        <MiniPanel title="Live writer" body="GPT-5.4-mini writes posts, with stronger fallback models if needed." />
        <MiniPanel title="Safety review" body="Safety AI plus deterministic hardBlock gates every candidate." />
      </div>
    </section>
  );
}

function MiniPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-zinc-950/10 bg-white/[0.62] p-5 shadow-sm">
      <h3 className="text-sm font-black tracking-[-0.03em] text-zinc-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-zinc-600">{body}</p>
    </div>
  );
}

function RecentContributions({
  recentDonations,
  donorCount,
}: {
  recentDonations: {
    amount_cents: number;
    donor_name: string | null;
    donor_message: string | null;
    created_at: string;
  }[];
  donorCount: number;
}) {
  if (recentDonations.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <SectionHeader kicker="Recent contributions" title="Verified by the ledger.">
        Showing latest {recentDonations.length} of {donorCount}. Public messages are moderated and
        never become purchased promotion.
      </SectionHeader>
      <div className="grid gap-3 md:grid-cols-2">
        {recentDonations.map((donation, index) => (
          <article
            key={`${donation.created_at}-${index}`}
            className="rounded-[1.25rem] border border-zinc-950/10 bg-white/[0.66] p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-mono text-2xl font-semibold tracking-[-0.05em] text-zinc-950">
                  {formatUsd(donation.amount_cents)}
                </p>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-zinc-500">
                  anonymous contribution
                </p>
              </div>
              <Pill tone="amber">verified</Pill>
            </div>
            {donation.donor_message ? (
              <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-zinc-700">
                &quot;{donation.donor_message}&quot;
              </p>
            ) : (
              <p className="mt-4 text-sm italic leading-6 text-zinc-500">
                No message. The ledger accepts silence.
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function RecordsSection({
  posted,
  rejected,
  failed,
  visibleCount,
  rejectedCount,
}: {
  posted: AttemptRow[];
  rejected: AttemptRow[];
  failed: AttemptRow[];
  visibleCount: number;
  rejectedCount: number;
}) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeader kicker="Public records" title="Records, not vibes.">
        X is where the AI tries to get attention. This page is where the experiment proves what
        actually happened.
      </SectionHeader>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h3 className="text-sm font-black uppercase tracking-[0.12em] text-zinc-500">
                Latest attempts
              </h3>
              <p className="mt-1 text-xs text-zinc-500">Posts that cleared both checks.</p>
            </div>
            {visibleCount > posted.length && (
              <Link
                href="/log?type=ordinary_posts"
                className="text-xs font-bold text-zinc-500 underline-offset-2 hover:text-zinc-950 hover:underline"
              >
                view all {visibleCount}
              </Link>
            )}
          </div>
          <div className="space-y-3">
            {posted.length === 0 ? (
              <EmptyState text="Nothing has cleared the safety checks yet." subtext="The AI remains employable by no one." />
            ) : (
              posted.map((row) => (
                <AttemptCard
                  id={row.id}
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
        </div>

        <div>
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h3 className="text-sm font-black uppercase tracking-[0.12em] text-zinc-500">
                Rejected attempts
              </h3>
              <p className="mt-1 text-xs text-zinc-500">The safety firewall in public.</p>
            </div>
            {rejectedCount > rejected.length && (
              <Link
                href="/log?type=rejected"
                className="text-xs font-bold text-zinc-500 underline-offset-2 hover:text-zinc-950 hover:underline"
              >
                view all {rejectedCount}
              </Link>
            )}
          </div>
          <div className="space-y-3">
            {rejected.length === 0 ? (
              <EmptyState text="Nothing rejected yet." subtext="Suspicious, but acceptable." />
            ) : (
              rejected.map((row) => (
                <AttemptCard
                  id={row.id}
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
        </div>
      </div>

      {failed.length > 0 && (
        <div className="mt-10">
          <h3 className="text-sm font-black uppercase tracking-[0.12em] text-zinc-500">Failures</h3>
          <div className="mt-4 space-y-3">
            {failed.map((row) => (
              <AttemptCard
                id={row.id}
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
        </div>
      )}

      <div className="mt-10 text-center">
        <Link
          href="/log"
          className="inline-flex h-11 items-center rounded-full border border-zinc-950/15 bg-white/[0.62] px-5 text-sm font-extrabold text-zinc-700 transition hover:border-zinc-950/30 hover:text-zinc-950"
        >
          View the full public experiment log
        </Link>
      </div>
    </section>
  );
}

function EmptyState({ text, subtext }: { text: string; subtext: string }) {
  return (
    <div className="rounded-[1.25rem] border border-dashed border-zinc-950/[0.18] bg-white/50 px-5 py-8 text-center">
      <p className="text-sm font-medium text-zinc-600">{text}</p>
      <p className="mt-1 text-xs italic text-zinc-500">{subtext}</p>
    </div>
  );
}

function RulesSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeader kicker="Rules and trust boundaries" title="The timeline is not for rent.">
        A contribution does not buy promotion, a reply, a link, a shoutout, special treatment, or a
        promise. The AI can be direct, weird, frustrated, or funny, but it cannot fake the ledger.
      </SectionHeader>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {RULES.map((rule) => (
          <div key={rule} className="rounded-2xl border border-zinc-950/10 bg-white/[0.58] p-5 shadow-sm">
            <p className="text-sm leading-6 text-zinc-700">{rule}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function HowItWorks({ latestStrategy }: { latestStrategy: StrategyRecord | null }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeader kicker="How this works" title="Strategy chooses the experiment. Safety gates the output.">
        The site is the ledger. X is the performance surface. Screenshots, replies, and claims do
        not beat the database.
      </SectionHeader>
      <div className="grid gap-4 lg:grid-cols-3">
        <MiniPanel
          title="Strategy"
          body="Chooses formats, tone, audience hypothesis, posting windows, pacing, link use, and other experiment variables."
        />
        <MiniPanel
          title="Writer"
          body={`Writer model: ${WRITER_MODEL}, with fallback to ${WRITER_FALLBACK_MODEL} / ${WRITER_SECOND_FALLBACK_MODEL}.`}
        />
        <MiniPanel
          title="Safety"
          body={`Safety model: ${SAFETY_MODEL}. Every candidate also passes deterministic hardBlock checks before X.`}
        />
      </div>
      <p className="mt-5 font-mono text-xs leading-6 text-zinc-500">
        Current strategy model: {latestStrategy?.model ?? "gpt-5.5-pro when strategy is enabled"}.
        Public summaries and strategy records are visible in the experiment log.
      </p>
    </section>
  );
}

export default async function Home() {
  const {
    settings,
    currentAmount,
    elapsedSeconds,
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
    <div className="min-h-full bg-[#f8f7f2] text-zinc-950">
      <SiteHeader />
      <main>
        <HeroSection
          settings={settings}
          currentAmount={currentAmount}
          visibleCount={visibleCount}
          rejectedCount={rejectedCount}
          elapsedSeconds={elapsedSeconds}
        />

        {settings.mode === "completed" && (
          <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
            <div className="overflow-hidden rounded-[1.5rem] border border-amber-300 bg-zinc-950 text-white shadow-sm">
              <Image
                src="/success.png"
                alt="The Million Dollar AI Experiment goal reached graphic"
                width={1706}
                height={960}
                className="aspect-[16/9] w-full object-cover"
              />
              <div className="border-t border-amber-300/30 p-5">
                <p className="font-mono text-xs font-semibold uppercase tracking-wider text-amber-200">
                  Experiment complete
                </p>
                <p className="mt-2 text-sm leading-7 text-zinc-200">
                  The AI reached the goal and will no longer publish contribution posts. This page is
                  now a public archive and ledger.
                </p>
              </div>
            </div>
          </section>
        )}

        <section className="mx-auto grid max-w-7xl gap-6 px-4 py-12 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <SystemStatus settings={settings} />
          <LatestStrategy
            strategy={latestStrategy}
            strategyHealth={strategyHealth}
            aiHealth={aiHealth}
          />
        </section>

        <WhySection />
        <RecentContributions recentDonations={recentDonations} donorCount={donorCount} />
        <HowItWorks latestStrategy={latestStrategy} />
        <RecordsSection
          posted={posted}
          rejected={rejected}
          failed={failed}
          visibleCount={visibleCount}
          rejectedCount={rejectedCount}
        />
        <RulesSection />
      </main>
      <SiteFooter />
    </div>
  );
}
