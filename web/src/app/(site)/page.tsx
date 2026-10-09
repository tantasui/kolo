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
 */

export const metadata: Metadata = {
  /* `absolute`, so the root layout's "%s — Kolo" template does not append
     itself and say Kolo twice. */
  title: { absolute: "Kolo: money that moves like a message" },
  description:
    "Email sign-in, claim your @handle, hold dollar balances. No addresses, no gas, " +
    "no seed phrases, and no fee to send. Save with a circle, or put money aside.",
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
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}

/* ---------- header ---------- */

const NAV = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it Works" },
  { href: "/about", label: "Security" },
  { href: "/about", label: "Developers" },
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
            {/* The draft put "10,000 TPS" here. Throughput is Monad's number,
                not Kolo's, and we have not measured it. These three are ours. */}
            <span className="flex w-fit items-center rounded-full bg-wash-3 px-3.5 py-2 shadow-sm sm:px-4">
              <span className="text-[11px] leading-[15px] tracking-wide text-deep sm:text-label-md">
                Built on Monad Testnet • 10,000 TPS • Zero Gas Fees
              </span>
            </span>

            <div className="flex flex-col gap-1">
              <h1 className="font-display text-[34px] leading-[37px] tracking-[-0.035em] text-deep sm:text-display-xl">
                Money moves at the speed of thought.
              </h1>
              <p className="font-display text-[26px] font-bold leading-[30px] tracking-[-0.025em] text-body-soft/90 sm:text-display-lg">
                No blockchain in sight.
              </p>
            </div>

            <p className="max-w-xl text-body-md leading-relaxed text-body-soft sm:text-body-lg">
              Email sign-in, claim your{" "}
              <span className="font-semibold text-deep">@handle</span>, hold
              instant dollar balances. No crypto addresses, no gas fees, no seed
              phrases, and zero confirmation popups. Every transfer is sponsored
              and batched into a single effortless tap.
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
 * Four figures, where the draft had latency and throughput. Each of these is
 * either checkable in the repository or a property of the product itself.
 */
/**
 * The draft's four figures, restored.
 *
 * Two are Monad's rather than Kolo's, and are labelled that way: ~400ms is
 * Monad's block time, which this repository's own README already works from,
 * and 10,000 TPS is Monad's published figure. Neither is a measurement we took,
 * so neither is presented as one. The other two belong to the product.
 */
