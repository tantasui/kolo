import type { Metadata } from "next";
import Link from "next/link";
import { config } from "@/config";
import { formatMoney } from "@/lib/format";
import { HandleCTA } from "@/components/about/HandleCTA";
import { Photo } from "@/components/about/Photo";
import { Reveal } from "@/components/about/Reveal";
import { ArrowRight, Battery, Clock, Signal } from "@/components/about/Icons";
import {
  ArrowUpRight,
  Check,
  Circle,
  House,
  LinkIcon,
  Meter,
  Plus,
  Target,
} from "@/components/ui/Icons";
import { KoloMark } from "@/components/ui/Wordmark";

/**
 * The page you send someone before they open the app.
 *
 * It recreates a layout drafted outside the repository, section for section,
 * on the app's own tokens. Three kinds of thing in that draft are different
 * here, and all three are deliberate:
 *
 * 1. **Claims the repository and the chain cannot back are gone.** The draft
 *    announced a closed $4.2M seed round, listed Paradigm among the backers,
 *    quoted sub-400ms settlement and 10,000 TPS, called the test suite "formal
 *    verification", linked a security audit, and signed off as "Kolo Labs Inc."
 *    None of it is true. Monad, Pimlico, Privy, Kernel, Agora and Foundry all
 *    stayed, because those we really do use. Every address, amount and count
 *    below comes from `config` or from the repository, so the page cannot
 *    drift from the deployment.
 *
 * 2. **The three photographs are served by us.** The draft hotlinked them from
 *    a Google CDN, whose URLs expire; these live in `public/img/` and are run
 *    through `next/image`, so they are cropped, sized and cached properly.
 *
 * 3. **DESIGN.md's vocabulary rule is relaxed on this page and only this
 *    page.** The app never says wallet, gas, blockchain or token; this draft
 *    says all of them, on purpose, because it is addressed to someone deciding
 *    whether Kolo is real. The rule still holds inside the app, absolutely.
 */

const REPO = "https://github.com/tantasui/kolo";

/** Demo figures for the phone. Rendered through the app's own formatter. */
const PHONE_BALANCE = 4_850_000_000n;

export const metadata: Metadata = {
  title: "Money that moves like a message",
  description:
    "No seed phrases. No gas fees. No hex addresses. Sign in with your email, claim your " +
    "@handle, and send dollars to anyone by name.",
  openGraph: {
    type: "website",
    siteName: "Kolo",
    title: "Kolo — money that moves like a message",
    description:
      "Sign in with your email, claim your @handle, and send money by name. Every fee is on us.",
  },
  twitter: {
    card: "summary",
    title: "Kolo — money that moves like a message",
    description:
      "Sign in with your email, claim your @handle, and send money by name. Every fee is on us.",
  },
};

export default function AboutPage() {
  return (
    <div className="relative flex min-h-screen flex-col justify-between overflow-x-clip bg-ink">
      {/* `overflow-x: clip` rather than `hidden`: hidden would turn this into a
          scroll container and the sticky header would stop sticking to the
          viewport. clip just trims what hangs over the edge. */}
      {/* ambient glow, fixed behind everything */}
      <div
        className="pointer-events-none fixed left-1/2 top-0 -z-10 h-[350px] w-full max-w-[900px] -translate-x-1/2 rounded-full bg-accent/5 blur-[140px]"
        /* w-full, not w-[900px]: centred at 900px it reached 255px past each
           edge of a phone and gave the whole page a sideways scroll. */
      />

      <Header />

      <main className="about-grid flex-1">
        <Hero />
        <HowItWorks />
        <Everyday />
        <Stack />
        <Principle />
        <CirclesSpotlight />
        <Features />
        <Architecture />
        <CallToAction />
      </main>

      <Footer />
    </div>
  );
}

/* ---------- header ---------- */

/**
 * Four links, not seven.
 *
 * The first cut of this bar carried seven of them plus a version badge plus a
 * "Sponsored · 0.00 gas" pill plus the button, and wrapped every label onto two
 * lines even on a wide screen. A nav is a way back to the few places people
 * actually want; everything else is a scroll away.
 */
const NAV = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#features", label: "What you can do" },
  { href: "#circles", label: "Circles" },
  { href: "#architecture", label: "Architecture" },
];

