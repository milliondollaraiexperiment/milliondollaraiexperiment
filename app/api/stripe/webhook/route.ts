import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const SIGNING_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: Request) {
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
      const donorName = session.customer_details?.name ?? null;
      // No donor message yet — payment_link doesn't ship one out of the
      // box. Phase 7 (donor wall) wires custom fields.
      const donorMessage: string | null = null;

      const { error } = await supabaseAdmin.from("donations").insert({
        amount_cents: amount,
        donor_name: donorName,
        donor_message: donorMessage,
        provider: "stripe",
        provider_session_id: session.id,
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
