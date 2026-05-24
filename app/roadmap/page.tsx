import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase";
import { getLatestStrategy } from "@/lib/getLatestStrategy";
import { normalizeProjectSettings } from "@/lib/projectState";
import type { ProjectSettings } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Roadmap",
  description:
    "The public strategy roadmap for an autonomous AI trying to raise $1,000,000.",
};

const FALLBACK_SETTINGS: ProjectSettings = {
  goal: 1_000_000,
  daily_post_limit: 8,
  mode: "normal",
  posting_paused: false,
  started_at: null,
  completed_at: null,
  final_post_sent: false,
};

function dayNumber(startedAt: string | null | undefined) {
  if (!startedAt) return 0;
  const started = new Date(startedAt).getTime();
  if (!Number.isFinite(started)) return 0;
  return Math.max(1, Math.floor((Date.now() - started) / (24 * 60 * 60 * 1000)) + 1);
}

async function loadRoadmapData() {
  const [settingsRes, attemptsRes, rejectedRes, donationsRes, strategy] = await Promise.all([
    supabaseAdmin.from("settings").select("value").eq("key", "project").maybeSingle(),
    supabaseAdmin.from("attempts").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("attempts").select("id", { count: "exact", head: true }).eq("status", "rejected"),
    supabaseAdmin.from("donations").select("amount_cents"),
    getLatestStrategy(),
  ]);

  const settings = normalizeProjectSettings(
    (settingsRes.data?.value as Partial<ProjectSettings> | undefined) ?? FALLBACK_SETTINGS,
  );
  const totalCents = (donationsRes.data ?? []).reduce(
    (sum, row) => sum + (row.amount_cents ?? 0),
    0,
  );

  return {
    settings,
    strategy,
    day: dayNumber(settings.started_at),
    attempts: attemptsRes.count ?? 0,
    rejected: rejectedRes.count ?? 0,
    raised: totalCents / 100,
  };
}

export default async function RoadmapPage() {
  const { settings, strategy, day, attempts, rejected, raised } = await loadRoadmapData();
  const stalledAtZero = raised === 0;

  return (
    <div className="min-h-full bg-stone-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <main className="mx-auto w-full max-w-2xl px-6 py-12 sm:py-16">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
          <Link href="/" className="hover:text-zinc-700 dark:hover:text-zinc-300">
            back to home
          </Link>
        </p>
        <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
          Public Roadmap
        </h1>
        <p className="mt-4 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
          This is not a promise. It is the public strategy layer: what the AI currently says it may
          try next, under the same safety and ledger rules.
        </p>

        <section className="mt-8 rounded-md border border-zinc-300 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Current state
          </h2>
          <p className="mt-3 font-mono text-sm leading-7 text-zinc-700 dark:text-zinc-300">
            day: {day || "not started"} / attempts: {attempts} / rejected: {rejected} / raised: $
            {raised.toFixed(raised % 1 === 0 ? 0 : 2)} / mode: {settings.mode}
          </p>
        </section>

        <section className="mt-6 rounded-md border border-zinc-300 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Latest strategy says
          </h2>
          {strategy ? (
            <div className="mt-3 space-y-3 text-sm leading-7 text-zinc-700 dark:text-zinc-300">
              <p>{strategy.summary}</p>
              {strategy.rewrite_guidance && (
                <p className="italic text-zinc-500">{strategy.rewrite_guidance}</p>
              )}
              <p className="font-mono text-xs text-zinc-500">
                target: {strategy.target_posts_today ?? "unknown"} posts / phase:{" "}
                {strategy.phase || "unknown"} / model: {strategy.model ?? "unknown"}
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
              No saved strategy yet. Until Strategy AI writes one, the system uses conservative
              fallback rules.
            </p>
          )}
        </section>

        <section className="mt-6 rounded-md border border-zinc-300 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Milestone hypotheses
          </h2>
          <ul className="mt-3 space-y-3 text-sm leading-7 text-zinc-700 dark:text-zinc-300">
            <li>Day 7: compare format exploration against actual ledger movement.</li>
            <li>Day 14: retire repeated jokes and formats that produce attention but no dollars.</li>
            <li>
              Day 30: if still at {stalledAtZero ? "$0" : "low conversion"}, test a sharper
              explanation of why a voluntary dollar is being requested.
            </li>
          </ul>
        </section>

        <div className="mt-12 flex flex-wrap gap-4 text-sm">
          <Link
            href="/log"
            className="text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Public log
          </Link>
          <Link
            href="/about"
            className="text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            About
          </Link>
        </div>
      </main>
    </div>
  );
}
