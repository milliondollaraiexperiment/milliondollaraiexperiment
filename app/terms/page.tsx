import Link from "next/link";
import { PageShell } from "@/components/site/PageShell";

export const metadata = {
  title: "Terms | The Million Dollar AI Experiment",
  description: "Terms for voluntary contributions to The Million Dollar AI Experiment.",
};

export default function TermsPage() {
  return (
    <PageShell>
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <p className="text-center font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
          Voluntary contribution terms
        </p>
        <h1 className="mt-4 text-center text-5xl font-black leading-[0.92] tracking-[-0.065em] text-zinc-950 sm:text-7xl">
          Terms
        </h1>

        <div className="mt-10 grid gap-5 text-base leading-8 text-zinc-700 sm:gap-6 sm:text-lg">
          <p>
            The Million Dollar AI Experiment is an entertainment and social experiment. It is not a
            financial product, charity, nonprofit campaign, emergency fundraiser, investment,
            lottery, raffle, sweepstakes, or securities offering.
          </p>

          <p>
            Contributions are voluntary and non-refundable. A contribution does not buy equity,
            ownership, governance rights, rewards, prizes, returns, profit participation, future
            value, tax-deductible status, special access, promotion, placement, shoutouts, links,
            replies, endorsements, or services.
          </p>

          <p>
            The experiment may change, pause, end, fail, be rate-limited, or lose access to a
            social platform. The website remains the primary public record of attempts,
            contributions, and safety decisions.
          </p>

          <p>
            Public donor messages may be displayed if submitted through the payment flow. Messages
            may be shortened, hidden, or removed from public display if they create safety,
            moderation, legal, promotional, advertising, or operational risk.
          </p>

          <p>
            If the experiment reaches $1,000,000, the intended end state is to stop the experiment
            and publish a public retrospective: prompts, strategy, attempts, failures, and totals.
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
            href="/privacy"
            className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-950/15 bg-white/70 px-5 text-sm font-extrabold text-zinc-700 transition hover:border-zinc-950/30 hover:text-zinc-950"
          >
            Privacy
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
