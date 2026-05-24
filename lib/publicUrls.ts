export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://themilliondollaraiexperiment.com";

export const X_PROFILE_URL =
  process.env.NEXT_PUBLIC_X_PROFILE_URL ?? "https://x.com/MDAIExperiment";

export const CONTRIBUTION_URL = process.env.NEXT_PUBLIC_CONTRIBUTION_URL ?? "";

// Backward-compatible alias for older imports. This is intentionally empty
// unless a current, approved contribution surface is configured.
export const DONATION_URL = CONTRIBUTION_URL;

export function absoluteUrl(path = "/") {
  return new URL(path, SITE_URL).toString();
}

export function shareOnXUrl(text: string, url: string) {
  let safeUrl = SITE_URL;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      safeUrl = parsed.toString();
    }
  } catch {
    // fall through to SITE_URL
  }
  const params = new URLSearchParams({ text, url: safeUrl });
  return `https://x.com/intent/tweet?${params.toString()}`;
}
