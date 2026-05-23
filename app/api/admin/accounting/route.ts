import { requireCronBearer } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

async function selectRows(table: string) {
  const { data, error } = await supabaseAdmin.from(table).select("*");
  if (error) {
    return { data: [], error: error.message };
  }
  return { data: data ?? [], error: null };
}

export async function GET(req: Request) {
  const authError = requireCronBearer(req);
  if (authError) return authError;

  const [donations, costs, summary] = await Promise.all([
    selectRows("accounting_verification_export"),
    selectRows("accounting_project_cost_ledger"),
    selectRows("accounting_summary"),
  ]);

  return Response.json({
    generated_at: new Date().toISOString(),
    checklist: [
      "gross_amount_cents present for every contribution",
      "stripe_fee_cents and net_amount_cents captured after Stripe balance transaction is available",
      "paid_at, currency, payment_intent, charge, and balance_transaction IDs present",
      "payer messages preserved only for accounting/admin review and moderated public display",
      "manual project costs entered in project_costs with category, vendor, amount, date, and notes",
    ],
    donations,
    costs,
    summary,
  });
}
