export const dynamic = "force-dynamic";

export async function POST() {
  return Response.json(
    {
      status: "disabled",
      reason: "Test X posting is disabled because the experiment has been archived.",
    },
    { status: 410 },
  );
}