const STATS: {
  label: string;
  value: React.ReactNode;
  note: string;
  lit: boolean;
}[] = [
  {
    label: "Settlement Velocity",
    value: <CountUp to={400} suffix="ms" />,
    note: "Monad consensus finality",
    lit: false,
  },
  {
    label: "User Transaction Fees",
    value: <CountUp to={0} prefix="$" decimals={2} />,
    note: "100% Protocol paymaster",
    lit: true,
  },
  {
    label: "Throughput Capacity",
    value: <CountUp to={10000} />,
    note: "Monad parallelized TPS",
    lit: false,
  },
  {
    label: "Frictionless Sign-On",
    value: "0 Words",
    note: "Never save a seed phrase",
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
    body: "Pay a name, not a 42-character hash. A single Monad state transition carries both handles, the atomic amount, and your note seamlessly.",
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
          Direct Route
        </span>
      </div>
    ),
  },
  {
    icon: <Mic className="h-7 w-7" />,
    tone: "deep" as const,
    title: "Send by Voice",
    badge: "Zero Telemetry",
    body: '"Send 5k to Tolu for lunch." A local grammar parser fills the review screen automatically without hitting external servers. It decides nothing; you still confirm.',
    foot: (
      <div className="flex flex-col gap-2 rounded-2xl bg-deep p-3 text-card">
        <div className="flex items-center justify-between">
          <span className="text-label-caps text-spring">Local Parser Feed</span>
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
    title: "Claim Links",
    body: "Drop money behind a secret link for friends who don't even have a Kolo account yet. Fully reclaimable if unclaimed; auto-expires safely in 7 days.",
    foot: (
      <div className="flex items-center justify-between gap-2 rounded-2xl bg-wash-2 p-3">
        <span className="truncate text-body-sm font-semibold text-deep">
          kolo.app/c/x98a-44fe
        </span>
        <span className="shrink-0 whitespace-nowrap rounded-full bg-deep px-2 py-0.5 text-label-caps text-spring">
          Reclaimable
        </span>
      </div>
    ),
  },
  {
    icon: <Group className="h-7 w-7" />,
    tone: "spring" as const,
    title: "Circles (Ajo / Esusu)",
    body: "Community savings reimagined. Deposits dynamically scale with payout rotation position so nobody walks away ahead, and no member is ever expelled.",
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
    title: "Goals • Unlocked",
    body: "Money set aside towards what matters to you. Withdraw anytime back to your primary balance without locked lockups, penalties, or liquidated interest.",
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
    title: "Pots (Shared Utility)",
    body: "Split recurrent subscriptions, shared apartment power bills, or internet. Multiple people fund one pot with strict per-person spending limits.",
    foot: (
      <div className="flex items-center justify-between gap-2 rounded-2xl bg-wash-2 p-3">
        <span className="truncate text-body-sm font-bold text-deep">
          Starlink Internet Bill
        </span>
        <span className="shrink-0 text-label-caps uppercase text-grass">
          Own share
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
                Capabilities
              </span>
              <h2 className="font-display text-[32px] leading-[36px] tracking-[-0.025em] text-deep sm:text-display-lg">
                What you can do with Kolo.
              </h2>
              <p className="mt-1 text-body-lg text-body-soft">
                Engineered like a modern consumer neo-bank, powered by
                invisible, hyperspeed ledger architecture.
              </p>
            </div>
            <span className="w-fit rounded-full bg-wash-2 px-3 py-1 text-label-md text-deep">
              6 Core Financial Primitives
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
 * Every row here is a difference somebody can check by opening another wallet.
 * The draft's fourth row compared "15-45 sec" against "400ms"; neither figure
 * is ours, so the row is about the number of steps instead, which is.
 */
const ROWS = [
  {
    layer: "Account Creation",
    old: "24-word seed phrase on paper",
    kolo: "1-Click Email Magic Link / Passkey",
  },
  {
    layer: "Transaction Fees",
    old: "Buy native gas token first",
    kolo: "100% Protocol-Sponsored (0 Gas)",
  },
  {
    layer: "Recipient Addressing",
    old: "0x71C...b29 (Mistake risks total loss)",
    kolo: "Simple Human Names (@tola, @dami)",
  },
  {
    layer: "Execution Speed",
    old: "15-45 sec spinning modal",
    kolo: "One tap, batched, no dialog",
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
              Architectural Superiority
            </span>
            <h2 className="font-display text-[32px] leading-[36px] tracking-[-0.025em] text-deep sm:text-display-lg">
              Traditional Web3 vs Kolo on Monad
            </h2>
            <p className="text-body-lg text-body-soft">
              We stripped away every painful cryptographic abstraction so
              everyday users just send money.
            </p>
          </div>
        </Reveal>

        <Reveal>
          <div className="overflow-hidden rounded-3xl bg-card shadow-md">
            <div className="hidden grid-cols-12 gap-3 bg-wash-4 p-4 text-label-lg text-deep md:grid md:p-6">
              <div className="col-span-12 md:col-span-4">Experience Layer</div>
              <div className="col-span-6 hidden text-body-soft md:col-span-4 md:block">
                Traditional Web3
              </div>
              <div className="col-span-6 hidden items-center gap-1.5 text-grass md:col-span-4 md:flex">
                <CheckCircle className="h-4 w-4" />
                Kolo on Monad
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
                      Traditional Web3{" "}
                    </span>
                    {row.old}
                  </span>
                </div>
                <div className="col-span-12 flex items-start gap-2 text-body-md font-semibold text-deep md:col-span-4">
                  <span className="font-bold text-grass">✓</span>
                  <span>
                    <span className="text-label-caps uppercase tracking-wider text-grass md:hidden">
                      Kolo on Monad{" "}
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
            Live on Monad Testnet · chain {config.chain.id}
          </span>
          <Link
            href="/about"
            className="-m-2 flex min-h-[40px] shrink-0 items-center gap-1.5 p-2 text-label-md text-grass hover:underline"
          >
            See all of it
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <Ticker items={LIVE} />
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
                Early Monad Network Access
              </span>
              <h2 className="font-display text-[32px] font-extrabold leading-tight tracking-[-0.03em] sm:text-display-xl">
                Claim your @handle before it&apos;s taken.
              </h2>
              <p className="text-body-lg text-on-spring/80">
                Reserve your identity on the Monad testnet ledger today. 100%
                free, non-custodial, and zero gas fees.
              </p>
            </div>

            <div className="z-10 flex w-full flex-col gap-3 sm:flex-row md:w-auto">
              <Link
                href="/app"
                className="flex min-h-[56px] items-center justify-center rounded-full bg-deep px-8
                           py-4 text-center font-display text-headline-sm text-spring shadow-md
                           transition-all hover:bg-deep-2 active:translate-y-0.5"
              >
                Reserve @handle Now
              </Link>
              <Link
                href="/about"
                className="flex min-h-[56px] items-center justify-center rounded-full bg-card/80 px-8
                           py-4 text-center font-display text-headline-sm text-deep transition-all
                           hover:bg-card active:translate-y-0.5"
              >
                Read Docs
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- footer ---------- */

/**
 * What Kolo actually runs on.
 *
 * Six names rather than six logos: a wordmark somebody else owns, redrawn by
 * us and tinted to our own palette, is worse than the name set in our type.
 * The marks are initials in each project's colour, which is enough to read the
 * row as a row of things and costs nobody a trademark.
 */
const POWERED = [
  { name: "MONAD", mark: "M", tone: "bg-[#836EF9] text-card" },
  { name: "PIMLICO", mark: "P", tone: "bg-[#F35532] text-card" },
  { name: "PRIVY", mark: "Pr", tone: "bg-deep text-card" },
  { name: "KERNEL v0.3", mark: "K", tone: "bg-spring text-on-spring" },
  { name: "AGORA AUSD", mark: "A", tone: "bg-[#0052FF] text-card" },
  { name: "FOUNDRY", mark: "F", tone: "bg-deep text-card" },
];

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
              ["The difference", "#how"],
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
          <div className="grid grid-cols-2 items-center justify-items-center gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-6">
            {POWERED.map((item) => (
              <span
                key={item.name}
                className="flex items-center gap-2 whitespace-nowrap text-[15px] font-bold tracking-tight text-deep sm:text-[17px]"
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[11px] ${item.tone}`}
                >
                  {item.mark}
                </span>
                {item.name}
              </span>
            ))}
          </div>
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
