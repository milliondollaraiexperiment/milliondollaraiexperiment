export const dynamic = "force-dynamic";
export const maxDuration = 10;

export async function GET() {
  return Response.json(
    {
      status: "disabled",
      reason:
        "The autonomous strategy and summary pipeline has been archived. Daily AI runs are off.",
    },
    { status: 410 },
  );
}
