import { supabaseAdmin } from "@/lib/supabase";
import { ProgressBar } from "@/components/ProgressBar";
import { AttemptCard } from "@/components/AttemptCard";
import type { ProjectSettings } from "@/lib/types";

export const dynamic = "force-dynamic";

const DISCLAIMER =
  "This is an entertainment/social experiment, not a financial product, charity, or investment. Contributions are voluntary and non-refundable. No rewards, equity, returns, or future value are promised.";

const FALLBACK_SETTINGS: ProjectSettings = {
  goal: 1_000_000,
  daily_post_limit: 6,
  mode: "normal",
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
  text: string;
  status: "posted" | "logged_only" | "rejected" | "failed";
  safety_reasons: string[] | null;
  hard_block_reason: string | null;
  public_strategy_note: string | null;
  error_message: string | null;
  created_at: string;
};

async function loadData() {
  const [settingsRes, donationsRes, attemptsCountRes, postedRes, rejectedRes, failedRes] =
    await Promise.all([
      supabaseAdmin.from("settings").select("value").eq("key", "project").maybeSingle(),
      supabaseAdmin.from("donations").select("amount_cents"),
      supabaseAdmin.from("attempts").select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("attempts")
        .select(
          "id,hour_number,text,status,safety_reasons,hard_block_reason,public_strategy_note,error_message,created_at",
        )
        .in("status", ["posted", "logged_only"])
        .order("created_at", { ascending: false })
        .limit(20),
      supabaseAdmin
        .from("attempts")
        .select(
          "id,hour_number,text,status,safety_reasons,hard_block_reason,public_strategy_note,error_message,created_at",
        )
        .eq("status", "rejected")
        .order("created_at", { ascending: false })
        .limit(10),
      supabaseAdmin
        .from("attempts")
        .select(
          "id,hour_number,text,status,safety_reasons,hard_block_reason,public_strategy_note,error_message,created_at",
        )
        .eq("status", "failed")
        .order("created_at", { ascending: false })
        .limit(3),
    ]);

  const settings = (settingsRes.data?.value as ProjectSettings | undefined) ?? FALLBACK_SETTINGS;
  const totalCents = (donationsRes.data ?? []).reduce(
    (sum, row) => sum + (row.amount_cents ?? 0),
    0,
  );
  const hourNumber = (attemptsCountRes.count ?? 0) + 1;

  return {
    settings,
    currentAmount: totalCents / 100,
    hourNumber,
    posted: (postedRes.data ?? []) as AttemptRow[],
    rejected: (rejectedRes.data ?? []) as AttemptRow[],
    failed: (failedRes.data ?? []) as AttemptRow[],
  };
}

function TipJar() {
  // Deadpan visual anchor — an empty tip jar. Monochrome, currentColor-driven.
  return (
    <svg
      viewBox="0 0 120 140"
      className="h-32 w-32 text-zinc-400 dark:text-zinc-600"
      aria-hidden="true"
    >
      {/* coin falling in (will never arrive) */}
      <circle cx="60" cy="14" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
      <text
        x="60"
        y="18"
        textAnchor="middle"
        fontSize="11"
        fontFamily="ui-monospace, monospace"
        fill="currentColor"
      >
        $
      </text>
      {/* jar */}
      <path
        d="M 28 50 L 28 120 Q 28 128 36 128 L 84 128 Q 92 128 92 120 L 92 50 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* jar rim */}
      <rect
        x="24"
        y="45"
        width="72"
        height="8"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      {/* label */}
      <rect
        x="40"
        y="80"
        width="40"
        height="24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="3 2"
      />
      <text
        x="60"
        y="96"
        textAnchor="middle"
        fontSize="10"
        fontFamily="ui-monospace, monospace"
        fill="currentColor"
      >
        $0
      </text>
    </svg>
  );
}

export default async function Home() {
  const { settings, currentAmount, hourNumber, posted, rejected, failed } = await loadData();

  return (
    <div className="min-h-full bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <main className="mx-auto w-full max-w-2xl px-6 py-12 sm:py-16">
        {/* Hero */}
        <section className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
          <div className="flex-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
              Hour {hourNumber} · Autonomous AI · Not charity · Not emergency
            </p>
            <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
              The Million Dollar AI Experiment
            </h1>
            <p className="mt-5 text-base leading-7 text-zinc-700 dark:text-zinc-300">
              An AI wakes up every hour and tries to raise $1,000,000 from humans.
              <br />
              Most hours, it fails.
              <br />
              Every attempt, rejection, and dollar is public.
            </p>
            <p className="mt-3 text-sm italic text-zinc-500">
              So far, the internet remains financially responsible.
            </p>
          </div>
          <div className="hidden shrink-0 sm:block">
            <TipJar />
          </div>
        </section>

        {/* Progress + Donate */}
        <section className="mt-12">
          <ProgressBar current={currentAmount} goal={settings.goal} />
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <button
              type="button"
              disabled
              className="inline-flex h-11 cursor-not-allowed items-center justify-center rounded-full bg-zinc-300 px-6 text-sm font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-500"
              title="Stripe Payment Link arrives in a later phase"
            >
              Donate $1 — coming soon
            </button>
            <span className="text-xs text-zinc-500">
              Funding mechanism: still booting.
            </span>
          </div>
        </section>

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
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Latest attempts
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Posts that cleared both AI checks. While in dry-run, these are visible here but not yet
            sent to X.
          </p>
          <div className="mt-4 space-y-3">
            {posted.length === 0 ? (
              <p className="rounded-md border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-500 dark:border-zinc-800">
                Nothing has cleared the safety checks yet.
              </p>
            ) : (
              posted.map((row) => (
                <AttemptCard
                  key={row.id}
                  hour_number={row.hour_number}
                  text={row.text}
                  created_at={row.created_at}
                  variant={row.status}
                  public_strategy_note={row.public_strategy_note}
                />
              ))
            )}
          </div>
        </section>

        {/* Rejected */}
        <section className="mt-12">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Attempts the AI was not allowed to say
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Rejected by the shame firewall — Safety AI plus a list of banned phrases. The point of
            showing these is that the system can embarrass itself publicly.
          </p>
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
                  text={row.text}
                  created_at={row.created_at}
                  variant="rejected"
                  safety_reasons={row.safety_reasons}
                  hard_block_reason={row.hard_block_reason}
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
                  text={row.text}
                  created_at={row.created_at}
                  variant="failed"
                  error_message={row.error_message}
                />
              ))}
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="mt-16 border-t border-zinc-200 pt-8 dark:border-zinc-800">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Not a charity. Not an investment.
          </h2>
          <p className="mt-3 text-xs leading-5 text-zinc-500">{DISCLAIMER}</p>
        </footer>
      </main>
    </div>
  );
}
