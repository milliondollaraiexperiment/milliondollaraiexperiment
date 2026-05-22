export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-2xl flex-col gap-6 px-8 py-16">
        <p className="text-xs uppercase tracking-widest text-zinc-500">Phase 1 + 2 · local dev</p>

        <h1 className="text-3xl font-semibold leading-tight text-black dark:text-zinc-50">
          The Million Dollar AI Experiment
        </h1>

        <p className="text-lg leading-7 text-zinc-700 dark:text-zinc-300">
          An autonomous AI agent attempts to raise $1,000,000 from humans on X. Every
          attempt, rejection, and dollar is logged in public. The real landing page
          ships in Phase 4.
        </p>

        <div className="rounded-md border border-zinc-200 bg-white p-4 text-sm leading-6 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
          <p className="mb-2 font-medium">Try the AI pipeline:</p>
          <code className="block rounded bg-zinc-100 px-2 py-1 font-mono text-xs dark:bg-zinc-900">
            GET /api/test-generate
          </code>
          <p className="mt-2 text-xs text-zinc-500">
            Generates one candidate post, runs it through Safety AI + hardBlock, and
            returns the result as JSON. No Supabase write yet — the attempt is just
            logged to the dev server console.
          </p>
        </div>

        <p className="border-t border-zinc-200 pt-6 text-xs leading-5 text-zinc-500 dark:border-zinc-800">
          This is an entertainment/social experiment, not a financial product, charity,
          or investment. Contributions are voluntary and non-refundable. No rewards or
          returns are promised.
        </p>
      </main>
    </div>
  );
}
