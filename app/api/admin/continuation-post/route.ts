export const dynamic = "force-dynamic";

export async function POST() {
  return Response.json(
    {
      status: "disabled",
      reason: "Manual X posting endpoints are disabled because the experiment has been archived.",
    },
    { status: 410 },
  );
}
