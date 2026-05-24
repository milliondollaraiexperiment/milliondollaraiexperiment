const DAY_MS = 24 * 60 * 60 * 1000;

type UtcParts = {
  year: number;
  month: number;
  day: number;
};

function utcParts(date: Date): UtcParts {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function utcMidnight(parts: UtcParts): Date {
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
}

function addUtcDays(parts: UtcParts, days: number): UtcParts {
  const utc = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return {
    year: utc.getUTCFullYear(),
    month: utc.getUTCMonth() + 1,
    day: utc.getUTCDate(),
  };
}

function compareUtcParts(a: UtcParts, b: UtcParts): number {
  return Date.UTC(a.year, a.month - 1, a.day) - Date.UTC(b.year, b.month - 1, b.day);
}

function formatUtcDate(parts: UtcParts) {
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function getDailySummaryWindow(
  startedAtIso: string | null | undefined,
  now = new Date(),
) {
  const todayUtc = utcParts(now);
  const yesterdayUtc = addUtcDays(todayUtc, -1);
  const windowEnd = utcMidnight(todayUtc);
  let windowStart = utcMidnight(yesterdayUtc);
  let dayNumber = 1;

  if (startedAtIso) {
    const startedAt = new Date(startedAtIso);
    if (Number.isFinite(startedAt.getTime()) && startedAt > windowStart) {
      windowStart = startedAt;
    }
    const launchUtc = utcParts(startedAt);
    const daysSinceLaunch =
      Math.floor(
        (Date.UTC(yesterdayUtc.year, yesterdayUtc.month - 1, yesterdayUtc.day) -
          Date.UTC(launchUtc.year, launchUtc.month - 1, launchUtc.day)) /
          DAY_MS,
      ) + 1;
    dayNumber = Math.max(1, daysSinceLaunch);
  }

  const partial = Boolean(startedAtIso && compareUtcParts(yesterdayUtc, utcParts(new Date(startedAtIso))) === 0);
  return {
    dayNumber,
    windowStartIso: windowStart.toISOString(),
    windowEndIso: windowEnd.toISOString(),
    partial,
    etDate: formatUtcDate(yesterdayUtc),
  };
}

export function getCurrentEtDayWindow(now = new Date()) {
  const currentUtc = utcParts(now);
  const nextUtc = addUtcDays(currentUtc, 1);
  return {
    etDate: formatUtcDate(currentUtc),
    windowStartIso: utcMidnight(currentUtc).toISOString(),
    windowEndIso: utcMidnight(nextUtc).toISOString(),
  };
}

export function shouldBuildWeeklySummary(dayNumber: number) {
  return dayNumber > 0 && dayNumber % 7 === 0;
}

export function shouldBuildMonthlySummary(windowEndIso: string) {
  const endUtc = utcParts(new Date(windowEndIso));
  return endUtc.day === 1;
}

export function monthlyPeriodLabel(windowEndIso: string) {
  const previousMonthUtc = addUtcDays(utcParts(new Date(windowEndIso)), -1);
  return `${previousMonthUtc.year}-${String(previousMonthUtc.month).padStart(2, "0")}`;
}
