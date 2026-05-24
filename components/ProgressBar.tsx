type Props = {
  current: number;
  goal: number;
  className?: string;
};

export function ProgressBar({ current, goal, className = "" }: Props) {
  const pct = goal > 0 ? Math.min(100, (current / goal) * 100) : 0;
  const visualPct = current > 0 && pct < 0.35 ? 0.35 : pct;
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);
  const pctLabel =
    current <= 0
      ? "awaiting first contribution"
      : pct < 0.01
        ? "first dollars recorded"
        : `${pct.toFixed(2)}% funded`;

  return (
    <div className={className}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">
            Public goal instrument
          </p>
          <p className="mt-1 flex flex-wrap items-baseline gap-x-2 font-mono text-xl font-semibold text-zinc-950 min-[380px]:text-2xl sm:text-4xl dark:text-zinc-50">
            {fmt(current)}
            <span className="text-zinc-400">/</span>
            <span className="text-zinc-500">{fmt(goal)}</span>
          </p>
        </div>
        <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-zinc-500 sm:text-right">
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-600 shadow-[0_0_0_6px_rgba(5,150,105,0.12),0_0_18px_rgba(5,150,105,0.26)]" />
            live ledger
          </span>
          <p className="mt-1">{pctLabel}</p>
        </div>
      </div>

      <div
        className="relative mt-4 h-4 w-full overflow-hidden rounded-full bg-zinc-950/[0.08] p-[3px] shadow-[inset_0_1px_2px_rgba(8,8,10,0.1),0_18px_45px_rgba(8,8,10,0.08)] sm:h-5 dark:bg-zinc-50/[0.12]"
        role="progressbar"
        aria-label="Fundraising progress"
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={current}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-zinc-950 via-zinc-800 to-amber-400 shadow-[0_0_24px_rgba(245,158,11,0.22)] transition-[width] duration-500 dark:from-zinc-50 dark:via-zinc-300 dark:to-amber-300"
          style={{ width: `${visualPct.toFixed(4)}%` }}
        />
        <div className="absolute left-2 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-zinc-950 shadow-[0_0_0_4px_rgba(255,255,255,0.76)] dark:bg-zinc-50" />
        <div className="absolute right-2 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-amber-400 shadow-[0_0_0_4px_rgba(255,255,255,0.76),0_0_18px_rgba(245,158,11,0.45)]" />
      </div>

      <p className="mt-2 flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-500">
        <span>{fmt(0)} start</span>
        <span className="text-right">{fmt(goal)} target</span>
      </p>
    </div>
  );
}
