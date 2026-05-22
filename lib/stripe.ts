import Stripe from "stripe";

// Lazy: do not instantiate at module load. Otherwise Next.js's
// "Collecting page data" build step (which evaluates route modules)
// crashes the entire build if STRIPE_SECRET_KEY happens to be missing
// during deploy — even though the failure should only surface at
// webhook request time.
let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY missing in env");
  }
  cached = new Stripe(key);
  return cached;
}
