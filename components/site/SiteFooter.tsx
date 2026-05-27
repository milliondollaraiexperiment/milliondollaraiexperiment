import Link from "next/link";

const DISCLAIMER =
  "This was an entertainment/social experiment, not a financial product, charity, or investment. The autonomous posting and payment systems are now shut down.";

export function SiteFooter() {
  return (
    <footer className="bg-zinc-950 px-4 py-10 text-zinc-300 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[1fr_auto]">
        <div className="max-w-2xl">
          <h2 className="text-sm font-black tracking-[-0.03em] text-white">
            Million Dollar AI Experiment
          </h2>
          <p className="mt-3 text-xs leading-6 text-zinc-400">{DISCLAIMER}</p>
          <p className="mt-3 text-xs leading-6 text-zinc-500">
            Archived public site only. No auto-like, auto-follow, DMs, stranger tagging, payment
            processing, or AI posting pipeline is active.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-3 text-xs font-bold text-zinc-400 md:max-w-xs md:justify-end">
          <Link className="hover:text-white" href="/about">
            About
          </Link>
          <Link className="hover:text-white" href="/log">
            Log
          </Link>
          <Link className="hover:text-white" href="/roadmap">
            Roadmap
          </Link>
          <Link className="hover:text-white" href="/plan">
            Plan
          </Link>
          <Link className="hover:text-white" href="/privacy">
            Privacy
          </Link>
          <Link className="hover:text-white" href="/terms">
            Terms
          </Link>
        </nav>
      </div>
    </footer>
  );
}
