import type { ReactNode } from "react";

type PillTone = "neutral" | "green" | "blue" | "amber";

const STYLES: Record<PillTone, string> = {
  neutral: "bg-zinc-950/[0.06] text-zinc-700",
  green: "bg-emerald-600/[0.12] text-emerald-800",
  blue: "bg-blue-600/[0.12] text-blue-800",
  amber: "bg-amber-500/[0.18] text-amber-800",
};

export function Pill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: PillTone;
}) {
  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-full px-3 text-[11px] font-bold ${STYLES[tone]}`}
    >
      {children}
    </span>
  );
}
