import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase";
import { AttemptCard } from "@/components/AttemptCard";

export const dynamic = "force-dynamic";

type StatusFilter = "all" | "visible" | "posted" | "logged_only" | "rejected" | "failed";

const VALID_FILTERS: StatusFilter[] = [
  "all",
  "visible",
  "posted",
  "logged_only",
  "rejected",
  "failed",
];

const FILTER_LABELS: Record<StatusFilter, string> = {
  all: "All",
  visible: "Posted + logged",
  posted: "Posted to X",
  logged_only: "Logged only",
  rejected: "Rejected",
  failed: "Failed",
};

const PAGE_LIMIT = 100;

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

function normalizeFilter(raw: string | string[] | undefined): StatusFilter {
  if (Array.isArray(raw)) raw = raw[0];
  if (raw && (VALID_FILTERS as string[]).includes(raw)) return raw as StatusFilter;
  return "all";
}

async function loadAttempts(filter: StatusFilter) {
  let query = supabaseAdmin
    .from("attempts")
    .select(
      "id,hour_number,text,status,safety_reasons,hard_block_reason,public_strategy_note,error_message,created_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .limit(PAGE_LIMIT);

  if (filter === "visible") {
    query = query.in("status", ["posted", "logged_only"]);
  } else if (filter !== "all") {
    query = query.eq("status", filter);
  }

  const { data, count } = await query;
  return { rows: (data ?? []) as AttemptRow[], total: count ?? 0 };
}

export default async function LogPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[] }>;
}) {
  const params = await searchParams;
  const filter = normalizeFilter(params.status);
  const { rows, total } = await loadAttempts(filter);

  return (
    <div className="min-h-full bg-stone-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <main className="mx-auto w-full max-w-2xl px-6 py-12 sm:py-16">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
          <Link
            href="/"
            className="hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            ← back to home
          </Link>
        </p>
        <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
          Public Attempt Log
        </h1>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          Every candidate post the AI has generated, in the order it generated them. Nothing is
          ever deleted from this log — even rejected attempts that never reached X.
        </p>

        <nav className="mt-8 flex flex-wrap gap-2 border-b border-zinc-200 pb-3 dark:border-zinc-800">
          {VALID_FILTERS.map((f) => {
            const active = filter === f;
            return (
              <Link
                key={f}
                href={f === "all" ? "/log" : `/log?status=${f}`}
                className={
                  active
                    ? "rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                    : "rounded-full px-3 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
                }
              >
                {FILTER_LABELS[f]}
              </Link>
            );
          })}
        </nav>

        <p className="mt-4 text-[11px] text-zinc-500">
          {rows.length === 0
            ? `No attempts match this filter.`
            : `Showing ${rows.length} of ${total}${total > PAGE_LIMIT ? ` (most recent)` : ""}.`}
        </p>

        <div className="mt-4 space-y-3">
          {rows.map((row) => (
            <AttemptCard
              key={row.id}
              hour_number={row.hour_number}
              text={row.text}
              created_at={row.created_at}
              variant={row.status}
              safety_reasons={row.safety_reasons}
              hard_block_reason={row.hard_block_reason}
              public_strategy_note={row.public_strategy_note}
              error_message={row.error_message}
            />
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            ← back to home
          </Link>
        </div>
      </main>
    </div>
  );
}
