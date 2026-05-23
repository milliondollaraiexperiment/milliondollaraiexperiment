const ET_TIME_ZONE = "America/New_York";
const DAY_MS = 24 * 60 * 60 * 1000;

type EtParts = {
  year: number;
  month: number;
  day: number;
};

const etDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: ET_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const etOffsetFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: ET_TIME_ZONE,
  timeZoneName: "shortOffset",
});

function etParts(date: Date): EtParts {
  const parts = etDateFormatter.formatToParts(date);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
  };
}

function etOffsetMs(date: Date): number {
  const timeZoneName = etOffsetFormatter
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value;
  const match = /^GMT([+-])(\d{1,2})(?::(\d{2}))?$/.exec(timeZoneName ?? "");
  if (!match) {
    return -4 * 60 * 60 * 1000;
  }
  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = Number(match[3] ?? 0);
  return sign * (hours * 60 + minutes) * 60 * 1000;
}

function etMidnightUtc(parts: EtParts): Date {
  let utcMs = Date.UTC(parts.year, parts.month - 1, parts.day);
  utcMs -= etOffsetMs(new Date(utcMs));
  utcMs = Date.UTC(parts.year, parts.month - 1, parts.day) - etOffsetMs(new Date(utcMs));
  return new Date(utcMs);
}

function addEtDays(parts: EtParts, days: number): EtParts {
  const utc = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return {
    year: utc.getUTCFullYear(),
    month: utc.getUTCMonth() + 1,
    day: utc.getUTCDate(),
  };
}

function compareEtParts(a: EtParts, b: EtParts): number {
  return Date.UTC(a.year, a.month - 1, a.day) - Date.UTC(b.year, b.month - 1, b.day);
}

export function getDailySummaryWindow(
  startedAtIso: string | null | undefined,
  now = new Date(),
) {
  const todayEt = etParts(now);
  const yesterdayEt = addEtDays(todayEt, -1);
  const windowEnd = etMidnightUtc(todayEt);
  let windowStart = etMidnightUtc(yesterdayEt);
  let dayNumber = 1;

  if (startedAtIso) {
    const startedAt = new Date(startedAtIso);
    if (Number.isFinite(startedAt.getTime()) && startedAt > windowStart) {
      windowStart = startedAt;
    }
    const launchEt = etParts(startedAt);
    const daysSinceLaunch =
      Math.floor(
        (Date.UTC(yesterdayEt.year, yesterdayEt.month - 1, yesterdayEt.day) -
          Date.UTC(launchEt.year, launchEt.month - 1, launchEt.day)) /
          DAY_MS,
      ) + 1;
    dayNumber = Math.max(1, daysSinceLaunch);
  }

  const partial = Boolean(startedAtIso && compareEtParts(yesterdayEt, etParts(new Date(startedAtIso))) === 0);
  return {
    dayNumber,
    windowStartIso: windowStart.toISOString(),
    windowEndIso: windowEnd.toISOString(),
    partial,
    etDate: `${yesterdayEt.year}-${String(yesterdayEt.month).padStart(2, "0")}-${String(
      yesterdayEt.day,
    ).padStart(2, "0")}`,
  };
}

export function getCurrentEtDayWindow(now = new Date()) {
  const currentEt = etParts(now);
  const nextEt = addEtDays(currentEt, 1);
  return {
    etDate: `${currentEt.year}-${String(currentEt.month).padStart(2, "0")}-${String(
      currentEt.day,
    ).padStart(2, "0")}`,
    windowStartIso: etMidnightUtc(currentEt).toISOString(),
    windowEndIso: etMidnightUtc(nextEt).toISOString(),
  };
}

export function shouldBuildWeeklySummary(dayNumber: number) {
  return dayNumber > 0 && dayNumber % 7 === 0;
}

export function shouldBuildMonthlySummary(windowEndIso: string) {
  const endEt = etParts(new Date(windowEndIso));
  return endEt.day === 1;
}

export function monthlyPeriodLabel(windowEndIso: string) {
  const previousMonthEt = addEtDays(etParts(new Date(windowEndIso)), -1);
  return `${previousMonthEt.year}-${String(previousMonthEt.month).padStart(2, "0")}`;
}
