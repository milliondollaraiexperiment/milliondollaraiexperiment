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

  return text.slice(0, MAX_DONOR_MESSAGE_LENGTH);
}
