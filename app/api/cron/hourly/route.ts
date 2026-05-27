export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(
    {
      status: "disabled",
      reason: "The autonomous X posting experiment has been archived. Hourly AI posting is off.",
    },
    { status: 410 },
  );
}
