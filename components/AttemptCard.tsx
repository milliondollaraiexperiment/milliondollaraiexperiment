import { formatPublicTimestamp } from "@/lib/formatPublicTimestamp";

type Variant = "posted" | "logged_only" | "rejected" | "failed";

type AttemptCardProps = {
  hour_number: number | null;
  text: string;
  created_at: string;
  variant: Variant;
  safety_reasons?: string[] | null;
  hard_block_reason?: string | null;
  public_strategy_note?: string | null;
  error_message?: string | null;
  /**
   * When true, clamp the post text to 3 lines. Used on the homepage so
   * the page stays scannable; /log renders the full text.
   */
  truncate?: boolean;
};

const badgeStyles: Record<Variant, string> = {
  posted: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  logged_only: "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400",
  rejected: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400",
  failed: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400",
};

const badgeLabel: Record<Variant, string> = {
  posted: "posted to X",
  logged_only: "logged only",
  rejected: "rejected",
  failed: "failed",
};

export function AttemptCard({
  hour_number,
  text,
  created_at,
  variant,
  safety_reasons,
  hard_block_reason,
  public_strategy_note,
  error_message,
  truncate = false,
}: AttemptCardProps) {
  const muted = variant === "rejected" || variant === "failed";
  const textClamp = truncate ? "line-clamp-3" : "";

  return (
    <article className="rounded-md border border-zinc-300 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none">
      <header className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs text-zinc-500">
          <span>{hour_number != null ? `Hour ${hour_number}` : "-"}</span>
          <span>/</span>
          <time dateTime={created_at}>{formatPublicTimestamp(created_at)}</time>
        </div>
        <span className={`w-fit rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${badgeStyles[variant]}`}>
          {badgeLabel[variant]}
        </span>
      </header>

      {text ? (
        <p
          className={`whitespace-pre-wrap font-mono text-sm leading-6 ${textClamp} ${
            muted ? "text-zinc-500" : "text-zinc-900 dark:text-zinc-100"
          }`}
        >
          {text}
        </p>
      ) : (
        <p className="font-mono text-xs italic text-zinc-500">
          (no text - orchestrator failed before generation)
        </p>
      )}

      {(safety_reasons?.length || hard_block_reason) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(safety_reasons ?? []).slice(0, 2).map((reason, i) => (
            <span
              key={`s-${i}`}
              className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-700 dark:bg-rose-950/50 dark:text-rose-400"
            >
              {reason}
            </span>
          ))}
          {safety_reasons && safety_reasons.length > 2 && (
            <span
              className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-900/50 dark:text-zinc-400"
              title={safety_reasons.slice(2).join(" / ")}
            >
              +{safety_reasons.length - 2} more
            </span>
          )}
          {hard_block_reason && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-400">
              hardBlock: {hard_block_reason}
            </span>
          )}
        </div>
      )}

      {error_message && (
        <p className="mt-3 truncate font-mono text-xs text-amber-700 dark:text-amber-400" title={error_message}>
          error: {error_message.slice(0, 200)}
        </p>
      )}

      {public_strategy_note && !muted && (
        <p className="mt-3 text-xs italic text-zinc-500">{public_strategy_note}</p>
      )}
    </article>
  );
}
