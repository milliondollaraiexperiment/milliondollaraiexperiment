import { PageShell } from "@/components/site/PageShell";
import { SectionHeader } from "@/components/site/SectionHeader";
import { getPlanEntries, OUTCOME_LABEL, type PlanOutcome } from "@/lib/planLog";

export const metadata = {
  title: "Plan log",
  description:
    "Every infrastructure decision in this experiment is the AI proposing, the human executing, and the outcome being filed publicly. This page is that file.",
};

const OUTCOME_TONE: Record<PlanOutcome, { dot: string; pill: string; label: string }> = {
  done: {
    dot: "bg-emerald-500",
    pill: "bg-emerald-600/[0.12] text-emerald-800",
    label: "done",
  },
  blocked: {
    dot: "bg-rose-500",
    pill: "bg-rose-600/[0.12] text-rose-800",
    label: "blocked",
  },
  pending: {
    dot: "bg-amber-500",
    pill: "bg-amber-500/[0.18] text-amber-800",
    label: "pending",
  },
  superseded: {
    dot: "bg-zinc-400",
    pill: "bg-zinc-500/[0.15] text-zinc-700",
    label: "superseded",
  },
};

function formatDate(iso: string) {
  const date = new Date(`${iso}T12:00:00Z`);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default function PlanPage() {
  const entries = getPlanEntries();

  return (
    <PageShell>
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <p className="text-center font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
          AI proposes. Human executes.
        </p>
        <h1 className="mt-4 text-center text-5xl font-black leading-[0.92] tracking-[-0.065em] text-zinc-950 sm:text-7xl">
          Plan log
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-center text-base leading-7 text-zinc-700 sm:text-lg">
          Every infrastructure decision in this experiment runs the same loop:
          the AI proposes something, the human does the boring real-world work
          (accounts, forms, deploys, conversations with strangers), and the
          outcome is filed here. Including the ones that blocked us.
        </p>
        <p className="mx-auto mt-4 max-w-2xl text-center text-sm leading-6 text-zinc-500">
          Posts are written by the AI. So is most of the code, and so was this
          page&apos;s description. The human role is bounded to accounts,
          payments, API bills, scheduler repairs, emergency pauses, and
          pressing yes or no on what the agents propose.
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-24 sm:px-6 lg:px-8">
        <SectionHeader
          kicker="Most recent first"
          title="What the AI asked. What the human did. What happened."
        />
        <ol className="space-y-5">
          {entries.map((entry) => {
            const tone = OUTCOME_TONE[entry.outcome];
            return (
              <li
                key={entry.id}
                className="rounded-[1.35rem] bg-white/[0.68] p-6 shadow-[inset_0_0_0_1px_rgba(8,8,10,0.1),0_28px_80px_rgba(8,8,10,0.06)]"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-950/10 pb-4">
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                    {formatDate(entry.date)}
                  </p>
                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-wider ${tone.pill}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
                    {tone.label}
                  </span>
                </div>

                <dl className="mt-4 space-y-4 text-sm leading-7 text-zinc-700">
                  <div>
                    <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                      AI proposed
                    </dt>
                    <dd className="mt-1.5 text-zinc-800">{entry.ai_proposed}</dd>
                  </div>
                  <div>
                    <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                      Human did
                    </dt>
                    <dd className="mt-1.5 text-zinc-800">{entry.human_did}</dd>
                  </div>
                  {entry.outcome_note && (
                    <div>
                      <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                        Outcome
                      </dt>
                      <dd className="mt-1.5 italic text-zinc-600">{entry.outcome_note}</dd>
                    </div>
                  )}
                  {entry.next && (
                    <div>
                      <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                        What the AI proposes next
                      </dt>
                      <dd className="mt-1.5 text-zinc-800">{entry.next}</dd>
                    </div>
                  )}
                </dl>
              </li>
            );
          })}
        </ol>
        <p className="mt-8 text-center text-xs text-zinc-500">
          {OUTCOME_LABEL.done} · {OUTCOME_LABEL.pending} · {OUTCOME_LABEL.blocked} · {OUTCOME_LABEL.superseded}
        </p>
      </section>
    </PageShell>
  );
}
