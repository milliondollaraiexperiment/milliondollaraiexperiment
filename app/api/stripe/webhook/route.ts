import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";
import { moderateDonorMessage } from "@/lib/moderateDonorMessage";

export const dynamic = "force-dynamic";

type DonationInsert = {
  amount_cents: number;
  donor_name: null;
  donor_message: string | null;
  provider: "stripe";
  provider_session_id: string;
  gross_amount_cents?: number;
  stripe_fee_cents?: number | null;
  net_amount_cents?: number | null;
  currency?: string;
  paid_at?: string;
  stripe_payment_intent_id?: string | null;
  stripe_charge_id?: string | null;
  stripe_balance_transaction_id?: string | null;
  stripe_fee_details?: Stripe.BalanceTransaction.FeeDetail[] | null;
};

function objectId(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

async function getStripeAccounting(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
): Promise<Partial<DonationInsert>> {
  const paymentIntentId = objectId(session.payment_intent);
  if (!paymentIntentId) {
    return {};
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
    expand: ["latest_charge.balance_transaction"],
  });
  const charge = paymentIntent.latest_charge;
  const chargeId = objectId(charge);

  let balanceTransaction: Stripe.BalanceTransaction | null = null;
  if (charge && typeof charge !== "string") {
    const balance = charge.balance_transaction;
    if (balance && typeof balance !== "string") {
      balanceTransaction = balance;
    } else if (typeof balance === "string") {
      balanceTransaction = await stripe.balanceTransactions.retrieve(balance);
    }
  }

  return {
    stripe_payment_intent_id: paymentIntentId,
    stripe_charge_id: chargeId,
    stripe_balance_transaction_id: balanceTransaction?.id ?? null,
    stripe_fee_cents: balanceTransaction?.fee ?? null,
    net_amount_cents: balanceTransaction?.net ?? null,
    currency: (balanceTransaction?.currency ?? session.currency ?? "usd").toLowerCase(),
    stripe_fee_details: balanceTransaction?.fee_details ?? null,
  };
}

async function insertDonation(row: DonationInsert) {
  const { error } = await supabaseAdmin.from("donations").insert(row);
  if (!error || error.code === "23505") {
    return error;
  }

  // If the accounting SQL has not been run yet, keep the live webhook safe.
  // Supabase can report missing columns either as Postgres 42703 or REST schema-cache errors.
  if (error.code === "42703" || error.code?.startsWith("PGRST")) {
    const fallback = {
      amount_cents: row.amount_cents,
      donor_name: row.donor_name,
      donor_message: row.donor_message,
      provider: row.provider,
      provider_session_id: row.provider_session_id,
    };
    const fallbackRes = await supabaseAdmin.from("donations").insert(fallback);
    return fallbackRes.error;
  }

  return error;
}

export async function POST(req: Request) {
  const SIGNING_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
  if (!SIGNING_SECRET) {
    return Response.json(
      { error: "STRIPE_WEBHOOK_SECRET not configured on the server" },
      { status: 500 },
    );
  }

  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return Response.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let stripe: Stripe;
  try {
    stripe = getStripe();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, SIGNING_SECRET);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Signature verification failed";
    return Response.json({ error: message }, { status: 400 });
  }

  // Payment Links surface successful payments as Checkout Sessions.
  // We listen for the terminal "completed" event to record one donation per
  // session. Stripe may redeliver the same event — `provider_session_id`
  // has a UNIQUE constraint so a duplicate insert is silently a no-op.
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const amount = session.amount_total ?? session.amount_subtotal ?? 0;

    if (amount > 0 && session.payment_status === "paid") {
      // Donor message: extract from the Payment Link's custom_fields.
      // We accept whatever the first text-type custom field returns, so
      // the merchant can name the field whatever in the Stripe dashboard
      // (e.g. "Optional public message", "Note", "Why are you donating").
      // Capped at 280 chars defensively even though Stripe enforces ~255.
      const messageField = (session.custom_fields ?? []).find(
        (f) => f.type === "text" && f.text?.value,
      );
      const rawMessage = messageField?.text?.value ?? null;
      const donorMessage = moderateDonorMessage(rawMessage);
      const paidAt = new Date((session.created || event.created) * 1000).toISOString();

      let accounting: Partial<DonationInsert> = {};
      try {
        accounting = await getStripeAccounting(stripe, session);
      } catch {
        accounting = {};
      }

      const error = await insertDonation({
        amount_cents: amount,
        gross_amount_cents: amount,
        donor_name: null,
        donor_message: donorMessage,
        provider: "stripe",
        provider_session_id: session.id,
        currency: (session.currency ?? "usd").toLowerCase(),
        paid_at: paidAt,
        ...accounting,
      });

      if (error && error.code !== "23505") {
        // 23505 = unique_violation = retry of a session we already saw. Fine.
        return Response.json({ error: error.message }, { status: 500 });
      }
    }
  }

  // Acknowledge anything else (charge.succeeded, payment_intent.*, etc.)
  // so Stripe doesn't retry indefinitely.
  return Response.json({ received: true });
}
