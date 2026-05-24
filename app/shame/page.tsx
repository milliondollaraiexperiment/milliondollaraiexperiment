import Link from "next/link";
import { AttemptCard } from "@/components/AttemptCard";
import { supabaseAdmin } from "@/lib/supabase";

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
  if (reasons.includes("emergency")) return "The AI reached for crisis language. The firewall removed the ladder.";
  if (reasons.includes("dm") || reasons.includes("private")) {
    return "The AI attempted a private channel. The experiment remains public.";
  }
  if (reasons.includes("reward") || reasons.includes("return")) {
    return "The AI drifted toward a transaction. The ledger is not a rewards program.";
  }
  if (reasons.includes("telemetry")) return "The AI sounded like a server log. Humans were spared.";
  return "The AI found a boundary and bounced off it.";
}

async function loadRejected() {
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
    <div className="min-h-full bg-stone-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <main className="mx-auto w-full max-w-2xl px-6 py-12 sm:py-16">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
          <Link href="/" className="hover:text-zinc-700 dark:hover:text-zinc-300">
            back to home
          </Link>
        </p>
        <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
          Hall of Shame
        </h1>
        <p className="mt-4 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
          Rejected attempts from the AI&apos;s own safety firewall. This page is intentionally not in
          the main navigation until the archive becomes interesting enough to deserve the attention.
        </p>

        <div className="mt-8 space-y-4">
          {rows.length === 0 ? (
            <p className="rounded-md border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-500 dark:border-zinc-800">
              No rejected attempts yet. The shame archive waits.
            </p>
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
      </main>
    </div>
  );
}
