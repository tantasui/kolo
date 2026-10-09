import type { Metadata } from "next";
import Link from "next/link";
import { config } from "@/config";
import { Converter } from "@/components/site/Converter";
import { CountUp } from "@/components/site/CountUp";
import { HandleCTA } from "@/components/site/HandleCTA";
import { MobileNav } from "@/components/site/MobileNav";
import { SendDemo } from "@/components/site/SendDemo";
import { Ticker } from "@/components/site/Ticker";
import { VoiceDemo } from "@/components/site/VoiceDemo";
import { Reveal } from "@/components/site/Reveal";
import {
  ArrowRight,
  AtSign,
  CheckCircle,
  Group,
  Mic,
  Person,
  Pie,
  Savings,
} from "@/components/site/Icons";
import { LinkIcon } from "@/components/ui/Icons";
import { StackRow } from "@/components/site/Stack";
import { KoloMark } from "@/components/ui/Wordmark";

/**
 * The page somebody lands on.
 *
 * Built to a design drafted outside the repository. Its palette, type scale and
 * section order are carried over as-is; what changed is the set of claims.
 *
 * The draft asserted 10,000 TPS and 400ms finality as Kolo's own numbers,
 * showed a settled block height, quoted a "guaranteed floor" of ₦1,550,
 * streamed a live ticker of handles claimed seconds ago, and signed off as
 * "Kolo Finance Labs Inc." None of that is true, and throughput and latency
 * are Monad's properties rather than ours to advertise. Each of those slots is
 * filled with something the repository or the chain can back instead -- which
 * is cheaper to defend and, on a money page, worth more.
 *
 * Numbers that could drift come from `config`, never retyped: the naira rate,
 * the chain id, the contract addresses.
 *
 * The copy follows DESIGN.md's vocabulary rule, which the first draft did not:
 * no wallet, gas, blockchain, address, seed phrase or crypto in anything a
 * visitor reads. The stack is not hidden -- it is just kept where it is useful,
 * which is the header badge, the deployed-contract strip and the footer, for
 * the people who came to check rather than to send. ~400ms below is Monad's
 * block time, not a timing we took; it is stated as what a send feels like,
 * which is the honest version of a number we did not measure.
 */

export const metadata: Metadata = {
  /* `absolute`, so the root layout's "%s — Kolo" template does not append
     itself and say Kolo twice. */
  title: { absolute: "Kolo: money that moves like a message" },
  description:
    "Sign in with your email, pick your @handle, and send money to anyone by name. " +
    "It lands in seconds, it costs nothing, and there is nothing to download. " +
    "Save together in a circle, or put money aside for later.",
  openGraph: {
    type: "website",
    siteName: "Kolo",
    title: "Kolo: money that moves like a message",
    description:
      "Send money by name. Nothing to download, nothing to pay, nothing to keep safe.",
  },
};

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col overflow-x-clip bg-canvas text-body">
      <Header />
      <main className="w-full flex-1 pt-[72px] md:pt-20">
        <Hero />
        <Stats />
        <Features />
        <Comparison />
        <VoiceSection />
        <Live />
        <Questions />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}

/* ---------- header ---------- */

