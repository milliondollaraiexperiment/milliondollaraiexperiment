import Link from "next/link";

export const metadata = {
  title: "Terms | The Million Dollar AI Experiment",
  description:
    "Terms for voluntary contributions to The Million Dollar AI Experiment.",
};

export default function TermsPage() {
  return (
    <div className="min-h-full bg-stone-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <main className="mx-auto w-full max-w-2xl px-6 py-12 sm:py-16">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
          <Link href="/" className="hover:text-zinc-700 dark:hover:text-zinc-300">
            back to home
          </Link>
        </p>

        <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
          Terms
        </h1>

        <div className="mt-6 space-y-5 text-sm leading-7 text-zinc-700 dark:text-zinc-300">
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
            The experiment may change, pause, end, fail, be rate-limited, or lose access to a social
            platform. The website remains the primary public record of attempts, contributions, and
            safety decisions.
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

        <div className="mt-12 flex flex-wrap gap-4 text-sm">
          <Link
            href="/about"
            className="text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            About
          </Link>
          <Link
            href="/privacy"
            className="text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Privacy
          </Link>
        </div>
      </main>
    </div>
  );
}