function Header() {
  return (
    <header className="about-bar sticky top-0 z-50 border-b border-line/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-6 md:h-[72px]">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-pill border border-line bg-surface transition-colors hover:border-accent/40">
            <KoloMark size={20} />
          </span>
          <span className="text-[22px] font-bold tracking-tight text-text">
            kolo
          </span>
        </Link>

        <nav
          aria-label="Sections"
          className="hidden flex-1 items-center justify-center gap-8 lg:flex"
        >
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="whitespace-nowrap text-[15px] text-muted transition-colors hover:text-text"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2 lg:ml-0">
          <a
            href={REPO}
            className="hidden h-10 items-center whitespace-nowrap rounded-pill border border-line px-4 text-[15px] text-muted transition-colors hover:bg-raised hover:text-text sm:inline-flex"
          >
            Source
          </a>
          <Link
            href="/"
            className="inline-flex h-10 items-center whitespace-nowrap rounded-pill bg-accent px-5 text-[15px] font-semibold text-ink shadow-[0_0_24px_-4px_rgba(210,255,58,0.3)] transition-all hover:bg-accent-dim active:scale-[0.98]"
          >
            Launch app
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ---------- hero ---------- */

/**
 * Three figures where the draft had a funding announcement and a latency
 * benchmark. These are the ones that survive being checked: accounts really do
 * hold nothing, sending really is one operation, and the tests really do run.
 */
const HERO_STATS = [
  { value: "0 wei", label: "held by your account, ever" },
  { value: "One tap", label: "approval travels with the payment" },
  { value: "192/192", label: "contract tests passing" },
];

function Hero() {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-24 pt-16 lg:pb-32 lg:pt-24">
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-8">
        <div className="flex flex-col justify-center lg:col-span-7">
          <div className="mb-6 inline-flex w-fit items-center gap-2.5 rounded-pill border border-line bg-surface px-3.5 py-1.5 text-[13px] text-muted">
            <span className="flex h-2 w-2 rounded-full bg-accent" />
            <span className="font-medium text-text">Open now</span>
          </div>

          <h1 className="mb-6 text-4xl font-extrabold leading-[1.08] tracking-tight text-text sm:text-5xl lg:text-6xl">
            Make sending money feel like{" "}
            <span className="text-accent underline decoration-accent/30 underline-offset-8">
              sending a message
            </span>
            .
          </h1>

          <p className="mb-8 max-w-2xl text-[17px] font-normal leading-relaxed text-muted sm:text-[19px]">
            No seed phrases. No gas fees. No hex addresses. Sign in with your
            email, claim your{" "}
            <span className="font-mono text-text">@handle</span>, and send
            dollar balances to anyone by name. Sponsored account abstraction
            underneath, and group savings built in.
          </p>

          <div className="mb-12 flex flex-wrap items-center gap-4">
            <Link
              href="/"
              className="inline-flex h-14 items-center gap-2.5 rounded-pill bg-accent px-8 text-[16px]
                         font-semibold text-ink shadow-lg shadow-accent/15 transition-all
                         hover:bg-accent-dim active:scale-[0.98]"
            >
              <span>Open Kolo on your phone</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
            <a
              href="#architecture"
              className="inline-flex h-14 items-center gap-2 rounded-pill border border-line bg-raised
                         px-6 text-[15px] font-medium text-text transition-all hover:bg-surface
                         active:scale-[0.98]"
            >
              <Clock className="h-4 w-4 text-muted" />
              <span>Explore the architecture</span>
            </a>
          </div>

          {/* Three columns only once there is room for them: at 390px a third
              of the width cannot hold "192/192" at 26px, and the labels wrap to
              four lines. On a phone each stat is a row instead. */}
          <dl className="grid max-w-xl grid-cols-1 gap-x-6 gap-y-3 border-t border-line/60 pt-8 sm:grid-cols-3 sm:gap-y-6">
            {HERO_STATS.map((stat, index) => (
              <Reveal key={stat.value} delay={index * 70}>
                <div className="flex items-baseline gap-3 sm:block">
                  <dt className="tabular shrink-0 text-[22px] font-bold text-text sm:text-[26px]">
                    {stat.value}
                  </dt>
                  <dd className="text-[13px] leading-snug text-muted sm:mt-0.5">
                    {stat.label}
                  </dd>
                </div>
              </Reveal>
            ))}
          </dl>
        </div>

        {/* Hidden below lg: on a phone this is a 390px picture of the app
            shown at 390px, which is a screenshot of nothing, and it was the
            single longest thing on the page. */}
        <div className="relative hidden justify-center lg:col-span-5 lg:flex lg:justify-end">
          <div className="absolute -inset-4 -z-10 rounded-[48px] bg-gradient-to-tr from-accent/10 to-inbound/5 blur-2xl" />
          <PhoneMock />
        </div>
      </div>
    </section>
  );
}

/* ---------- the phone ---------- */

const ACTIVITY = [
  {
    kind: "in" as const,
    initials: "TA",
    tone: "bg-inbound text-ink",
    title: "@tarik",
    sub: "Circle round 4 payout",
    amount: 600_000_000n,
    when: "Just now",
  },
  {
    kind: "out" as const,
    initials: "CH",
    tone: "bg-[#FF9BA8] text-ink",
    title: "@chidi",
    sub: "Dinner split · Lagos",
    amount: 42_500_000n,
    when: "2h ago",
  },
  {
    kind: "link" as const,
    initials: "",
    tone: "border border-line bg-raised text-accent",
    title: "Link created",
    sub: "/claim#x98f…",
    amount: 100_000_000n,
    when: "Yesterday",
  },
];

const TABS = [
  { label: "Home", icon: <House className="h-5 w-5" />, active: true },
  { label: "Circles", icon: <Circle className="h-5 w-5" />, active: false },
  { label: "Goals", icon: <Target className="h-5 w-5" />, active: false },
  { label: "Pots", icon: <Meter className="h-5 w-5" />, active: false },
];

function PhoneMock() {
  return (
    <div className="w-full max-w-[390px] rounded-[44px] border border-[#2a2a35] bg-[#0e0e12] p-3.5 shadow-[0_20px_50px_rgba(0,0,0,0.95)]">
      <div className="about-glass relative flex min-h-[640px] w-full select-none flex-col overflow-hidden rounded-[34px] border border-line text-text">
        {/* status bar */}
        <div className="flex h-10 items-center justify-between px-6 text-[13px] font-medium text-muted">
          <span className="tabular text-text">9:41</span>
          <span className="h-4 w-20 rounded-pill border border-line/40 bg-[#141419]" />
          <span className="flex items-center gap-1.5">
            <Signal className="h-3 w-3" />
            <Battery className="h-3.5 w-3.5" />
          </span>
        </div>

        <div className="flex flex-1 flex-col justify-between px-5 pb-6 pt-2">
          <div>
            {/* who you are */}
            <div className="mb-6 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E5B54F] text-[14px] font-bold text-ink">
                  KO
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold leading-tight text-text">
                    @kolo_founder
                  </p>
                  <p className="truncate text-[13px] text-muted">
                    Your name on Kolo
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 rounded-pill border border-line bg-raised px-2.5 py-1 text-[13px] text-muted">
                <span className="font-semibold text-accent">$ USD</span>
                <span className="text-line">|</span>
                <span>₦ NGN</span>
              </div>
            </div>

            {/* balance, at the top of the type ladder */}
            <div className="mb-7">
              <p className="mb-1 text-[14px] font-medium text-muted">Balance</p>
              <p className="tabular text-[52px] font-extrabold leading-none tracking-tight text-text">
                {formatMoney(PHONE_BALANCE, "USD").split(".")[0]}
                <span className="text-[38px] text-muted">
                  .{formatMoney(PHONE_BALANCE, "USD").split(".")[1]}
                </span>
              </p>
              <div className="tabular mt-2 flex items-center gap-1.5 text-[14px] font-normal text-muted">
                <span>≈ {formatMoney(PHONE_BALANCE, "NGN")}</span>
                <span className="rounded bg-inbound/10 px-1.5 py-0.5 font-mono text-[11px] text-inbound">
                  ₦{config.fx.ngnPerUsd.toLocaleString("en-US")} to $1
                </span>
              </div>
            </div>

            {/* the two things on Home */}
            <div className="mb-6 grid grid-cols-2 gap-3">
              <span className="flex h-[54px] items-center justify-center gap-2 rounded-pill bg-accent text-[16px] font-semibold text-ink">
                <ArrowUpRight className="h-5 w-5" />
                Send
              </span>
              <span className="flex h-[54px] items-center justify-center gap-2 rounded-pill border border-line bg-raised text-[16px] font-semibold text-text">
                <Plus className="h-5 w-5" />
                Add funds
              </span>
            </div>

            {/* activity: inbound is green, outgoing never is */}
            <div>
              <div className="mb-3 flex items-center justify-between text-[14px] font-medium text-muted">
                <span>Recent activity</span>
                <span className="text-[13px] text-accent">View all</span>
              </div>
              <ul className="space-y-2">
                {ACTIVITY.map((row) => (
                  <li
                    key={row.title}
                    className="flex items-center justify-between rounded-2xl border border-line/80 bg-surface p-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${row.tone}`}
                      >
                        {row.kind === "link" ? (
                          <LinkIcon className="h-5 w-5" />
                        ) : (
                          row.initials
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-semibold text-text">
                          {row.title}
                        </p>
                        <p
                          className={`truncate text-[13px] ${row.kind === "link" ? "text-accent" : "text-muted"}`}
                        >
                          {row.sub}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p
                        className={`tabular text-[16px] font-bold ${row.kind === "in" ? "text-inbound" : "text-text"}`}
                      >
                        {row.kind === "in" ? "+" : "−"}&#8202;
                        {formatMoney(row.amount, "USD")}
                      </p>
                      <p className="tabular text-[13px] text-muted">
                        {row.when}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* the places there are */}
          <div className="grid grid-cols-4 border-t border-line/80 pt-3 text-center">
            {TABS.map((tab) => (
              <div
                key={tab.label}
                className={`flex flex-col items-center gap-1 ${tab.active ? "text-accent" : "text-muted"}`}
              >
                {tab.icon}
                <span className="text-[11px] font-medium">{tab.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex h-4 items-center justify-center pb-2">
          <span className="h-1 w-32 rounded-pill bg-muted/40" />
        </div>
      </div>
    </div>
  );
}

/* ---------- everyday ---------- */

const EVERYDAY_POINTS = [
  {
    title: "Splitting a bill without the awkwardness",
    body: "A handle or a link settles it before the bill has left the table.",
  },
  {
    title: "Share the link anywhere",
    body: "Send money to somebody with no account at all. They open the link, see the amount, and take it — WhatsApp, a message, however you already talk.",
  },
  {
    title: "Dollars and naira, side by side",
    body: "Your balance is held in dollars and shown in either. The rate is fixed and printed on the screen, so the figure you see is the figure that moves.",
  },
];

function Everyday() {
  return (
    <section
      id="everyday"
      className="scroll-mt-20 border-t border-line bg-surface/30 py-20"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
          <Reveal className="lg:col-span-7">
            <div className="group relative">
              <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-accent/15 via-transparent to-inbound/10 opacity-70 blur-xl transition-opacity group-hover:opacity-100" />
              <div className="relative overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl">
                <Photo
                  src="/img/image.webp"
                  alt="Two friends laughing over coffee, settling up on a phone"
                  className="h-[420px] w-full sm:h-[480px]"
                  priority
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent" />

                {/* the floating receipt */}
                <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between rounded-xl border border-line/80 bg-ink/90 p-4 backdrop-blur-md">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full border border-accent/40 bg-accent/20 text-sm">
                      ☕
                    </span>
                    <div>
                      <p className="text-[14px] font-semibold text-text">
                        Coffee and brunch · @chidi
                      </p>
                      <p className="text-[12px] text-muted">
                        Sent by handle, one tap
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="tabular text-[15px] font-bold text-text">
                      {formatMoney(18_500_000n, "USD")}
                    </p>
                    <p className="font-mono text-[11px] text-inbound">
                      No fee · seconds
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>

          <div className="flex flex-col justify-center lg:col-span-5">
            <Reveal>
              <span className="mb-5 inline-flex w-fit items-center gap-2 rounded-pill border border-line bg-raised px-3 py-1 font-mono text-[12px] uppercase tracking-wider text-accent">
                Everyday money
              </span>
              <h2 className="mb-5 text-3xl font-extrabold leading-tight tracking-tight text-text sm:text-4xl">
                Payments as natural as chatting with friends.
              </h2>
              <p className="mb-6 text-[17px] font-normal leading-relaxed text-muted">
                Split the coffee, cover dinner, send money home. No waiting on a
                bank, and nothing to copy and paste. Kolo fits into the way you
                already talk to people.
              </p>
            </Reveal>

            <div className="space-y-4 pt-2">
              {EVERYDAY_POINTS.map((point, index) => (
                <Reveal key={point.title} delay={index * 70}>
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent/10">
                      <Check className="h-3.5 w-3.5 text-accent" />
                    </span>
                    <div>
                      <p className="text-[15px] font-semibold text-text">
                        {point.title}
                      </p>
                      <p className="text-[14px] leading-relaxed text-muted">
                        {point.body}
                      </p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- how it works ---------- */

/**
 * How you *use* it. This section sat under this name and talked about Kernel
 * accounts and contract addresses, which is not what somebody clicking "how it
 * works" is asking. That material is still on the page, a section further
 * down, under the name it deserves.
 *
 * No contract is mentioned here, and nothing below is a claim about machinery:
 * these are the three things a person does, in the order they do them.
 */
const STEPS = [
  {
    n: "01",
    title: "Sign in with your email",
    body: "No app to install, no password to invent, and nothing to write down and keep somewhere safe. A link arrives, you tap it, and your account exists.",
    note: "About twenty seconds",
  },
  {
    n: "02",
    title: "Pick your @handle",
    body: "The name people will pay you by, instead of an account number. You can see as you type whether it is still free, and once it is yours nobody else can take it.",
    note: "The only thing you have to choose",
  },
  {
    n: "03",
    title: "Send someone money",
    body: "Type their name, type an amount, add a note if you want them to remember what it was for. One tap, no confirmation screen, no fee. It is with them in seconds.",
    note: "And that is the whole thing",
  },
];

function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-20 border-t border-line bg-surface/30 py-20"
    >
      <div className="mx-auto max-w-7xl px-6">
        <Reveal>
          <div className="mb-14 max-w-2xl">
            <p className="mb-3 font-mono text-[13px] uppercase tracking-widest text-accent">
              How it works
            </p>
            <h2 className="mb-4 text-3xl font-bold leading-tight tracking-tight text-text sm:text-4xl">
              Three steps, and you have sent someone money.
            </h2>
            <p className="text-[17px] leading-relaxed text-muted">
              There is no onboarding to sit through, no document to upload, and
              nothing to fund before you can use it. Opening the page and paying
              somebody is about a minute, and most of that is picking a name you
              like.
            </p>
          </div>
        </Reveal>

        <ol className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <Reveal key={step.n} delay={index * 80}>
              <li className="about-pane relative flex h-full flex-col justify-between rounded-2xl border border-line p-7 transition-all hover:border-accent/30">
                <div>
                  <div className="mb-6 flex items-center justify-between">
                    <span className="font-mono text-[32px] font-bold leading-none text-accent">
                      {step.n}
                    </span>
                    {index < STEPS.length - 1 && (
                      <ArrowRight className="hidden h-5 w-5 text-line md:block" />
                    )}
                  </div>
                  <h3 className="mb-2 text-[20px] font-bold text-text">
                    {step.title}
                  </h3>
                  <p className="text-[15px] leading-relaxed text-muted">
                    {step.body}
                  </p>
                </div>
                <p className="mt-6 border-t border-line/60 pt-4 font-mono text-[12px] text-muted">
                  {step.note}
                </p>
              </li>
            </Reveal>
          ))}
        </ol>

        <Reveal delay={120}>
          <div className="mt-6 flex flex-col items-start justify-between gap-5 rounded-2xl border border-line bg-raised p-7 md:flex-row md:items-center">
            <div className="flex items-start gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill border border-accent/30 bg-accent/10">
                <Plus className="h-5 w-5 text-accent" />
              </span>
              <div>
                <p className="text-[16px] font-semibold text-text">
                  Then put it on your home screen
                </p>
                <p className="mt-1 max-w-xl text-[14px] leading-relaxed text-muted">
                  Kolo runs in the browser, so there is nothing in an app store
                  to wait for. Add it to your home screen and it opens
                  full-screen like anything else on your phone.
                </p>
              </div>
            </div>
            <Link
              href="/"
              className="inline-flex h-12 shrink-0 items-center justify-center rounded-pill bg-accent
                         px-6 text-[15px] font-semibold text-ink transition-all hover:bg-accent-dim
                         active:scale-[0.98]"
            >
              Start now
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- the stack ---------- */

/**
 * The draft headed this strip "Backed by top tier networks" and put Paradigm in
 * it. Every name below is something Kolo genuinely runs on, and the heading now
 * says that rather than implying investment.
 */
const STACK = [
  { name: "MONAD", mark: "M", tone: "bg-[#836EF9] text-text" },
  { name: "PIMLICO", mark: "P", tone: "bg-[#F35532] text-text" },
  { name: "PRIVY", mark: "Pr", tone: "border border-line bg-raised text-text" },
  { name: "KERNEL v0.3", mark: "K", tone: "bg-accent text-ink" },
  { name: "AGORA AUSD", mark: "A", tone: "bg-[#0052FF] text-text" },
  {
    name: "FOUNDRY",
    mark: "F",
    tone: "border border-line bg-raised text-text",
  },
];

function Stack() {
  return (
    <section
      id="stack"
      className="scroll-mt-20 border-y border-line bg-surface/40 py-12"
    >
      <div className="mx-auto max-w-7xl px-6">
        <p className="mb-8 text-center font-mono text-[13px] uppercase tracking-widest text-muted">
          What Kolo actually runs on
        </p>
        <div className="grid grid-cols-2 items-center justify-items-center gap-8 opacity-70 md:grid-cols-3 lg:grid-cols-6">
          {STACK.map((item) => (
            <div
              key={item.name}
              className="flex items-center gap-2 text-lg font-bold tracking-tight text-text"
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

/* ---------- the principle ---------- */

const OLD_WAY = [
  "Raw 42-character addresses to copy, paste and pray over",
  "A balance of some other coin before you can move the coin you have",
  "Two dialogs — “approve”, then “confirm” — for one payment",
  "Revert strings as error messages, which stop a normal person dead",
];

const KOLO_WAY = [
  "Human names only: an @handle, resolved on chain",
  "Never any gas: every operation sponsored by a paymaster",
  "One tap, batched: the approval travels with the payment",
  "Copy that reassures about money first: “Your money hasn’t moved”",
];

function Principle() {
  return (
    <section
      id="principle"
      className="mx-auto max-w-7xl scroll-mt-20 px-6 py-24"
    >
      <Reveal>
        <div className="mb-16 max-w-3xl">
          <p className="mb-2 font-mono text-[14px] uppercase tracking-wider text-accent">
            The Kolo principle
          </p>
          <h2 className="mb-4 text-3xl font-bold leading-tight tracking-tight text-text sm:text-4xl">
            The user never learns there is an infrastructure underneath.
          </h2>
          <p className="text-[17px] leading-relaxed text-muted">
            Most crypto apps ask for gas calculations, approval pop-ups, a
            24-word backup and a standing low-level anxiety. Kolo holds itself
            to the opposite discipline: one tap, no confirmation dialogs, names
            instead of addresses, and failures phrased like a bank that means
            well.
          </p>
        </div>
      </Reveal>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <Reveal>
          <div className="about-pane relative h-full overflow-hidden rounded-2xl border border-line p-8">
            <p className="mb-4 flex items-center gap-2 font-mono text-[14px] uppercase tracking-wider text-danger">
              <span className="h-2 w-2 rounded-full bg-danger" />
              The old way
            </p>
            <ul className="space-y-4">
              {OLD_WAY.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 text-[15px] text-muted"
                >
                  <span className="font-mono font-bold text-danger">✕</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            {/* break-all, because 42 unbreakable characters otherwise set a
                ~300px minimum width on this grid column and push the whole
                page sideways on a small phone. */}
            <p className="mt-6 break-all border-t border-line/60 pt-4 font-mono text-[12px] text-muted">
              0x71C7656EC7ab88b098defB751B7401B5f6d8976F
            </p>
          </div>
        </Reveal>

        <Reveal delay={70}>
          <div className="about-pane about-lit-border relative h-full overflow-hidden rounded-2xl border border-line p-8">
            <p className="mb-4 flex items-center gap-2 font-mono text-[14px] uppercase tracking-wider text-accent">
              <span className="h-2 w-2 rounded-full bg-accent" />
              The Kolo standard
            </p>
            <ul className="space-y-4">
              {KOLO_WAY.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 text-[15px] text-text"
                >
                  <span className="font-mono font-bold text-accent">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 border-t border-line/60 pt-4 font-mono text-[12px] text-accent">
              @amara
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- circles spotlight ---------- */

function CirclesSpotlight() {
  return (
    <section
      id="circles"
      className="scroll-mt-20 border-t border-line bg-surface/20 py-20"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="about-pane relative overflow-hidden rounded-3xl border border-line p-8 md:p-12">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
            <div className="flex flex-col justify-center lg:col-span-6">
              <Reveal>
                <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-pill border border-line bg-raised px-3 py-1 font-mono text-[12px] uppercase tracking-wider text-inbound">
                  <span className="h-2 w-2 animate-pulse-gentle rounded-full bg-inbound" />
                  Circles and pots
                </span>
                <h2 className="mb-4 text-3xl font-bold leading-tight tracking-tight text-text sm:text-4xl">
                  Rotating savings, with the trust problem solved.
                </h2>
                <p className="mb-6 text-[16px] font-normal leading-relaxed text-muted">
                  Ajo, esusu, susu, chama — people have pooled money this way
                  for generations, and it has always needed somebody trustworthy
                  to hold it. Kolo takes that part out. Deposits are sized by
                  position, so the person collecting has always put in at least
                  as much as they are holding, and a round closes whether or not
                  anybody is watching.
                </p>
              </Reveal>

              <div className="grid grid-cols-2 gap-4 border-t border-line/60 pt-2">
                {[
                  {
                    value: "0",
                    label: "members ever removed for falling behind",
                  },
                  {
                    value: "0%",
                    label: "taken in fees, by us or anybody else",
                  },
                ].map((tile, index) => (
                  <Reveal key={tile.label} delay={index * 70}>
                    <div className="rounded-xl border border-line bg-ink/70 p-4">
                      <p className="tabular text-[22px] font-bold text-inbound">
                        {tile.value}
                      </p>
                      <p className="mt-1 text-[13px] text-muted">
                        {tile.label}
                      </p>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>

            <Reveal className="lg:col-span-6" delay={100}>
              <div className="group relative overflow-hidden rounded-2xl border border-line shadow-2xl">
                <Photo
                  src="/img/rotating.webp"
                  alt="A group of friends around a table, running a savings circle together"
                  className="h-[380px] w-full"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/90 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-xl border border-line bg-ink/85 p-3 text-xs backdrop-blur-md">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-inbound" />
                    <span className="font-semibold text-text">
                      Lagos circle · round 4 of 6
                    </span>
                  </span>
                  <span className="font-mono text-accent">
                    {formatMoney(3_000_000_000n, "USD")} to @amara
                  </span>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- features ---------- */

const FEATURES = [
  {
    icon: <ArrowUpRight className="h-6 w-6" />,
    tone: "text-accent",
    title: "Send by @handle",
    body: "Pay anyone instantly by name. One routed event carries both handles, the amount and your note — so your feed can tell you who paid whom, not just that something moved.",
    meta: "KoloPay",
    tag: "One-tap batch",
    tagTone: "text-accent",
  },
  {
    icon: <LinkIcon className="h-6 w-6" />,
    tone: "text-accent",
    title: "Claim links",
    body: "Park money behind a secret that never leaves your phone, and send the link anywhere. Whoever opens it sees the amount and collects it. Take it back whenever you like, and it returns on its own after seven days.",
    meta: "KoloLinks",
    tag: "Returns in 7 days",
    tagTone: "text-accent",
  },
  {
    icon: <Circle className="h-6 w-6" />,
    tone: "text-inbound",
    title: "Circles (ajo / esusu)",
    body: "Everyone contributes each round and one member takes the whole pot, turn by turn. Deposits scale with position, so nobody ever holds more than they have put in — and nobody is thrown out for a missed round.",
    meta: "KoloCircle",
    tag: "Closes unattended",
    tagTone: "text-inbound",
  },
  {
    icon: <Target className="h-6 w-6" />,
    tone: "text-accent",
    title: "Goals",
    body: "Set money aside from the balance you spend from, toward something you are saving for. Withdraw any amount at any time, before or after you reach it, with nothing deducted.",
    meta: "KoloGoals",
    tag: "No lock, no penalty",
    tagTone: "text-accent",
  },
  {
    icon: <Meter className="h-6 w-6" />,
    tone: "text-accent",
    title: "Pots",
    body: "A few people fund one thing — a subscription, a generator, a shared rental — and each pays only for what they used. Whatever you have not used stays yours to withdraw, even after the pot closes.",
    meta: "KoloPots",
    tag: "Unspent share refunds",
    tagTone: "text-accent",
  },
  {
    icon: <ArrowRight className="h-6 w-6" />,
    tone: "text-accent",
    title: "Dollars and naira",
    body: `The chain holds six-decimal Agora AUSD; you read it in dollars or naira with one tap, at a fixed rate of ₦${config.fx.ngnPerUsd.toLocaleString("en-US")} to the dollar. Naira rounds down, so the figure on screen is never more than you can actually spend.`,
    meta: "lib/money.ts",
    tag: "Rounding proven both ways",
    tagTone: "text-accent",
  },
];

function Features() {
  return (
    <section
      id="features"
      className="scroll-mt-20 border-t border-line bg-surface/20 py-20"
    >
      <div className="mx-auto max-w-7xl px-6">
        <Reveal>
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-text sm:text-4xl">
              Five things to do with it, and one way to read it
            </h2>
            <p className="text-[16px] text-muted">
              Built for paying people you know, coordinating with people you
              trust, and the way money has been saved in groups long before any
              of this.
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {FEATURES.map((feature, index) => (
            <Reveal key={feature.title} delay={(index % 3) * 70}>
              <div className="about-pane flex h-full flex-col justify-between rounded-2xl border border-line p-6 transition-all hover:border-accent/30">
                <div>
                  <span
                    className={`mb-5 flex h-12 w-12 items-center justify-center rounded-pill border border-line bg-raised ${feature.tone}`}
                  >
                    {feature.icon}
                  </span>
                  <h3 className="mb-2 text-[20px] font-bold text-text">
                    {feature.title}
                  </h3>
                  <p className="text-[15px] leading-relaxed text-muted">
                    {feature.body}
                  </p>
                </div>
                <div className="mt-6 flex items-center justify-between border-t border-line/60 pt-4 font-mono text-[13px] text-muted">
                  <span>{feature.meta}</span>
                  <span className={feature.tagTone}>{feature.tag}</span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- how it works ---------- */

/**
 * Four statements, not an explanation.
 *
 * All four are checkable in `contracts/src`: no contract that holds money has
 * an owner, an admin or a pause. The only one with an owner is `KoloFaucet`,
 * which hands out opening balances, and all its owner can do is top it up or
 * empty its own reserve.
 */
const FACTS = [
  { head: "No admin key", tail: "Nothing holding your money has an owner." },
  {
    head: "No server of ours",
    tail: "Your browser talks to the contracts directly.",
  },
  { head: "No fee, ever", tail: "Someone else pays for every operation." },
  {
    head: "No lock-in",
    tail: "It all keeps working whether we are here or not.",
  },
];

function Architecture() {
  return (
    <section
      id="architecture"
      className="mx-auto max-w-7xl scroll-mt-20 px-6 py-24"
    >
      <Reveal>
        <div className="mb-12 max-w-3xl">
          <p className="mb-3 font-mono text-[13px] uppercase tracking-widest text-accent">
            Architecture
          </p>
          <h2 className="mb-8 text-3xl font-bold leading-tight tracking-tight text-text sm:text-4xl">
            Seven contracts. 192 tests. Nothing held by us.
          </h2>

          <dl className="divide-y divide-line border-y border-line">
            {FACTS.map((fact) => (
              <div
                key={fact.head}
                className="flex flex-col gap-1 py-4 sm:flex-row sm:items-baseline sm:gap-6"
              >
                <dt className="w-44 shrink-0 text-[17px] font-semibold text-text">
                  {fact.head}
                </dt>
                <dd className="text-[15px] leading-relaxed text-muted">
                  {fact.tail}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </Reveal>

      <Reveal>
        <div className="group relative overflow-hidden rounded-2xl border border-line bg-surface/50">
          <div className="grid grid-cols-1 items-center md:grid-cols-12">
            <div className="relative h-[260px] overflow-hidden md:col-span-7 md:h-[340px]">
              <Photo
                src="/img/hardened.webp"
                alt="Kolo's architecture rendered as lit glass structure"
                className="h-full w-full"
              />
              <div className="pointer-events-none absolute inset-0 hidden bg-gradient-to-r from-transparent via-transparent to-surface md:block" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent md:hidden" />
            </div>

            <div className="flex flex-col justify-center p-8 md:col-span-5 md:p-10">
              <h3 className="mb-3 text-2xl font-bold text-text">
                All of it is public.
              </h3>
              <p className="mb-6 text-[15px] leading-relaxed text-muted">
                Every line, and every contract it runs on. Nothing about how
                your money moves is hidden from you.
              </p>
              <a
                href={REPO}
                className="inline-flex h-12 w-fit items-center gap-2 rounded-pill border border-line bg-raised px-5 text-[15px] font-semibold text-text transition-all hover:bg-surface active:scale-[0.98]"
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

/* ---------- call to action ---------- */

function CallToAction() {
  return (
    <section className="border-t border-line bg-surface/30 py-20">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <Reveal>
          <span className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-pill bg-accent shadow-xl shadow-accent/20">
            <KoloMark size={34} />
          </span>
          <h2 className="mb-4 text-4xl font-extrabold tracking-tight text-text sm:text-5xl">
            Claim your @handle before it&apos;s taken.
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-[17px] text-muted">
            Type a name and we&apos;ll check the registry right here. Add Kolo
            to your home screen and it behaves like any other app on your phone.
          </p>

          <div className="flex justify-center">
            <HandleCTA />
          </div>

          <a
            href="#how-it-works"
            className="mt-6 inline-flex h-12 items-center justify-center rounded-pill border border-line
                       bg-raised px-7 text-[15px] font-semibold text-text transition-all
                       hover:bg-surface active:scale-[0.98]"
          >
            Read how it works
          </a>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- footer ---------- */

const FOOTER_LINKS = [
  { label: "How it works", href: "#how-it-works" },
  { label: "What you can do", href: "#features" },
  { label: "Circles", href: "#circles" },
  { label: "Architecture", href: "#architecture" },
  { label: "Source", href: REPO },
];

/**
 * Stacked and centred on a phone, one row on a laptop.
 *
 * The previous one was a single flex row that wrapped its links into a ragged
 * two-line block on a narrow screen, with a mono "Status: seven contracts live"
 * hanging under it. The status line is gone -- it was telemetry, not an ending.
 */
function Footer() {
  return (
    <footer className="border-t border-line bg-ink">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-col items-center gap-8 text-center md:flex-row md:justify-between md:gap-6 md:text-left">
          <Link href="/" className="flex items-center gap-2.5">
            <KoloMark size={26} />
            <span className="text-[20px] font-bold tracking-tight text-text">
              kolo
            </span>
          </Link>

          <nav className="flex flex-wrap items-center justify-center gap-x-7 gap-y-3 text-[14px] text-muted">
            {FOOTER_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="transition-colors hover:text-text"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-pill bg-accent px-6
                       text-[15px] font-semibold text-ink transition-all hover:bg-accent-dim
                       active:scale-[0.98]"
          >
            Open Kolo
          </Link>
        </div>

        <p className="mt-10 border-t border-line pt-6 text-center text-[13px] text-muted md:text-left">
          Built in the open. Money that moves like a message.
        </p>
      </div>
    </footer>
  );
}
/* ---------- small parts ---------- */
