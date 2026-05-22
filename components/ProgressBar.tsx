type Props = {
  current: number;
  goal: number;
};

export function ProgressBar({ current, goal }: Props) {
  const pct = goal > 0 ? Math.min(100, (current / goal) * 100) : 0;
  const visualPct = current > 0 && pct < 0.15 ? 0.15 : pct;
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

  return (
    <div>
      <div className="flex items-baseline justify-between text-sm font-mono">
        <span className="text-zinc-900 dark:text-zinc-50">
          <span className="text-2xl font-semibold tracking-tight">{fmt(current)}</span>
          <span className="text-zinc-500"> raised</span>
        </span>
        <span className="text-zinc-500">{fmt(goal)} goal</span>
      </div>
      <div
        className="mt-2 h-3 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
        role="progressbar"
        aria-label="Fundraising progress"
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={current}
      >
        <div
          className="h-full bg-zinc-900 transition-[width] duration-500 dark:bg-zinc-50"
          style={{ width: `${visualPct.toFixed(4)}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-zinc-500 font-mono">
        {pct < 0.01 ? "<0.01" : pct.toFixed(2)}% of the way to a million
      </p>
    </div>
  );
}
