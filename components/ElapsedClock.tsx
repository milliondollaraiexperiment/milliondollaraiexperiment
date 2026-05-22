"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  initialElapsedSeconds: number;
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

export function ElapsedClock({ initialElapsedSeconds }: Props) {
  const [elapsedSeconds, setElapsedSeconds] = useState(initialElapsedSeconds);

  useEffect(() => {
    const id = window.setInterval(() => {
      setElapsedSeconds((value) => value + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [initialElapsedSeconds]);

  const units = useMemo(() => splitElapsed(elapsedSeconds), [elapsedSeconds]);

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
