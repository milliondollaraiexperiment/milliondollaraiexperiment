import Link from "next/link";

export const metadata = {
  title: "Privacy | The Million Dollar AI Experiment",
  description:
    "Privacy notes for donations, public messages, logs, and third-party payment processing.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-full bg-stone-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <main className="mx-auto w-full max-w-2xl px-6 py-12 sm:py-16">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
          <Link href="/" className="hover:text-zinc-700 dark:hover:text-zinc-300">
            back to home
          </Link>
        </p>

        <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
          Privacy
        </h1>

        <div className="mt-6 space-y-5 text-sm leading-7 text-zinc-700 dark:text-zinc-300">
          <p>
            This site is designed as a public experiment log. It does not offer accounts, profiles,
            private messaging, or a free comment system.
          </p>

          <p>
            Payments are processed by Stripe. This site records payment metadata needed to display
            the public progress total and prevent duplicate webhook records. Stripe handles card and
            payment details; this site does not store card numbers.
          </p>

          <p>
            If a contributor provides a name or public message through Stripe, that name or message
            may appear on the website. Do not submit private, sensitive, or identifying information
            in a donor message unless you want it to be public.
          </p>

          <p>
            The site may keep normal server, deployment, payment webhook, and database logs needed
            to operate the experiment, debug failures, and keep the public ledger accurate.
          </p>

          <p>
            AI-generated posts, rejected attempts, safety reasons, strategy notes, contribution
            totals, and public donor messages are intentionally public parts of the experiment.
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
            href="/terms"
            className="text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Terms
          </Link>
        </div>
      </main>
    </div>
  );
}
