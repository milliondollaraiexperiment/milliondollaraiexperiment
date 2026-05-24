import { formatPublicTimestamp } from "@/lib/formatPublicTimestamp";
import { attemptShareUrl } from "@/lib/attemptShare";

type Variant = "posted" | "logged_only" | "rejected" | "failed";

type AttemptCardProps = {
  id?: string;
  hour_number: number | null;
  post_type?: string | null;
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

const postTypeLabel: Record<string, string> = {
  daily_summary_thread: "daily summary thread",
  weekly_summary_thread: "weekly summary thread",
  monthly_summary_thread: "monthly summary thread",
  final_report_thread: "final report thread",
};

export function AttemptCard({
  id,
  hour_number,
  post_type,
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
  const canShare = Boolean(id && variant !== "failed");
  const shareHref = id
    ? attemptShareUrl({ id, status: variant, postType: post_type, text })
    : null;

  return (
    <article
      id={id ? `attempt-${id}` : undefined}
      className="scroll-mt-6 min-w-0 overflow-hidden rounded-md border border-zinc-300 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none"
    >
      <header className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 break-words [overflow-wrap:anywhere] flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs text-zinc-500">
          <span>{hour_number != null ? `Hour ${hour_number}` : "-"}</span>
          <span>/</span>
          <time dateTime={created_at}>{formatPublicTimestamp(created_at)}</time>
        </div>
        <span className={`w-fit rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${badgeStyles[variant]}`}>
          {badgeLabel[variant]}
        </span>
      </header>

      {post_type && postTypeLabel[post_type] && (
        <p className="mb-3 w-fit rounded-full border border-zinc-200 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-zinc-500 dark:border-zinc-800">
          {postTypeLabel[post_type]}
        </p>
      )}

      {text ? (
        <p
          className={`whitespace-pre-wrap break-words [overflow-wrap:anywhere] font-mono text-sm leading-6 ${textClamp} ${
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
              className="max-w-full break-words rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-700 [overflow-wrap:anywhere] dark:bg-rose-950/50 dark:text-rose-400"
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
            <span className="max-w-full break-words rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800 [overflow-wrap:anywhere] dark:bg-amber-950/50 dark:text-amber-400">
              hardBlock: {hard_block_reason}
            </span>
          )}
        </div>
      )}

      {error_message && (
        <p className="mt-3 whitespace-pre-wrap break-words [overflow-wrap:anywhere] font-mono text-xs leading-5 text-amber-700 dark:text-amber-400">
          error: {error_message}
        </p>
      )}

      {public_strategy_note && !muted && (
        <p className="mt-3 text-xs italic text-zinc-500">{public_strategy_note}</p>
      )}

      {canShare && shareHref && (
        <div className="mt-4">
          <a
            href={shareHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-8 items-center rounded-full border border-zinc-300 px-3 text-xs font-medium text-zinc-600 transition-colors hover:border-zinc-500 hover:text-zinc-950 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-50"
          >
            Share on X
          </a>
        </div>
      )}
    </article>
  );
}
