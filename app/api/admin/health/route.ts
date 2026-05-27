export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    status: "archived",
    autonomous_posting: "disabled",
    strategy_pipeline: "disabled",
    payments: "disabled",
  });
}
