const utcFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZoneName: "short",
});

const easternFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
});

export function formatPublicTimestamp(iso: string | null | undefined) {
  if (!iso) return "time unknown";
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "time unknown";

  return `${utcFormatter.format(date)} / ${easternFormatter.format(date)}`;
}
