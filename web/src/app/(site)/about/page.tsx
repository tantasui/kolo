import type { Metadata } from "next";
import Link from "next/link";
import { config } from "@/config";
import { Photo } from "@/components/site/Photo";
import { Reveal } from "@/components/site/Reveal";
import { Code, Tag } from "@/components/site/Section";
import { ArrowRight } from "@/components/site/Icons";
import { Check } from "@/components/ui/Icons";
import { KoloMark } from "@/components/ui/Wordmark";

/**
 * The long answer, for the people who want one.
 *
 * This page used to be the landing page, and it was the wrong shape for that
 * job: it opened on `0 wei` and `192/192`, named Kernel v0.3.1 in a spec grid
 * and built a section around contract counts. All of that is true, and all of
 * it is addressed to somebody auditing Kolo rather than somebody deciding to
 * use it. `/` is now written for the second reader, and everything here is
 * written for the first.
 *
 * So this page is deliberately short and deliberately technical. It is linked
 * once, from the landing page's footer and from the line under "you don't have
 * to trust us", which is the only promise on that page that owes a longer
 * answer.
 *
 * The rule has not changed: nothing claimed that the repository or the chain
 * cannot back. Addresses come from `config`, never retyped.
 */

const REPO = "https://github.com/tantasui/kolo";
const EXPLORER = config.chain.blockExplorers?.default.url ?? "";

export const metadata: Metadata = {
  title: "How Kolo works",
  description:
    "The long answer: what Kolo runs on, what was checked and with which command, " +
    "and every contract address.",
};

export default function AboutPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip bg-deep">
      <Header />
      <main className="site-grid flex-1">
        <Intro />
        <Stack />
        <Facts />
        <Verified />
        <Contracts />
      </main>
      <Footer />
    </div>
  );
}

/* ---------- header ---------- */

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-deep-2 bg-deep/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-6 px-5 sm:px-6 md:h-[72px]">
        <Link href="/" className="-m-2 flex shrink-0 items-center gap-2.5 p-2">
          <KoloMark size={30} />
          <span className="text-[22px] font-bold tracking-tight text-card">
            kolo
          </span>
        </Link>

        <Link
          href="/app"
          className="inline-flex h-10 shrink-0 items-center whitespace-nowrap rounded-pill bg-spring
                     px-5 text-[15px] font-semibold text-on-spring transition-all hover:bg-spring-dim
                     active:scale-[0.98]"
        >
          Open Kolo
        </Link>
      </div>
    </header>
  );
}

/* ---------- intro ---------- */

function Intro() {
  return (
    <section className="mx-auto max-w-5xl px-5 pb-12 pt-14 sm:px-6 md:pt-20">
      <Reveal>
        <Tag tone="accent" mono>
          How it works
        </Tag>
        <h1 className="mt-3 max-w-3xl text-[34px] font-extrabold leading-[1.0] tracking-[-0.025em] text-card sm:text-[48px]">
          Seven contracts. 192 tests. Nothing held by us.
        </h1>
        <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-deep-quiet">
          You do not need any of this to use Kolo, and the app never mentions
          it. It is here because the landing page makes a promise — that you do
          not have to trust us with your money — and a promise like that is
          worth somebody being able to check.
        </p>
      </Reveal>
    </section>
  );
}

/* ---------- the stack ---------- */

const STACK = [
  { name: "MONAD", mark: "M", tone: "bg-[#836EF9] text-card" },
  { name: "PIMLICO", mark: "P", tone: "bg-[#F35532] text-card" },
  {
    name: "PRIVY",
    mark: "Pr",
    tone: "border border-deep-2 bg-deep-2 text-card",
  },
  { name: "KERNEL v0.3", mark: "K", tone: "bg-spring text-on-spring" },
  { name: "AGORA AUSD", mark: "A", tone: "bg-[#0052FF] text-card" },
  {
    name: "FOUNDRY",
    mark: "F",
    tone: "border border-deep-2 bg-deep-2 text-card",
  },
];

