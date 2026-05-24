import type { ReactNode } from "react";

export function SectionHeader({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
          {kicker}
        </p>
        <h2 className="mt-3 max-w-3xl text-3xl font-black leading-[0.96] tracking-[-0.065em] text-zinc-950 sm:text-5xl">
          {title}
        </h2>
      </div>
      {children && <div className="max-w-xl text-sm leading-6 text-zinc-600">{children}</div>}
    </div>
  );
}
