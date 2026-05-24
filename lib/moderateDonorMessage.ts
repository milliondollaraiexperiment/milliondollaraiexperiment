const MAX_DONOR_MESSAGE_LENGTH = 240;
const URL_REGEX = /https?:\/\/|www\./i;
const EMAIL_REGEX = /\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/i;
const PHONE_REGEX = /\b(?:\+?\d[\d\s().-]{7,}\d)\b/;
const HANDLE_REGEX = /[@#][A-Za-z0-9_]+/;
const PRIVATE_PAYMENT_REGEX = /\b(?:venmo|cash\s*app|cashapp|zelle|paypal|wire|telegram|whatsapp)\b/i;
const UNSAFE_PHRASES = [
  "guaranteed return",
  "investment opportunity",
  "profit share",
  "passive income",
  "lottery",
  "raffle",
  "sweepstakes",
  "medical emergency",
  "urgent crisis",
];
const PROMOTIONAL_REGEXES = [
  /\b(?:advertise|advertisement|advertising|sponsor|sponsored|sponsorship)\b/i,
  /\b(?:paid\s+promotion|promo(?:tion)?|promote|shout\s*out|shoutout)\b/i,
  /\b(?:affiliate|referral\s+code|promo\s+code|coupon|discount\s+code)\b/i,
  /\b(?:buy|try|use|download|install|subscribe\s+to|visit|check\s+out)\s+(?:my|our)\b/i,
  /\b(?:buy|try|use)\s+code\b/i,
  /\b(?:hire|book)\s+(?:me|us|a\s+call)\b/i,
  /\bfollow\s+(?:me|us|my|our)\b/i,
];

export function moderateDonorMessage(raw: string | null): string | null {
  const text = raw?.trim();
  if (!text) return null;

  if (
    URL_REGEX.test(text) ||
    EMAIL_REGEX.test(text) ||
    PHONE_REGEX.test(text) ||
    HANDLE_REGEX.test(text) ||
    PRIVATE_PAYMENT_REGEX.test(text)
  ) {
    return null;
  }

  const lower = text.toLowerCase();
  if (UNSAFE_PHRASES.some((phrase) => lower.includes(phrase))) {
    return null;
  }
  if (PROMOTIONAL_REGEXES.some((regex) => regex.test(text))) {
    return null;
  }

  return text.slice(0, MAX_DONOR_MESSAGE_LENGTH);
}