function Stack() {
  return (
    <section className="border-y border-deep-2 bg-deep-2 py-12">
      <div className="mx-auto max-w-5xl px-5 sm:px-6">
        <p className="mb-8 text-center font-mono text-[12px] uppercase tracking-widest text-deep-quiet">
          What Kolo actually runs on
        </p>
        <div className="grid grid-cols-2 items-center justify-items-center gap-8 opacity-70 md:grid-cols-3 lg:grid-cols-6">
          {STACK.map((item) => (
            <div
              key={item.name}
              className="flex items-center gap-2 text-[17px] font-bold tracking-tight text-card"
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full font-mono text-[11px] ${item.tone}`}
              >
                {item.mark}
              </span>
              <span>{item.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- the four facts ---------- */

const FACTS = [
  {
    head: "No admin key",
    tail: "Nothing holding your money has an owner, an admin or a pause.",
  },
  {
    head: "No server of ours",
    tail: "Your browser talks to the contracts directly.",
  },
  {
    head: "No fee, ever",
    tail: "Every operation is paid for by a paymaster, not by you.",
  },
  {
    head: "No lock-in",
    tail: "It all keeps working whether we are here or not.",
  },
];

function Facts() {
  return (
    <section className="mx-auto max-w-5xl px-5 py-16 sm:px-6">
      <Reveal>
        <dl className="divide-y divide-deep-2 border-y border-deep-2">
          {FACTS.map((fact) => (
            <div
              key={fact.head}
              className="flex flex-col gap-1 py-4 sm:flex-row sm:items-baseline sm:gap-6"
            >
              <dt className="w-48 shrink-0 text-[17px] font-semibold text-card">
                {fact.head}
              </dt>
              <dd className="text-[15px] leading-relaxed text-deep-quiet">
                {fact.tail}
              </dd>
            </div>
          ))}
        </dl>
      </Reveal>

      <Reveal delay={80}>
        <div className="group mt-6 overflow-hidden rounded-2xl border border-deep-2 bg-deep-2">
          <div className="grid grid-cols-1 items-center md:grid-cols-12">
            <div className="relative h-[240px] overflow-hidden md:col-span-7 md:h-[320px]">
              <Photo
                src="/img/hardened.webp"
                alt="Kolo's architecture rendered as lit glass structure"
                className="h-full w-full"
              />
              <div className="pointer-events-none absolute inset-0 hidden bg-gradient-to-r from-transparent via-transparent to-surface md:block" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent md:hidden" />
            </div>

            <div className="flex flex-col justify-center p-8 md:col-span-5 md:p-10">
              <h2 className="mb-3 text-[24px] font-bold tracking-tight">
                All of it is public.
              </h2>
              <p className="mb-6 text-[15px] leading-relaxed text-deep-quiet">
                Every line, and every contract it runs on. Nothing about how
                your money moves is hidden from you.
              </p>
              <a
                href={REPO}
                className="inline-flex h-12 w-fit items-center gap-2 rounded-pill border border-deep-2
                           bg-deep-2 px-5 text-[15px] font-semibold text-card transition-all
                           hover:bg-deep-2 active:scale-[0.98]"
              >
                See the code
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ---------- what was actually run ---------- */

const RUNS = [
  {
    title: "Every operation is sponsored",
    body: "A smart account was driven through the exact calls the app makes — claim a handle, take an opening balance, then a batched approve and send — and held no gas at any point.",
    how: "verify:sponsorship",
  },
  {
    title: "A circle settled a missed round unattended",
    body: "One member skipped. The recipient was still paid in full and on time out of the absent member's own deposit, and the rotation carried on without anybody intervening.",
    how: "keeper",
  },
  {
    title: "One member's spending cannot reach another's",
    body: "A member who tried to use more than their own share was refused, and the member who had spent nothing withdrew every cent.",
    how: "verify:pots",
  },
  {
    title: "A goal paid out after it was reached",
    body: "A goal filled, the moment it was reached was recorded with a timestamp, and the money was withdrawn anyway — which is allowed, and is the point.",
    how: "verify:goals",
  },
  {
    title: "The naira rounding rule holds both ways",
    body: "Around 1.8 million amounts were checked: what you type comes back the same on the next screen, and a shown balance is never more than what is held.",
    how: "check:money",
  },
];

function Verified() {
  return (
    <section className="border-t border-deep-2 bg-deep-2 py-16">
      <div className="mx-auto max-w-5xl px-5 sm:px-6">
        <Reveal>
          <div className="mb-10 max-w-2xl">
            <Tag tone="accent" mono>
              Verified, not claimed
            </Tag>
            <h2 className="mt-2 text-[28px] font-extrabold leading-[1.0] tracking-[-0.025em] text-card sm:text-[34px]">
              What was actually run.
            </h2>
            <p className="mt-3 text-[16px] leading-relaxed text-deep-quiet">
              Every figure on this page has a command behind it. These are the
              things that were put on the chain and watched, and what to run to
              see each one for yourself.
            </p>
          </div>
        </Reveal>

        <div className="grid gap-4 md:grid-cols-2">
          {RUNS.map((run, index) => (
            <Reveal key={run.title} delay={(index % 2) * 60}>
              <div className="flex h-full gap-4 rounded-2xl border border-deep-2 bg-deep-2 p-6">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-spring">
                  <Check className="h-4 w-4 text-on-spring" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-[16px] font-semibold">{run.title}</h3>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-deep-quiet">
                    {run.body}
                  </p>
                  <Code className="mt-3 inline-block">npm run {run.how}</Code>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- the addresses ---------- */

const CONTRACTS: { name: string; blurb: string; address: string }[] = [
  {
    name: "KoloRegistry",
    blurb: "handle → account",
    address: config.contracts.registry,
  },
  {
    name: "KoloPay",
    blurb: "payment router, and the activity feed",
    address: config.contracts.pay,
  },
  {
    name: "KoloFaucet",
    blurb: "hands each person their opening balance",
    address: config.contracts.faucet,
  },
  {
    name: "KoloLinks",
    blurb: "money held behind a secret",
    address: config.contracts.links,
  },
  {
    name: "KoloCircle",
    blurb: "rounds, deposits, rotation",
    address: config.contracts.circle,
  },
  {
    name: "KoloGoals",
    blurb: "money set aside toward a target",
    address: config.contracts.goals,
  },
  {
    name: "KoloPots",
    blurb: "ring-fenced shares behind one meter",
    address: config.contracts.pots,
  },
  {
    name: "Agora AUSD",
    blurb: "the dollar itself — not ours",
    address: config.contracts.token,
  },
];

/** Addresses are for checking, not for reading. Enough of both ends to compare. */
function shorten(address: string): string {
  return `${address.slice(0, 10)}…${address.slice(-8)}`;
}

function Contracts() {
  return (
    <section className="mx-auto max-w-5xl px-5 py-16 sm:px-6">
      <Reveal>
        <div className="overflow-hidden rounded-2xl border border-deep-2 bg-deep-2">
          <div className="flex flex-col justify-between gap-1 border-b border-deep-2 bg-deep px-5 py-4 sm:flex-row sm:items-center">
            <p className="text-[15px] font-semibold text-card">
              Read them yourself
            </p>
            <p className="font-mono text-[11px] text-deep-quiet">
              Monad Testnet · chain {config.chain.id} · block{" "}
              {config.deployBlock.toString()}
            </p>
          </div>
          <table className="w-full border-collapse text-left font-mono text-xs">
            <tbody>
              {CONTRACTS.map((contract) => (
                <tr
                  key={contract.address}
                  className="border-b border-deep-2 transition-colors last:border-b-0 hover:bg-deep/40"
                >
                  <td className="px-3 py-2 align-top text-[14px] font-semibold text-card sm:px-5 sm:py-3.5">
                    {contract.name}
                    <span className="mt-1 block text-[12px] font-normal text-deep-quiet sm:hidden">
                      {contract.blurb}
                    </span>
                  </td>
                  <td className="hidden px-5 py-3.5 align-top text-[13px] text-deep-quiet sm:table-cell">
                    {contract.blurb}
                  </td>
                  <td className="px-3 py-2 text-right align-top sm:px-5 sm:py-3.5">
                    <a
                      href={`${EXPLORER}/address/${contract.address}`}
                      target="_blank"
                      rel="noreferrer"
                      className="tabular -my-1 inline-flex min-h-[40px] items-center justify-end
                                 text-[12px] text-deep-quiet underline decoration-deep-2
                                 underline-offset-4 transition hover:text-spring"
                    >
                      {shorten(contract.address)}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Reveal>

      <p className="mt-4 text-[14px] text-deep-quiet">
        <Code>TestUSD</Code> is in the repository too — a six-decimal stand-in
        kept for the tests and for chains without AUSD. The app does not use it.
        The{" "}
        <a
          href={`${REPO}#readme`}
          className="text-card underline decoration-deep-2 underline-offset-4"
        >
          README
        </a>{" "}
        has the rest, including what is not finished.
      </p>
    </section>
  );
}

/* ---------- footer ---------- */

function Footer() {
  return (
    <footer className="border-t border-deep-2 bg-deep">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-5 px-5 py-10 text-center sm:px-6 md:flex-row md:text-left">
        <Link
          href="/"
          className="-m-2 inline-flex min-h-[40px] items-center p-2 text-[14px] text-deep-quiet
                     transition-colors hover:text-card"
        >
          ← Back to Kolo
        </Link>
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[14px] text-deep-quiet">
          <a
            href={REPO}
            className="-my-2 inline-flex min-h-[40px] items-center transition-colors hover:text-card"
          >
            Repository
          </a>
          <a
            href={`${REPO}/blob/main/web/DESIGN.md`}
            className="-my-2 inline-flex min-h-[40px] items-center transition-colors hover:text-card"
          >
            Design system
          </a>
          <a
            href={`${REPO}/tree/main/contracts`}
            className="-my-2 inline-flex min-h-[40px] items-center transition-colors hover:text-card"
          >
            Contracts
          </a>
        </nav>
      </div>
    </footer>
  );
}
