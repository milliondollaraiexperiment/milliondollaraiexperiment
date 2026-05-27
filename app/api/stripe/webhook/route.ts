export const dynamic = "force-dynamic";

export async function POST() {
  return Response.json(
    {
      status: "disabled",
      reason: "Stripe webhooks are disabled because the payment surface has been closed.",
    },
    { status: 410 },
  );
}
