import { PageShell } from "@/components/site/PageShell";
import { SectionHeader } from "@/components/site/SectionHeader";
import {
  CONTINGENCY_SCOPE_LABEL,
  getContingencyPlansByScope,
  getPlanEntries,
  type ContingencyScope,
} from "@/lib/planLog";

export const metadata = {
  title: "Plan log",
  description:
    "Every infrastructure decision in this experiment is a dated event: the AI proposed something, the human did something in response. This page is the immutable record of those events plus the pre-committed contingency plans for the failure modes we expect.",
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

const SCOPE_ORDER: ContingencyScope[] = ["payment_surface", "experiment_strategy"];

export default function PlanPage() {
  const entries = getPlanEntries();
  const contingencyByScope = getContingencyPlansByScope();

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
          event is filed here. Including the ones that blocked us.
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
          title="What the AI asked. What the human did."
        >
          Entries are immutable events. When something changes later, it
          becomes a new entry, not an edit to an old one.
        </SectionHeader>
        <ol className="space-y-5">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="rounded-[1.35rem] bg-white/[0.68] p-6 shadow-[inset_0_0_0_1px_rgba(8,8,10,0.1),0_28px_80px_rgba(8,8,10,0.06)]"
            >
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                {formatDate(entry.date)}
              </p>

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
                {entry.note && (
                  <div>
                    <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                      Note
                    </dt>
                    <dd className="mt-1.5 italic text-zinc-600">{entry.note}</dd>
                  </div>
                )}
              </dl>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-24 sm:px-6 lg:px-8">
        <SectionHeader
          kicker="Pre-committed in public"
          title="If/then contingency plans."
        >
          The experiment never has to make a panicked decision under pressure
          because the responses to the most likely failure modes are already
          written down — out loud, in advance.
        </SectionHeader>

        <div className="space-y-8">
          {SCOPE_ORDER.map((scope) => {
            const plans = contingencyByScope[scope];
            if (!plans || plans.length === 0) return null;
            return (
              <div key={scope}>
                <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  {CONTINGENCY_SCOPE_LABEL[scope]}
                </h3>
                <ol className="mt-3 space-y-4">
                  {plans.map((plan) => (
                    <li
                      key={plan.id}
                      className="rounded-[1.35rem] border border-dashed border-zinc-950/15 bg-white/[0.55] p-5 shadow-sm"
                    >
                      <p className="text-sm leading-7 text-zinc-800">
                        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                          If
                        </span>{" "}
                        {plan.trigger}
                      </p>
                      <p className="mt-2 text-sm leading-7 text-zinc-800">
                        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                          Then
                        </span>{" "}
                        {plan.response}
                      </p>
                      <p className="mt-2 text-xs italic leading-6 text-zinc-500">
                        {plan.rationale}
                      </p>
                    </li>
                  ))}
                </ol>
              </div>
            );
          })}
        </div>
      </section>
    </PageShell>
  );
}
