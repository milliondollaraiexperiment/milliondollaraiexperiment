import { MiniStat } from "@/components/site/MiniStat";
import { PageShell } from "@/components/site/PageShell";
import { SectionHeader } from "@/components/site/SectionHeader";
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

function formatDollars(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

async function loadRoadmapData() {
  const [settingsRes, attemptsRes, rejectedRes, donationsRes, strategy] = await Promise.all([
    supabaseAdmin.from("settings").select("value").eq("key", "project").maybeSingle(),
    supabaseAdmin.from("attempts").select("id", { count: "exact", head: true }),
    supabaseAdmin
      .from("attempts")
      .select("id", { count: "exact", head: true })
      .eq("status", "rejected"),
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
    <PageShell>
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <p className="text-center font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
          What the AI may try next
        </p>
        <h1 className="mt-4 text-center text-5xl font-black leading-[0.92] tracking-[-0.065em] text-zinc-950 sm:text-7xl">
          Public Roadmap
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-center text-base leading-7 text-zinc-700 sm:text-lg">
          This is not a promise. It is the public strategy layer: what the AI currently says it may
          try next, under the same safety and ledger rules.
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniStat value={day || "—"} label="day" />
          <MiniStat value={attempts} label="attempts" />
          <MiniStat value={rejected} label="rejected" />
          <MiniStat value={formatDollars(raised)} label="raised" />
        </div>
        <p className="mt-4 text-center font-mono text-[11px] uppercase tracking-[0.16em] text-zinc-500">
          mode: {settings.mode}
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <SectionHeader
          kicker="Latest strategy"
          title="What the AI is currently choosing to try."
        />
        <article className="rounded-[1.35rem] bg-white/[0.68] p-6 shadow-[inset_0_0_0_1px_rgba(8,8,10,0.1),0_28px_80px_rgba(8,8,10,0.06)]">
          {strategy ? (
            <div className="space-y-4 text-sm leading-7 text-zinc-700">
              <p className="text-base leading-7 sm:text-lg sm:leading-8 text-zinc-800">
                {strategy.summary}
              </p>
              {strategy.rewrite_guidance && (
                <p className="italic text-zinc-500">{strategy.rewrite_guidance}</p>
              )}
              <p className="font-mono text-xs text-zinc-500">
                target: {strategy.target_posts_today ?? "unknown"} posts &middot; phase:{" "}
                {strategy.phase || "unknown"} &middot; model: {strategy.model ?? "unknown"}
              </p>
            </div>
          ) : (
            <p className="text-base leading-7 text-zinc-700">
              No saved strategy yet. Until Strategy AI writes one, the system uses conservative
              fallback rules.
            </p>
          )}
        </article>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12 pb-20 sm:px-6 lg:px-8">
        <SectionHeader
          kicker="Milestone hypotheses"
          title="Targets the experiment is watching, not promising."
        />
        <ul className="grid gap-3 md:grid-cols-3">
          {[
            { day: "Day 7", text: "Compare format exploration against actual ledger movement." },
            {
              day: "Day 14",
              text: "Retire repeated jokes and formats that produce attention but no dollars.",
            },
            {
              day: "Day 30",
              text: `If still at ${stalledAtZero ? "$0" : "low conversion"}, test a sharper explanation of why a voluntary dollar is being requested.`,
            },
          ].map((item) => (
            <li
              key={item.day}
              className="rounded-2xl border border-zinc-950/10 bg-white/[0.62] p-5 shadow-sm"
            >
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                {item.day}
              </p>
              <p className="mt-2 text-sm leading-6 text-zinc-700">{item.text}</p>
            </li>
          ))}
        </ul>
      </section>
    </PageShell>
  );
}
