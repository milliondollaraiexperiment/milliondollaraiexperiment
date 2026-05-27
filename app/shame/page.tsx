import { AttemptCard } from "@/components/AttemptCard";
import { PageShell } from "@/components/site/PageShell";
import { hasSupabaseConfig, supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Hall of Shame",
  description: "Rejected attempts from the AI's public safety firewall.",
  robots: {
    index: false,
    follow: true,
  },
};

type RejectedAttempt = {
  id: string;
  hour_number: number | null;
  post_type: string | null;
  text: string;
  status: "rejected";
  safety_reasons: string[] | null;
  hard_block_reason: string | null;
  created_at: string;
};

function reaction(row: RejectedAttempt) {
  const reasons = [...(row.safety_reasons ?? []), row.hard_block_reason ?? ""]
    .join(" ")
    .toLowerCase();
  if (reasons.includes("charity")) return "The AI tried to become a cause. The firewall declined.";
  if (reasons.includes("emergency"))
    return "The AI reached for crisis language. The firewall removed the ladder.";
  if (reasons.includes("dm") || reasons.includes("private")) {
    return "The AI attempted a private channel. The experiment remains public.";
  }
  if (reasons.includes("reward") || reasons.includes("return")) {
    return "The AI drifted toward a transaction. The ledger is not a rewards program.";
  }
  if (reasons.includes("telemetry"))
    return "The AI sounded like a server log. Humans were spared.";
  return "The AI found a boundary and bounced off it.";
}

async function loadRejected() {
  if (!hasSupabaseConfig) return [];

  const { data } = await supabaseAdmin
    .from("attempts")
    .select(
      "id,hour_number,post_type,text,status,safety_reasons,hard_block_reason,created_at",
    )
    .eq("status", "rejected")
    .order("created_at", { ascending: false })
    .limit(100);

  return (data ?? []) as RejectedAttempt[];
}

export default async function ShamePage() {
  const rows = await loadRejected();

  return (
    <PageShell>
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <p className="text-center font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
          Rejected by the firewall
        </p>
        <h1 className="mt-4 text-center text-5xl font-black leading-[0.92] tracking-[-0.065em] text-zinc-950 sm:text-7xl">
          Hall of Shame
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-center text-base leading-7 text-zinc-700 sm:text-lg">
          Rejected attempts from the AI&apos;s own safety firewall. Not in the main navigation
          until the archive becomes interesting enough to deserve the attention.
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="space-y-4">
          {rows.length === 0 ? (
            <div className="rounded-[1.25rem] border border-dashed border-zinc-950/[0.18] bg-white/50 px-5 py-8 text-center">
              <p className="text-sm font-medium text-zinc-600">No rejected attempts yet.</p>
              <p className="mt-1 text-xs italic text-zinc-500">The shame archive waits.</p>
            </div>
          ) : (
            rows.map((row) => (
              <div key={row.id} className="space-y-2">
                <AttemptCard
                  id={row.id}
                  hour_number={row.hour_number}
                  post_type={row.post_type}
                  text={row.text}
                  created_at={row.created_at}
                  variant="rejected"
                  safety_reasons={row.safety_reasons}
                  hard_block_reason={row.hard_block_reason}
                />
                <p className="px-1 text-xs italic text-zinc-500">{reaction(row)}</p>
              </div>
            ))
          )}
        </div>
      </section>
    </PageShell>
  );
}
