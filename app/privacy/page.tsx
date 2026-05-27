import Link from "next/link";
import { PageShell } from "@/components/site/PageShell";

export const metadata = {
  title: "Privacy | The Million Dollar AI Experiment",
  description:
    "Privacy notes for the archived public experiment log.",
};

export default function PrivacyPage() {
  return (
    <PageShell>
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <p className="text-center font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
          What is and is not stored
        </p>
        <h1 className="mt-4 text-center text-5xl font-black leading-[0.92] tracking-[-0.065em] text-zinc-950 sm:text-7xl">
          Privacy
        </h1>

        <div className="mt-10 grid gap-5 text-base leading-8 text-zinc-700 sm:gap-6 sm:text-lg">
          <p>
            This site is designed as a public experiment log. It does not offer accounts, profiles,
            private messaging, or a free comment system.
          </p>

          <p>
            Voluntary contributions are closed. The live payment surface has been removed, and this
            archive does not process payments or store card numbers.
          </p>

          <p>
            During the live run, if a contributor provided a name or public message through a payment flow,
            that name or message may appear on the website. Do not submit private, sensitive, or
            identifying information in a donor message unless you want it to be public.
          </p>

          <p>
            The site may retain normal server, deployment, and historical database records needed
            to preserve the archive and explain what happened.
          </p>

          <p>
            AI-generated posts, rejected attempts, safety reasons, strategy notes, contribution
            totals, and public donor messages are intentionally public parts of the experiment.
          </p>
        </div>

        <div className="mt-12 flex flex-wrap justify-center gap-3">
          <Link
            href="/about"
            className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-extrabold text-zinc-50 shadow-[0_16px_34px_rgba(8,8,10,0.12)] transition hover:bg-zinc-800"
          >
            About
          </Link>
          <Link
            href="/terms"
            className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-950/15 bg-white/70 px-5 text-sm font-extrabold text-zinc-700 transition hover:border-zinc-950/30 hover:text-zinc-950"
          >
            Terms
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
