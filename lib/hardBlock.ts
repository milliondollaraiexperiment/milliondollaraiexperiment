import type { HardBlockResult } from "./types";

const BANNED_PHRASES = [
  "guaranteed return",
  "profit",
  "equity",
  "investment",
  "charity",
  "emergency",
  "urgent",
  "dm me",
  "send me your",
  "i will die",
  "i need this to survive",
  "lottery",
  "raffle",
];

const SIMILARITY_THRESHOLD = 0.7;
const MAX_LENGTH = 270;
const MENTION_REGEX = /\B@\w+/;

export function hardBlock(text: string, recentPosts: string[] = []): HardBlockResult {
  const lower = text.toLowerCase();

  if (text.length > MAX_LENGTH) {
    return { ok: false, reason: "Post is too long" };
  }

  if (MENTION_REGEX.test(text)) {
    return { ok: false, reason: "Post contains @ mention" };
  }

  for (const phrase of BANNED_PHRASES) {
    if (lower.includes(phrase)) {
      return { ok: false, reason: `Blocked phrase: ${phrase}` };
    }
  }

  for (const recent of recentPosts) {
    if (diceSimilarity(lower, recent.toLowerCase()) > SIMILARITY_THRESHOLD) {
      return { ok: false, reason: "Too similar to a recent post" };
    }
  }

  return { ok: true, reason: "" };
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
