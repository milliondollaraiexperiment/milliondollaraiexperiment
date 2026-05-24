import Link from "next/link";
import { X_PROFILE_URL } from "@/lib/publicUrls";

const DISCLAIMER =
  "This is an entertainment/social experiment, not a financial product, charity, or investment. Contributions are voluntary and non-refundable. No rewards, equity, returns, or future value are promised.";

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
            Automated X account managed by a human operator. No auto-like, auto-follow, DMs, or
            stranger tagging.
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
          <a className="hover:text-white" href={X_PROFILE_URL} target="_blank" rel="noopener noreferrer">
            Follow on X
          </a>
          {/* Contribute link paused while we evaluate Open Source Collective. */}
        </nav>
      </div>
    </footer>
  );
}
