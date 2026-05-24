"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  initialElapsedSeconds: number;
  running: boolean;
  compact?: boolean;
};

function splitElapsed(totalSeconds: number) {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const months = Math.floor(clamped / (30 * 24 * 60 * 60));
  const days = Math.floor((clamped % (30 * 24 * 60 * 60)) / (24 * 60 * 60));
  const hours = Math.floor((clamped % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((clamped % (60 * 60)) / 60);
  const seconds = clamped % 60;
  return { months, days, hours, minutes, seconds };
}

function ClockUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-mono text-xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50 sm:text-2xl">
        {value.toString().padStart(2, "0")}
      </span>
      <span className="text-[11px] leading-tight text-zinc-500">{label}</span>
    </div>
  );
}

export function ElapsedClock({ initialElapsedSeconds, running, compact = false }: Props) {
  const [elapsedSeconds, setElapsedSeconds] = useState(initialElapsedSeconds);

  useEffect(() => {
    if (!running) return;

    const id = window.setInterval(() => {
      setElapsedSeconds((value) => value + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [initialElapsedSeconds, running]);

  const units = useMemo(() => splitElapsed(elapsedSeconds), [elapsedSeconds]);

  if (compact) {
    return (
      <div aria-label="Elapsed experiment time">
        <p className="truncate font-mono text-xl font-semibold text-zinc-950 sm:text-4xl">
          {units.months > 0 ? `${units.months}m ` : ""}
          {units.days > 0 ? `${units.days}d ` : ""}
          {units.hours.toString().padStart(2, "0")}:
          {units.minutes.toString().padStart(2, "0")}:
          {units.seconds.toString().padStart(2, "0")}
        </p>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-500">
          timer ticking
        </p>
      </div>
    );
  }

  return (
    <div
      className="mt-6 grid grid-cols-5 gap-x-3 gap-y-5 border-y border-zinc-200 py-5 dark:border-zinc-800"
      aria-label="Elapsed experiment time"
    >
      <ClockUnit value={units.months} label="months" />
      <ClockUnit value={units.days} label="days" />
      <ClockUnit value={units.hours} label="hours" />
      <ClockUnit value={units.minutes} label="minutes" />
      <ClockUnit value={units.seconds} label="seconds" />
    </div>
  );
}
