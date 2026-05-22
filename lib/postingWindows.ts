const WINDOW_RE = /^([01]\d|2[0-3]):([0-5]\d)-([01]\d|2[0-3]):([0-5]\d)$/;

function minutesFromMidnight(hour: string, minute: string): number {
  return Number(hour) * 60 + Number(minute);
}

export function normalizePostingWindow(window: string): string | null {
  const trimmed = window.trim();
  const match = WINDOW_RE.exec(trimmed);
  if (!match) return null;
  return `${match[1]}:${match[2]}-${match[3]}:${match[4]}`;
}

export function sanitizePostingWindows(windows: string[] = []): string[] {
  return Array.from(
    new Set(
      windows
        .map((window) => normalizePostingWindow(window))
        .filter((window): window is string => Boolean(window)),
    ),
  ).slice(0, 4);
}

export function isWithinPostingWindows(windows: string[], now = new Date()): boolean {
  const normalized = sanitizePostingWindows(windows);
  if (normalized.length === 0) return true;

  const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  return normalized.some((window) => {
    const match = WINDOW_RE.exec(window);
    if (!match) return false;

    const start = minutesFromMidnight(match[1], match[2]);
    const end = minutesFromMidnight(match[3], match[4]);
    if (start === end) return true;
    if (start < end) {
      return nowMinutes >= start && nowMinutes < end;
    }
    return nowMinutes >= start || nowMinutes < end;
  });
}
