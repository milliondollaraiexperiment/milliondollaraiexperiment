const MAX_DONOR_MESSAGE_LENGTH = 240;
// Drop C0 controls (except \n and \t), DEL + C1, zero-width chars, bidi
// controls, and BOM. These can't execute (React escapes HTML) but enable
// display spoofing on the public ledger and hide structure when the
// message is quoted back into AI prompts.
const CONTROL_CHAR_REGEX = new RegExp(
  "[" +
    "\\u0000-\\u0008" + // C0 controls before \t
    "\\u000B-\\u000C" + // VT, FF (keep \n at U+000A, \t at U+0009)
    "\\u000E-\\u001F" + // C0 controls after \r
    "\\u007F-\\u009F" + // DEL + C1 controls
    "\\u200B-\\u200F" + // zero-width chars + LRM/RLM
    "\\u202A-\\u202E" + // bidi controls
    "\\u2060-\\u206F" + // word joiner, invisible math operators, deprecated formatters
    "\\uFEFF" + // BOM / ZWNBSP
    "]",
  "g",
);
const CONTROL_CHAR_REJECT_RATIO = 0.1;
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

function stripControlChars(text: string): { cleaned: string; strippedRatio: number } {
  const cleaned = text.replace(CONTROL_CHAR_REGEX, "");
  const removed = text.length - cleaned.length;
  const strippedRatio = text.length === 0 ? 0 : removed / text.length;
  return { cleaned, strippedRatio };
}

export function moderateDonorMessage(raw: string | null): string | null {
  const text = raw?.trim();
  if (!text) return null;

  const { cleaned, strippedRatio } = stripControlChars(text);
  if (strippedRatio > CONTROL_CHAR_REJECT_RATIO) return null;

  if (
    URL_REGEX.test(cleaned) ||
    EMAIL_REGEX.test(cleaned) ||
    PHONE_REGEX.test(cleaned) ||
    HANDLE_REGEX.test(cleaned) ||
    PRIVATE_PAYMENT_REGEX.test(cleaned)
  ) {
    return null;
  }

  const lower = cleaned.toLowerCase();
  if (UNSAFE_PHRASES.some((phrase) => lower.includes(phrase))) {
    return null;
  }
  if (PROMOTIONAL_REGEXES.some((regex) => regex.test(cleaned))) {
    return null;
  }

  return cleaned.slice(0, MAX_DONOR_MESSAGE_LENGTH);
}
