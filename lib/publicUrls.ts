export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://themilliondollaraiexperiment.com";

export const X_PROFILE_URL =
  process.env.NEXT_PUBLIC_X_PROFILE_URL ?? "https://x.com/FundMeBotAI";

export const DONATION_URL = "https://donate.stripe.com/7sY00k0t0fdJ4n1eCP9AA01";

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
