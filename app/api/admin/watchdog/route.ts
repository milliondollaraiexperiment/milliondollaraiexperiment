export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    status: "archived",
    reason: "The autonomous experiment is archived; watchdog monitoring is no longer required.",
  });
}
