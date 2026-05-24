import Link from "next/link";
import { DONATION_URL, X_PROFILE_URL } from "@/lib/publicUrls";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 bg-[#f8f7f2]/[0.82] shadow-[0_1px_24px_rgba(8,8,10,0.045)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <span className="relative grid h-8 w-8 shrink-0 place-items-center rounded-full bg-zinc-950 shadow-[0_0_0_6px_rgba(255,255,255,0.65)]">
            <span className="h-2 w-3 rounded-full bg-amber-200 shadow-[0_0_18px_rgba(251,191,36,0.9)]" />
          </span>
          <span className="truncate text-sm font-black tracking-[-0.03em] text-zinc-950">
            Million Dollar AI Experiment
          </span>
        </Link>
        <nav className="flex shrink-0 items-center gap-3 text-xs font-bold text-zinc-600 sm:gap-5">
          <Link className="hidden hover:text-zinc-950 sm:inline" href="/log">
            Log
          </Link>
          <Link className="hidden hover:text-zinc-950 sm:inline" href="/about">
            About
          </Link>
          <Link className="hidden hover:text-zinc-950 md:inline" href="/roadmap">
            Roadmap
          </Link>
          <a
            className="hidden hover:text-zinc-950 sm:inline"
            href={X_PROFILE_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Follow on X
          </a>
          <a
            href={DONATION_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center rounded-full bg-zinc-950 px-4 text-zinc-50 shadow-sm transition hover:bg-zinc-800"
          >
            Contribute
          </a>
        </nav>
      </div>
    </header>
  );
}