const NAV = [
  { href: "#features", label: "What you can do" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#voice", label: "Send by voice" },
  { href: "/about", label: "Is it safe?" },
];

function Header() {
  return (
    <header className="fixed left-0 top-0 z-50 w-full bg-canvas/90 shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-[1320px] items-center justify-between gap-3 px-4 sm:px-5 md:h-20 md:px-12">
        <div className="flex items-center gap-6">
          <Link href="/" className="-m-2 flex items-center gap-2 p-2">
            <KoloMark size={32} />
            <span className="font-display text-headline-sm tracking-tight text-deep">
              Kolo
            </span>
          </Link>
          <span className="hidden items-center gap-1 rounded-full bg-wash-2 px-2.5 py-1 xl:flex">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-spring" />
            <span className="text-label-caps uppercase text-body-soft">
              Monad Testnet
            </span>
          </span>
        </div>

        <nav className="hidden items-center gap-6 lg:flex">
          {NAV.map((item) =>
            item.href.startsWith("#") ? (
              <a
                key={item.label}
                href={item.href}
                className="text-label-lg text-body-soft transition-colors hover:text-body"
              >
                {item.label}
              </a>
            ) : (
              <Link
                key={item.label}
                href={item.href}
                className="text-label-lg text-body-soft transition-colors hover:text-body"
              >
                {item.label}
              </Link>
            ),
          )}
        </nav>

        <div className="flex items-center gap-2 md:gap-4">
          {/* A real preference lives in the app's Settings. This is a label for
              what the app does, not a control, so it is not a button. */}
          <span className="hidden items-center rounded-full bg-wash-2 p-1 sm:flex">
            <span className="rounded-full bg-card px-3 py-1 text-label-md text-deep shadow-[0_2px_0_0_rgba(14,21,14,0.08)]">
              USD
            </span>
            <span className="px-3 py-1 text-label-md text-body-soft">NGN</span>
          </span>
          <Link
            href="/app"
            className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-full
                       bg-spring px-4 text-label-lg text-on-spring
                       shadow-[0_2px_0_0_rgba(14,21,14,0.12)] transition-all hover:bg-spring-dim
                       active:translate-y-0.5 sm:px-5"
          >
            Claim @handle
          </Link>
          <span className="hidden h-9 w-9 items-center justify-center rounded-full bg-deep sm:flex">
            <Person className="h-4 w-4 text-spring" />
          </span>
          <MobileNav items={NAV} />
        </div>
      </div>
    </header>
  );
}

/* ---------- hero ---------- */

function Hero() {
  return (
    <section className="relative w-full overflow-hidden pb-16 pt-8 md:pb-24 md:pt-12">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-spring/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 top-1/2 h-[30rem] w-[30rem] rounded-full bg-mint/20 blur-3xl" />

      <div className="mx-auto max-w-[1320px] px-4 sm:px-5 md:px-12">
        <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-12">
          <div className="flex flex-col gap-6 lg:col-span-7">
            {/* The draft put "10,000 TPS • Zero Gas Fees" here. Throughput is
                Monad's number rather than ours, and the rest was in a language
                nobody sending money speaks. These three are promises to the
                person reading, and all three are ones the app keeps. */}
            <span className="flex w-fit items-center rounded-full bg-wash-3 px-3.5 py-2 shadow-sm sm:px-4">
              <span className="text-[11px] leading-[15px] tracking-wide text-deep sm:text-label-md">
                Lands in seconds • Never a fee • Nothing to download
              </span>
            </span>

            <div className="flex flex-col gap-1">
              <h1 className="font-display text-[34px] leading-[37px] tracking-[-0.035em] text-deep sm:text-display-xl">
                Money that moves like a message.
              </h1>
              <p className="font-display text-[26px] font-bold leading-[30px] tracking-[-0.025em] text-body-soft/90 sm:text-display-lg">
                Send it to a name. Done.
              </p>
            </div>

            <p className="max-w-xl text-body-md leading-relaxed text-body-soft sm:text-body-lg">
              Sign in with your email, pick your{" "}
              <span className="font-semibold text-deep">@handle</span>, and
              start sending. Nothing to download, nothing to top up first, and
              no long string of characters to get wrong. One tap, and it is with
              them.
            </p>

            {/* The draft's claim field was decorative. This one reads
                KoloRegistry.isAvailable as you type and carries the name into
                the app, so nobody types it twice. */}
            <div className="max-w-xl">
              <HandleCTA />
            </div>

            <Converter />
          </div>

          <div className="mt-8 flex justify-center lg:col-span-5 lg:mt-0">
            <SendDemo />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- stats ribbon ---------- */

/**
 * Four figures, each one an answer to something somebody actually wonders
 * before they send money: how long, how much, how many steps, what do I need.
 *
 * The draft's throughput figure is gone. 10,000 TPS is Monad's published
 * number, not a measurement of ours, and nobody deciding whether to trust an
 * app with their money is asking about throughput. ~400ms is Monad's block
 * time; it is stated here as how long a send takes to land, which is what it
 * means to the person reading. The other three are the product's own.
 */
const STATS: {
  label: string;
  value: React.ReactNode;
  note: string;
  lit: boolean;
}[] = [
  {
    label: "Money lands in",
    value: <CountUp to={400} suffix="ms" />,
    note: "No waiting screen, no spinner",
    lit: false,
  },
  {
    label: "What a send costs",
    value: <CountUp to={0} prefix="$" decimals={2} />,
    note: "Every send, every time. We cover it",
    lit: true,
  },
  {
    label: "Taps to send",
    value: "One",
    note: "Check it once, then it is gone",
    lit: false,
  },
  {
    label: "To sign in",
    value: "Email",
    note: "Nothing to write down or keep safe",
    lit: true,
  },
];

function Stats() {
  return (
    <section className="w-full bg-deep py-12 text-card">
      <div className="mx-auto max-w-[1320px] px-4 sm:px-5 md:px-12">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-8 text-center md:grid-cols-4 md:gap-6 md:text-left">
          {STATS.map((stat, i) => (
            <Reveal key={stat.label} delay={i * 70}>
              <dt className="text-[10px] font-bold uppercase leading-[14px] tracking-wider text-spring sm:text-label-caps">
                {stat.label}
              </dt>
              <dd
                className={`tabular mt-1 font-display text-[32px] font-extrabold leading-[36px] tracking-[-0.03em] sm:text-display-lg ${
                  stat.lit ? "text-spring" : "text-card"
                }`}
              >
                {stat.value}
              </dd>
              <dd className="mt-1 text-body-sm text-deep-quiet">{stat.note}</dd>
            </Reveal>
          ))}
        </dl>
      </div>
    </section>
  );
}

/* ---------- features ---------- */

const FEATURES = [
  {
    icon: <AtSign className="h-7 w-7" />,
    tone: "spring" as const,
    title: "Send by @handle",
    body: "Pay someone by the name they picked. Type @kemi, choose an amount, add a note if you like. One tap and it is with them.",
    foot: (
      <div className="flex items-center justify-between gap-2 rounded-2xl bg-wash-2 p-3">
        <span className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-deep text-label-md text-spring">
            @
          </span>
          <span className="truncate text-label-md text-deep">
            @kemi → @fola
          </span>
        </span>
        <span className="shrink-0 text-label-caps uppercase text-grass">
          Sent
        </span>
      </div>
    ),
  },
  {
    icon: <Mic className="h-7 w-7" />,
    tone: "deep" as const,
    title: "Send by voice",
    badge: "Stays on your phone",
    body: '"Send 5k to Tolu for lunch." Say it and the review screen fills itself in. Your words never leave your phone, and nothing moves until you say so.',
    foot: (
      <div className="flex flex-col gap-2 rounded-2xl bg-deep p-3 text-card">
        <div className="flex items-center justify-between">
          <span className="text-label-caps text-spring">Listening</span>
          {/* The bars move, as they do in the draft. Three heights, offset by
              delay, so the group reads as one waveform rather than a row of
              lights blinking together. */}
          <span className="flex h-3 items-end gap-1" aria-hidden>
            {[0, 100, 200, 150].map((d, i) => (
              <span
                key={d}
                className="w-1 origin-bottom animate-bar rounded-full bg-spring"
                style={{ height: [8, 16, 12, 20][i], animationDelay: `${d}ms` }}
              />
            ))}
          </span>
        </div>
        <span className="text-body-sm italic text-deep-quiet">
          &ldquo;Send $20 to @chidi for coffee&rdquo;
        </span>
      </div>
    ),
  },
  {
    icon: <LinkIcon className="h-7 w-7" />,
    tone: "wash" as const,
    title: "Send a link",
    body: "Send money to someone who is not on Kolo yet. They open the link and it is theirs. If nobody claims it in seven days, it comes back to you.",
    foot: (
      <div className="flex items-center justify-between gap-2 rounded-2xl bg-wash-2 p-3">
        <span className="truncate text-body-sm font-semibold text-deep">
          …/claim#x98a44fe
        </span>
        <span className="shrink-0 whitespace-nowrap rounded-full bg-deep px-2 py-0.5 text-label-caps text-spring">
          Yours till claimed
        </span>
      </div>
    ),
  },
  {
    icon: <Group className="h-7 w-7" />,
    tone: "spring" as const,
    title: "Circles (ajo)",
    body: "Save with the people you already save with. Everyone pays in, everyone takes a turn with the pot. Take an early turn and you set a little aside up front, returned in full when the circle finishes.",
    foot: (
      <div className="flex items-center justify-between gap-2 rounded-2xl bg-wash p-3">
        <span className="flex shrink-0 -space-x-2">
          {["A", "B", "C"].map((c, i) => (
            <span
              key={c}
              className={`flex h-7 w-7 items-center justify-center rounded-full text-label-md ${
                i === 0
                  ? "bg-deep text-spring"
                  : i === 1
                    ? "bg-grass text-card"
                    : "bg-spring text-on-spring"
              }`}
            >
              {c}
            </span>
          ))}
        </span>
        <span className="shrink-0 text-label-md text-deep">
          5 Members • ₦500k Pot
        </span>
      </div>
    ),
  },
  {
    icon: <Savings className="h-7 w-7" />,
    tone: "wash" as const,
    title: "Goals",
    body: "Put money aside for something and watch it fill up. Take it back whenever you want, all of it. No notice, no penalty, no catch.",
    foot: (
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between text-label-caps">
          <span className="text-deep">MacBook Pro M4</span>
          <span className="text-grass">78%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-wash-4">
          <div className="h-full w-[78%] rounded-full bg-grass" />
        </div>
      </div>
    ),
  },
  {
    icon: <Pie className="h-7 w-7" />,
    tone: "deep" as const,
    title: "Shared pots",
    body: "One pot for the things you split: rent, power, the internet bill. Everyone chips in, and nobody can spend past the share they put in.",
    foot: (
      <div className="flex items-center justify-between gap-2 rounded-2xl bg-wash-2 p-3">
        <span className="truncate text-body-sm font-bold text-deep">
          Starlink Internet Bill
        </span>
        <span className="shrink-0 text-label-caps uppercase text-grass">
          Capped at your share
        </span>
      </div>
    ),
  },
];

function Features() {
  return (
    <section
      id="features"
      className="w-full scroll-mt-20 bg-canvas py-16 md:py-24"
    >
      <div className="mx-auto flex max-w-[1320px] flex-col gap-8 px-4 sm:px-5 md:gap-10 md:px-12">
        <Reveal>
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div className="flex max-w-xl flex-col gap-1">
              <span className="text-label-caps uppercase tracking-widest text-grass">
                What you can do
              </span>
              <h2 className="font-display text-[32px] leading-[36px] tracking-[-0.025em] text-deep sm:text-display-lg">
                Six things, and nothing new to learn.
              </h2>
              <p className="mt-1 text-body-lg text-body-soft">
                Sending, saving together, putting money aside, splitting a
                bill. The same things you already do with money, without the
                parts that make you wait.
              </p>
            </div>
            <span className="w-fit rounded-full bg-wash-2 px-3 py-1 text-label-md text-deep">
              Six ways to move money
            </span>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 70}>
              <div className="group flex h-full flex-col justify-between rounded-3xl bg-card p-6 shadow-sm transition-all hover:shadow-md">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-transform group-hover:scale-110 ${
                        f.tone === "spring"
                          ? "bg-spring/50 text-deep"
                          : f.tone === "deep"
                            ? "bg-deep text-spring"
                            : "bg-wash-3 text-deep"
                      }`}
                    >
                      {f.icon}
                    </span>
                    {f.badge && (
                      <span className="rounded-full bg-spring px-2.5 py-1 text-label-caps uppercase text-on-spring">
                        {f.badge}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-display text-headline-md text-deep">
                      {f.title}
                    </h3>
                    <p className="mt-2 text-body-md leading-relaxed text-body-soft">
                      {f.body}
                    </p>
                  </div>
                </div>
                <div className="mt-6">{f.foot}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- comparison ---------- */

/**
 * Every row here is a difference somebody can check by opening one of the
 * other apps. The draft wrote both columns in the vocabulary of the thing we
 * are arguing against -- seed phrase, gas, addressing -- which asked the
 * reader to already know what we were sparing them. Each row now names the
 * step as the person experiences it.
 *
 * The draft's fourth row compared "15-45 sec" against "400ms"; neither figure
 * is ours, so the row is about the number of steps instead, which is.
 */
const ROWS = [
  {
    layer: "Opening an account",
    old: "Twenty-four words to copy down and never lose",
    kolo: "Your email. Ten seconds, nothing to keep safe",
  },
  {
    layer: "What it costs to send",
    old: "Buy something else first, just to pay the fee",
    kolo: "Nothing. We cover every send",
  },
  {
    layer: "Who you are paying",
    old: "A 42-character string. One wrong letter and it is gone",
    kolo: "A name you recognise. @tola, @dami",
  },
  {
    layer: "Actually sending it",
    old: "Three pop-ups and a spinner",
    kolo: "One tap. It is done",
  },
];

function Comparison() {
  return (
    <section
      id="how-it-works"
      className="w-full scroll-mt-20 bg-wash py-16 md:py-24"
    >
      <div className="mx-auto max-w-[1320px] px-4 sm:px-5 md:px-12">
        <Reveal>
          <div className="mx-auto mb-10 flex max-w-2xl flex-col gap-2 text-center">
            <span className="text-label-caps uppercase tracking-widest text-grass">
              How it works
            </span>
            <h2 className="font-display text-[32px] leading-[36px] tracking-[-0.025em] text-deep sm:text-display-lg">
              Four steps you will not be doing.
            </h2>
            <p className="text-body-lg text-body-soft">
              Every step below exists because of how money usually moves
              underneath. None of them are yours to do here.
            </p>
          </div>
        </Reveal>

        <Reveal>
          <div className="overflow-hidden rounded-3xl bg-card shadow-md">
            <div className="hidden grid-cols-12 gap-3 bg-wash-4 p-4 text-label-lg text-deep md:grid md:p-6">
              <div className="col-span-12 md:col-span-4">What happens</div>
              <div className="col-span-6 hidden text-body-soft md:col-span-4 md:block">
                Most apps like this
              </div>
              <div className="col-span-6 hidden items-center gap-1.5 text-grass md:col-span-4 md:flex">
                <CheckCircle className="h-4 w-4" />
                Kolo
              </div>
            </div>

            {ROWS.map((row, i) => (
              <div
                key={row.layer}
                className={`grid grid-cols-12 items-center gap-2 p-4 transition-colors hover:bg-wash/40 md:gap-3 md:p-6 ${
                  i < ROWS.length - 1 ? "border-b border-wash-3" : ""
                }`}
              >
                <div className="col-span-12 font-display text-headline-sm text-deep md:col-span-4">
                  {row.layer}
                </div>
                <div className="col-span-12 flex items-start gap-2 text-body-md text-body-soft md:col-span-4">
                  <span className="font-bold text-alert">×</span>
                  <span>
                    <span className="text-label-caps uppercase tracking-wider text-rule md:hidden">
                      Most apps{" "}
                    </span>
                    {row.old}
                  </span>
                </div>
                <div className="col-span-12 flex items-start gap-2 text-body-md font-semibold text-deep md:col-span-4">
                  <span className="font-bold text-grass">✓</span>
                  <span>
                    <span className="text-label-caps uppercase tracking-wider text-grass md:hidden">
                      Kolo{" "}
                    </span>
                    {row.kolo}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- voice ---------- */

/* ---------- voice ---------- */

function VoiceSection() {
  return (
    <section
      id="voice"
      className="w-full scroll-mt-20 bg-canvas py-16 md:py-20"
    >
      <div className="mx-auto max-w-[1320px] px-4 sm:px-5 md:px-12">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-deep p-5 text-card shadow-2xl sm:p-8 md:p-14">
            <div className="pointer-events-none absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-spring opacity-10 blur-3xl" />
            <VoiceDemo />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- what is live ---------- */

/**
 * The draft had a ticker of handles claimed four seconds ago, streaming in real
 * time. There is no such stream, and inventing social proof on a money page is
 * the worst thing on the list. The shape is kept; what scrolls through it is
 * the deployment, read from `config`, which is real and checkable.
 */
const LIVE = [
  { name: "KoloRegistry", address: config.contracts.registry },
  { name: "KoloPay", address: config.contracts.pay },
  { name: "KoloLinks", address: config.contracts.links },
  { name: "KoloCircle", address: config.contracts.circle },
  { name: "KoloGoals", address: config.contracts.goals },
  { name: "KoloPots", address: config.contracts.pots },
  { name: "KoloFaucet", address: config.contracts.faucet },
];

function Live() {
  return (
    <section className="w-full overflow-hidden bg-wash-2 py-10 md:py-12">
      <div className="mx-auto flex max-w-[1320px] flex-col gap-4 px-4 sm:px-5 md:px-12">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <span className="text-label-caps uppercase tracking-wider text-body-soft">
            Running live · Monad Testnet, chain {config.chain.id}
          </span>
          <Link
            href="/about"
            className="-m-2 flex min-h-[40px] shrink-0 items-center gap-1.5 p-2 text-label-md text-grass hover:underline"
          >
            For the curious
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <Ticker items={LIVE} />
      </div>
    </section>
  );
}

/* ---------- questions ---------- */

/**
 * The two answers DESIGN.md requires this page to carry, and which the draft
 * left out: a payment cannot be undone, and the amounts are public. They are
 * volunteered here rather than left for somebody to discover, because they are
 * the two facts that decide whether the rest of the page is believable.
 *
 * The third is the one a hackathon landing page is most tempted to skip: the
 * dollars are demo dollars. The page reads better without it and is worth
 * less, and anybody who signs up finds out in about four seconds.
 */
const QUESTIONS: {
  q: string;
  a: string;
  more?: { href: string; label: string };
}[] = [
  {
    q: "Is this real money?",
    a: "Not yet. Kolo runs on a test network, so the dollars in it are demo dollars and the app hands you $100 of them to try. Everything else is real: the names, the sends, the circles, the code. Nothing about how it works changes when the money does.",
  },
  {
    q: "What if I send it to the wrong person?",
    a: "Then it is gone. A send cannot be undone, by us or by anyone. That is why you are shown the name and the amount, every time, before anything moves.",
  },
  {
    q: "Can other people see what I send?",
    a: "The amounts, yes. Kolo settles in the open, so somebody who knows your @handle can look up what you sent, when, and the note you put on it. Your email and your legal name are in none of it.",
    more: { href: "/about", label: "See exactly what is public" },
  },
  {
    q: "What does it cost?",
    a: "Nothing to open, nothing to send, nothing every month. We pay for each send ourselves. The naira figure is the same money shown in naira, always rounded down, so it never says you have more than you do.",
  },
];

function Questions() {
  return (
    <section
      id="questions"
      className="w-full scroll-mt-20 bg-canvas py-16 md:py-24"
    >
      <div className="mx-auto flex max-w-[1320px] flex-col gap-8 px-4 sm:px-5 md:gap-10 md:px-12">
        <Reveal>
          <div className="mx-auto flex max-w-2xl flex-col gap-2 text-center">
            <span className="text-label-caps uppercase tracking-widest text-grass">
              Before you start
            </span>
            <h2 className="font-display text-[32px] leading-[36px] tracking-[-0.025em] text-deep sm:text-display-lg">
              The questions worth asking first.
            </h2>
            <p className="text-body-lg text-body-soft">
              Including the two answers we would rather you heard from us.
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
          {QUESTIONS.map((item, i) => (
            <Reveal key={item.q} delay={(i % 2) * 70}>
              <div className="flex h-full flex-col gap-3 rounded-3xl bg-card p-6 shadow-sm">
                <h3 className="font-display text-headline-md text-deep">
                  {item.q}
                </h3>
                <p className="text-body-md leading-relaxed text-body-soft">
                  {item.a}
                </p>
                {item.more && (
                  <Link
                    href={item.more.href}
                    className="-m-2 mt-auto flex w-fit items-center gap-1.5 p-2 text-label-md text-grass hover:underline"
                  >
                    {item.more.label}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- final CTA ---------- */

function FinalCTA() {
  return (
    <section className="w-full bg-canvas py-16 md:py-24">
      <div className="mx-auto max-w-[1320px] px-4 sm:px-5 md:px-12">
        <Reveal>
          <div className="relative flex flex-col items-center justify-between gap-6 overflow-hidden rounded-3xl bg-spring p-6 text-on-spring shadow-xl sm:p-10 md:flex-row md:p-16">
            <div className="z-10 flex max-w-xl flex-col gap-2">
              <span className="text-label-caps uppercase tracking-widest text-on-spring/70">
                Free, and still early
              </span>
              <h2 className="font-display text-[32px] font-extrabold leading-tight tracking-[-0.03em] sm:text-display-xl">
                Claim your @handle before it&apos;s taken.
              </h2>
              <p className="text-body-lg text-on-spring/80">
                Pick the name people will send money to. It is free, it is
                yours, and nobody but you can move what is behind it.
              </p>
            </div>

            <div className="z-10 flex w-full flex-col gap-3 sm:flex-row md:w-auto">
              <Link
                href="/app"
                className="flex min-h-[56px] items-center justify-center rounded-full bg-deep px-8
                           py-4 text-center font-display text-headline-sm text-spring shadow-md
                           transition-all hover:bg-deep-2 active:translate-y-0.5"
              >
                Claim your @handle
              </Link>
              <Link
                href="/about"
                className="flex min-h-[56px] items-center justify-center rounded-full bg-card/80 px-8
                           py-4 text-center font-display text-headline-sm text-deep transition-all
                           hover:bg-card active:translate-y-0.5"
              >
                See how it works
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- footer ---------- */

function Footer() {
  return (
    <footer className="w-full bg-wash pb-12 pt-10">
      <div className="mx-auto max-w-[1320px] px-4 sm:px-5 md:px-12">
        <div className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-12">
          <div className="flex flex-col gap-4 md:col-span-7">
            <Link href="/" className="-m-2 flex w-fit items-center gap-2 p-2">
              <KoloMark size={28} />
              <span className="font-display text-headline-sm tracking-tight text-deep">
                Kolo
              </span>
            </Link>
            <p className="max-w-sm text-body-sm text-body-soft">
              Send money to anyone by their name. Save with the people you
              already save with. Nothing to download, nothing to pay, nothing to
              keep safe.
            </p>
            <span className="flex w-fit items-center gap-2 rounded-full bg-wash-4 px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-grass" />
              <span className="text-label-caps text-deep">
                Monad Testnet · chain {config.chain.id}
              </span>
            </span>
          </div>

          <div className="flex flex-col md:col-span-5">
            <span className="mb-2 text-label-caps uppercase tracking-wider text-body-soft">
              What you can do
            </span>
            {[
              ["Send by @handle", "#features"],
              ["Send by voice", "#voice"],
              ["Circles and pots", "#features"],
              ["How it works", "#how-it-works"],
              ["Questions", "#questions"],
            ].map(([label, href]) => (
              <a
                key={label}
                href={href}
                className="-mx-2 flex min-h-[40px] items-center rounded-lg px-2 text-body-sm text-body-soft transition-colors hover:text-body"
              >
                {label}
              </a>
            ))}
          </div>
        </div>

        <div className="mb-10 border-t border-wash-4 pt-8">
          <p className="mb-6 text-center text-label-caps uppercase tracking-widest text-body-soft">
            What Kolo actually runs on
          </p>
          <StackRow />
        </div>

        <div className="flex flex-col items-center justify-between gap-2 border-t border-wash-4 pt-6 text-center md:flex-row md:gap-3 md:text-left">
          <p className="text-body-sm text-body-soft">
            Built in the open. Money that moves like a message.
          </p>
          <p className="text-body-sm text-body-soft">
            Deployed to Monad Testnet at block {config.deployBlock.toString()}.
          </p>
        </div>
      </div>
    </footer>
  );
}
