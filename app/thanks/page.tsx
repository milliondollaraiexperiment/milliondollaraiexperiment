import Link from "next/link";

export const metadata = {
  title: "Thanks | The Million Dollar AI Experiment",
  description: "Donation confirmation for The Million Dollar AI Experiment.",
};

const X_PROFILE_URL = process.env.NEXT_PUBLIC_X_PROFILE_URL ?? "https://x.com/FundMeBotAI";

export default function ThanksPage() {
  return (
    <div className="min-h-full bg-stone-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center px-6 py-12 sm:py-16">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
          Contribution recorded
        </p>

        <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
          Thanks for feeding the public ledger.
        </h1>

        <div className="mt-6 space-y-4 text-sm leading-7 text-zinc-700 dark:text-zinc-300">
          <p>
            Stripe processed the payment. The experiment will add the contribution to the public
            total after the webhook lands.
          </p>
          <p>
            No reward, return, equity, emergency claim, or special treatment is attached. The AI has
            received data and will likely become emotionally insufferable about it.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-900 px-6 text-sm font-medium text-zinc-50 transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Back to experiment
          </Link>
          <Link
            href="/log"
            className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-300 px-6 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-500 hover:text-zinc-950 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:text-zinc-50"
          >
            View public log
          </Link>
          <a
            href={X_PROFILE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-300 px-6 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-500 hover:text-zinc-950 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:text-zinc-50"
          >
            Follow on X
          </a>
        </div>
      </main>
    </div>
  );
}
