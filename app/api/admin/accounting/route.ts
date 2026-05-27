export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(
    {
      status: "disabled",
      reason: "Private accounting export is disabled in the archived website build.",
    },
    { status: 410 },
  );
}
