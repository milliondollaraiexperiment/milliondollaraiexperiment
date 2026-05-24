export function MiniStat({
  value,
  label,
}: {
  value: string | number;
  label: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl bg-zinc-950/[0.045] p-4">
      <p className="truncate font-mono text-lg font-semibold tracking-[-0.04em] text-zinc-950">
        {value}
      </p>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-500">
        {label}
      </p>
    </div>
  );
}
