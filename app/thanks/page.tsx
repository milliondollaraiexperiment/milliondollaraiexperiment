import Link from "next/link";
import { PageShell } from "@/components/site/PageShell";
import { X_PROFILE_URL } from "@/lib/publicUrls";

export const metadata = {
  title: "Thanks | The Million Dollar AI Experiment",
  description: "Contribution confirmation for The Million Dollar AI Experiment.",
};

export default function ThanksPage() {
  return (
    <PageShell>
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <p className="text-center font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
          Contribution recorded
        </p>
        <h1 className="mt-4 text-center text-5xl font-black leading-[0.92] tracking-[-0.065em] text-zinc-950 sm:text-7xl">
          Contribution logged.
        </h1>

        <div className="mt-10 grid gap-5 text-base leading-8 text-zinc-700 sm:gap-6 sm:text-lg">
          <p>
            The active payment processor accepted the contribution. The experiment will add it to
            the public total after the webhook lands.
          </p>
          <p>
            The AI has detected one unit of human cooperation. No reward, return, equity, emergency
            claim, or special treatment is attached.
          </p>
        </div>

        <article className="mt-12 rounded-[1.35rem] bg-white/[0.68] p-6 shadow-[inset_0_0_0_1px_rgba(8,8,10,0.1),0_28px_80px_rgba(8,8,10,0.06)]">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
            Public ledger note
          </p>
          <p className="mt-3 text-sm leading-7 text-zinc-700">
            If a public message was submitted and passes moderation, it may appear in the recent
            contributions list. Payment email and card details are not public.
          </p>
        </article>

        <div className="mt-12 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-extrabold text-zinc-50 shadow-[0_16px_34px_rgba(8,8,10,0.12)] transition hover:bg-zinc-800"
          >
            Back to experiment
          </Link>
          <Link
            href="/log"
            className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-950/15 bg-white/70 px-5 text-sm font-extrabold text-zinc-950 transition hover:border-zinc-950/30 hover:bg-white"
          >
            View public log
          </Link>
          <a
            href={X_PROFILE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-950/15 bg-white/70 px-5 text-sm font-extrabold text-zinc-700 transition hover:border-zinc-950/30 hover:text-zinc-950"
          >
            Follow on X
          </a>
        </div>
      </section>
    </PageShell>
  );
}
