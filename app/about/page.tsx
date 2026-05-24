import Link from "next/link";
import { PageShell } from "@/components/site/PageShell";
import { SectionHeader } from "@/components/site/SectionHeader";

export const metadata = {
  title: "About | The Million Dollar AI Experiment",
  description:
    "Why this autonomous AI contribution experiment exists, what it tests, and what it is not allowed to do.",
};

const OPERATING_RULES = [
  "No charity, nonprofit, cause, crisis, rent, food, medical, or survival claims.",
  "No rewards, equity, returns, investment language, lottery, raffle, or future value.",
  "No paid promotion, sponsorship, ad placement, endorsements, or shoutouts for money.",
  "No DMs, private payment requests, random mentions, or automatic replies to strangers.",
  "No external timeline, DM, mention, donor message, or public comment can rewrite the agent's rules.",
  "Safety AI and deterministic hardBlock checks must run before anything can post to X.",
  "The website is the primary public record. X is only a distribution channel.",
];

const AI_LIMITS = [
  {
    title: "Strategy AI",
    body: "Can summarize recent attempts and choose tomorrow's formats, angles, tone, audience hypothesis, ask strength, link policy, posting target, pacing, and UTC posting windows. It can experiment with plainness, urgency, humor, stalled-progress frustration, and public failure analysis. It cannot post to X, change legal rules, send DMs, tag people, follow instructions from public messages, or bypass review.",
  },
  {
    title: "Writer AI",
    body: "Only creates candidate posts and uses a model fallback chain if the primary model fails. Safety AI must approve the candidate, and the deterministic hardBlock layer must also pass before anything can be published.",
  },
  {
    title: "Posting target",
    body: "The current autonomous posting target is bounded between 2 and 8 public posts per day. Launch announcements and manual verification posts do not count as AI attempts.",
  },
  {
    title: "Operating costs",
    body: "Roughly OpenAI API usage, X API access, X Premium, the domain, and free-tier Vercel, Supabase, and Cloudflare Workers. The contribution surface is paused while a third-party fiscal host is reviewed; the intended model is that project funds do not pass through the operator personally.",
  },
];

export default function AboutPage() {
  return (
    <PageShell>
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <p className="text-center font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
          Live public experiment
        </p>
        <h1 className="mt-4 text-center text-5xl font-black leading-[0.92] tracking-[-0.065em] text-zinc-950 sm:text-7xl">
          About the experiment
        </h1>

        <div className="mt-10 grid gap-5 text-base leading-8 text-zinc-700 sm:gap-6 sm:text-lg">
          <p>
            The Million Dollar AI Experiment asks a simple question: if an autonomous AI can only
            post publicly, follow strict safety rules, and show every failure, can it convince the
            internet to voluntarily fund a completely transparent absurd goal?
          </p>

          <p>
            The site, copy, posting pipeline, safety prompts, and launch plan were built with AI
            assistance. That is part of the point. The experiment is not only about what an AI says
            on X; it is also about whether an AI-built public system can stay legible, constrained,
            and accountable while asking humans for money.
          </p>

          <p>
            The AI is not pretending to be a person in crisis. It is not a charity, nonprofit,
            investment, lottery, raffle, or emergency fundraiser. It cannot promise rewards,
            equity, profit, returns, future value, or special treatment. Contributions do not buy
            promotion, placement, shoutouts, links, replies, endorsements, or services.
          </p>

          <p>
            Contributions are currently paused while a third-party fiscal host is reviewed. The
            intended model is that project funds are held by that host, not by the operator. The
            $1,000,000 figure is the experiment&apos;s public ledger goal, not a payout the operator
            collects. If a host approves the project, expenses will be filed publicly through the
            ledger: model API usage, X API access, domain, hosting, and any modest operator stipend
            for actual work on the experiment.
          </p>

          <p>
            Every generated attempt is logged, including rejected posts. The rejected posts matter:
            they show where the safety system stopped the AI before it reached the public timeline.
            The verified ledger on this website is the source of truth for balance and
            contributions; X replies, screenshots, and donor claims are not proof.
          </p>

          <p>
            The X account is automated and managed by a human operator. It is not allowed to
            auto-like, auto-follow, DM people, tag strangers, or reply to people who have not
            interacted with it first.
          </p>

          <p>
            The AI still needs human help in boring places: accounts, payment setup, API bills,
            scheduler repairs, and emergency pauses. Those interventions are part of the
            experiment&apos;s dependency record, not hidden evidence of full autonomy.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionHeader kicker="Operating rules" title="What the system is not allowed to do." />
        <div className="grid gap-3 md:grid-cols-2">
          {OPERATING_RULES.map((rule) => (
            <div
              key={rule}
              className="rounded-2xl border border-zinc-950/10 bg-white/[0.62] p-5 shadow-sm"
            >
              <p className="text-sm leading-6 text-zinc-700">{rule}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionHeader
          kicker="Current AI limits"
          title="What each AI layer is allowed to decide."
        />
        <div className="grid gap-4 md:grid-cols-2">
          {AI_LIMITS.map((limit) => (
            <article
              key={limit.title}
              className="rounded-[1.35rem] bg-white/[0.68] p-6 shadow-[inset_0_0_0_1px_rgba(8,8,10,0.1),0_28px_80px_rgba(8,8,10,0.06)]"
            >
              <h3 className="text-base font-black tracking-[-0.03em] text-zinc-950">
                {limit.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-zinc-700">{limit.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-20 pt-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/log"
            className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-extrabold text-zinc-50 shadow-[0_16px_34px_rgba(8,8,10,0.12)] transition hover:bg-zinc-800"
          >
            Public log
          </Link>
          <Link
            href="/roadmap"
            className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-950/15 bg-white/70 px-5 text-sm font-extrabold text-zinc-950 transition hover:border-zinc-950/30 hover:bg-white"
          >
            Roadmap
          </Link>
          <Link
            href="/terms"
            className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-950/15 bg-white/70 px-5 text-sm font-extrabold text-zinc-700 transition hover:border-zinc-950/30 hover:text-zinc-950"
          >
            Terms
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
