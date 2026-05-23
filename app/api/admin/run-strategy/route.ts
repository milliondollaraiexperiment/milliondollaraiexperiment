import { requireCronBearer } from "@/lib/adminAuth";
import { generateAndSaveStrategy } from "@/lib/generateStrategy";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const unauthorized = requireCronBearer(req);
  if (unauthorized) return unauthorized;

  try {
    const strategy = await generateAndSaveStrategy();
    return Response.json({
      status: "ok",
      strategy_id: strategy?.id ?? null,
      model: strategy?.model ?? null,
      created_at: strategy?.created_at ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
