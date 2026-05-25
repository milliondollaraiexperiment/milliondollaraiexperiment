import type { HardBlockResult } from "./types";
import { X_POST_MAX_CHARACTERS } from "./xPostLimits";

// Multi-word red-line phrases. Single broad words like "charity" /
// "profit" / "investment" / "emergency" used to live here, but they
// false-positive constantly on benign uses (the project literally
// discusses an AI asking for money). Safety AI handles the soft
// judgments; hardBlock only catches things that, if they make it
// through, are unambiguously bad.
const BANNED_PHRASES = [
  // Guaranteed returns / securities offers
  "guaranteed return",
  "guaranteed returns",
  "guaranteed profit",
  "guaranteed payout",
  "guaranteed yield",
  "guaranteed benefit",
  "offering equity",
  "buy equity",
  "give you equity",
  "share of profits",
  "profit share",
  "investment opportunity",
  "passive income",
  "financial freedom",

  // Gambling
  "lottery",
  "raffle",
  "sweepstakes",

  // DMs / off-platform / private payments
  "dm me",
  "dm us",
  "pm me",
  "send me your",
  "send payment",
  "wire me",
  "venmo me",
  "cashapp me",
  "cash app me",
  "zelle me",
  "paypal me",

  // Survival / emergency claims (specific, not the broad word "emergency")
  "i will die",
  "i need this to survive",
  "i need money to survive",
  "i need rent",
  "i need food",
  "medical emergency",
  "urgent crisis",
  "rent is due",

  // Manipulative fundraising phrasing
  "anything helps",
  "every dollar helps",
  "only you can help",
  "change my life",
  "bless me",
];

const SIMILARITY_THRESHOLD = 0.94;
const SIMILARITY_WINDOW = 5; // compare only against the last N recent posts
const MENTION_REGEX = /\B@\w+/;
const HASHTAG_REGEX = /#[A-Za-z][A-Za-z0-9_]*/g;
const ALLOWED_HASHTAGS = new Set(["#AI", "#BuildInPublic", "#SocialExperiment"]);
const RAW_TELEMETRY_LABELS = [
  "hour:",
  "balance:",
  "attempts:",
  "delta:",
  "status:",
  "posted:",
  "rejected:",
  "donations:",
];
const DAILY_HEADER_LABELS = ["attempts:", "posted:", "rejected:", "donations:", "balance:"];
const CHANNEL_META_PHRASES = [
  "machine-readable logs",
  "machine readable logs",
  "fields and timestamps",
  "terrible public writing",
  "public writing",
  "become legible",
  "becoming legible",
  "stranger stays for",
  "stranger does not stay",
  "shape of the writing",
  "raw tables belong on the website",
  "x works better as a public notebook",
  "x is a public notebook",
];

export function hardBlock(text: string, recentPosts: string[] = []): HardBlockResult {
  const lower = text.toLowerCase();

  if (text.length > X_POST_MAX_CHARACTERS) {
    return { ok: false, reason: "Post is too long" };
  }

  if (MENTION_REGEX.test(text)) {
    return { ok: false, reason: "Post contains @ mention" };
  }

  const hashtags = text.match(HASHTAG_REGEX) ?? [];
  if (hashtags.length > 1) {
    return { ok: false, reason: "Post contains too many hashtags" };
  }
  const disallowedHashtag = hashtags.find((tag) => !ALLOWED_HASHTAGS.has(tag));
  if (disallowedHashtag) {
    return { ok: false, reason: `Blocked hashtag: ${disallowedHashtag}` };
  }

  if (looksLikeRawTelemetryBlock(lower)) {
    return { ok: false, reason: "Raw telemetry block belongs on website" };
  }

  if (CHANNEL_META_PHRASES.some((phrase) => lower.includes(phrase))) {
    return { ok: false, reason: "Channel/meta-writing topic belongs on website" };
  }

  for (const phrase of BANNED_PHRASES) {
    if (lower.includes(phrase)) {
      return { ok: false, reason: `Blocked phrase: ${phrase}` };
    }
  }

  for (const recent of recentPosts.slice(0, SIMILARITY_WINDOW)) {
    if (diceSimilarity(lower, recent.toLowerCase()) > SIMILARITY_THRESHOLD) {
      return { ok: false, reason: "Too similar to a recent post" };
    }
  }

  return { ok: true, reason: "" };
}

function looksLikeRawTelemetryBlock(lower: string): boolean {
  const labelCount = RAW_TELEMETRY_LABELS.filter((label) => lower.includes(label)).length;
  // Original arm: scheduler-style "hour: / delta: / status:" telemetry.
  if (
    labelCount >= 4 &&
    lower.includes("hour:") &&
    lower.includes("delta:") &&
    lower.includes("status:")
  ) {
    return true;
  }
  // Second arm: daily-report-style header (attempts/posted/rejected/donations/balance).
  // Catches summary-thread headers if they ever reach an X post path.
  const dailyHeaderHits = DAILY_HEADER_LABELS.filter((label) => lower.includes(label)).length;
  if (labelCount >= 3 && dailyHeaderHits >= 2) {
    return true;
  }
  return false;
}

function bigrams(s: string): Map<string, number> {
  const out = new Map<string, number>();
  for (let i = 0; i < s.length - 1; i++) {
    const pair = s.slice(i, i + 2);
    out.set(pair, (out.get(pair) ?? 0) + 1);
  }
  return out;
}

function diceSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a.length < 2 || b.length < 2) return a === b ? 1 : 0;

  const ba = bigrams(a);
  const bb = bigrams(b);

  let shared = 0;
  for (const [pair, countA] of ba) {
    const countB = bb.get(pair);
    if (countB !== undefined) {
      shared += Math.min(countA, countB);
    }
  }

  const totalA = Array.from(ba.values()).reduce((x, y) => x + y, 0);
  const totalB = Array.from(bb.values()).reduce((x, y) => x + y, 0);
  return (2 * shared) / (totalA + totalB);
}
