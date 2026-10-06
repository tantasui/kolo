import type { Metadata } from "next";
import Link from "next/link";
import { formatMoney } from "@/lib/format";
import { HandleCTA } from "@/components/site/HandleCTA";
import { Photo } from "@/components/site/Photo";
import { PhoneSimulator } from "@/components/site/PhoneSimulator";
import { Reveal } from "@/components/site/Reveal";
import { Tag } from "@/components/site/Section";
import { ArrowRight, AtSign, Bolt } from "@/components/site/Icons";
import { Check, Circle, LinkIcon, Meter, Target } from "@/components/ui/Icons";
import { KoloMark } from "@/components/ui/Wordmark";

/**
 * The page somebody lands on, which is not the same thing as a page about the
 * product.
 *
 * The version of this that lived at `/about` was written for a reader auditing
 * Kolo: it opened on `0 wei` and `192/192`, named Kernel v0.3.1 and EntryPoint
 * v0.7 in a spec grid, listed its infrastructure vendors, and built a whole
 * section around contract counts. All of that is true and none of it answers
 * the only question a visitor has, which is what this does for them. It now
 * lives at `/about`, reachable from the footer, for the people it was always
 * for.
 *
 * The look changed for the same reason. Dark-only on cool blue-grey neutrals
 * (hue 240) with an acid-lime accent is the visual language of developer tools
 * and crypto wallets, and it was saying "crypto product" before a word was
 * read -- fighting the one thing the page exists to say. The warm token set in
 * `tailwind.config.ts` is the same bones at hue ~90, light-first, with dark
 * used as *sections* so the page has a rhythm instead of one unbroken slab.
 *
 * What is left is addressed to one person: someone who needs to pay someone.
 * Every claim on it is still one the repository can back -- the rule has not
 * loosened, only the audience has changed. The two hardest questions are
 * answered rather than ducked: payments cannot be undone, and the amounts are
 * public. A money page that implies otherwise is worse than one that says
 * nothing.
 */

export const metadata: Metadata = {
  title: "Kolo — money that moves like a message",
  description:
    "Send money to anyone by their name. It lands in seconds, it costs nothing, " +
    "and there is nothing to download. Save with friends, or put money aside for yourself.",
  openGraph: {
    type: "website",
    siteName: "Kolo",
    title: "Kolo — money that moves like a message",
    description:
      "Send money to anyone by their name. Seconds to arrive, nothing to pay, nothing to install.",
  },
  twitter: {
    card: "summary",
    title: "Kolo — money that moves like a message",
    description:
      "Send money to anyone by their name. Seconds to arrive, nothing to pay, nothing to install.",
  },
};

export default function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip bg-paper">
      {/* `clip`, not `hidden`: hidden would make this a scroll container and the
          sticky header would stop sticking to the viewport. */}
      <Header />
      <main className="flex-1">
        <Hero />
        <Promises />
        <Steps />
        <Features />
        <Circles />
        <Safety />
        <Questions />
        <GetStarted />
      </main>
      <Footer />
    </div>
  );
}

/* ---------- header ---------- */

const NAV = [
  { href: "#what", label: "What you can do" },
  { href: "#circles", label: "Circles" },
  { href: "#questions", label: "Questions" },
];

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-paper-rule bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-5 sm:px-6 md:h-[72px]">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <KoloMark size={30} />
          <span className="text-[22px] font-bold tracking-tight text-paper-ink">
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
              className="whitespace-nowrap text-[15px] text-paper-quiet transition-colors hover:text-paper-ink"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <Link
          href="/app"
          className="ml-auto inline-flex h-10 shrink-0 items-center whitespace-nowrap rounded-pill
                     bg-lime px-5 text-[15px] font-semibold text-lime-on transition-all
                     hover:bg-lime-hi active:scale-[0.98] lg:ml-0"
        >
          Get started
        </Link>
      </div>
    </header>
  );
}

/* ---------- hero ---------- */

function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-16 pt-14 sm:px-6 lg:pb-24 lg:pt-20">
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-8">
        <div className="flex flex-col justify-center lg:col-span-7">
          <h1 className="max-w-2xl text-[42px] font-extrabold leading-[0.95] tracking-[-0.03em] text-paper-ink sm:text-[56px] lg:text-[66px]">
            Money that moves like a message.
          </h1>

          <p className="mt-6 max-w-xl text-[18px] leading-relaxed text-paper-quiet sm:text-[19px]">
            Send money to anyone by their name — not an account number, not a
            long string of letters. It reaches them in seconds, it costs neither
            of you anything, and there is nothing to download.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/app"
              className="inline-flex h-14 items-center gap-2.5 rounded-pill bg-lime px-8
                         text-[17px] font-semibold text-lime-on transition-all
                         hover:bg-lime-hi active:scale-[0.98]"
            >
              Get started — it&apos;s free
              <Bolt className="h-4 w-4" />
            </Link>
            <a
              href="#how"
              className="site-ring inline-flex h-14 items-center gap-2 rounded-pill bg-paper px-6
                         text-[16px] font-medium text-paper-ink transition-all
                         hover:bg-paper-2 active:scale-[0.98]"
            >
              See how it works
            </a>
          </div>

          <p className="mt-5 text-[14px] text-paper-quiet">
            Your email is all it takes. No card, no paperwork.
          </p>
        </div>

        {/* A 390px picture of the app, shown to somebody already holding a
            390px screen, is a picture of nothing. Large screens only. */}
        <div className="hidden lg:col-span-5 lg:block">
          <PhoneSimulator />
        </div>
      </div>
    </section>
  );
}

/* ---------- the four promises ---------- */

/**
 * Where the old page put `0 wei`, `192/192` and "One tap". Those are true and
 * they are proof for a different reader; these are the same page's promises
 * said in words somebody can act on.
 */
const PROMISES = [
  { head: "Free", tail: "To send and to receive. Not an introductory offer." },
  { head: "Seconds", tail: "Not working days, and not only on weekdays." },
  {
    head: "No app",
    tail: "It runs in your browser. Add it to your home screen if you like.",
  },
  { head: "Yours", tail: "Take your money out whenever you want, all of it." },
];

function Promises() {
  return (
    <section className="site-grid border-y border-night bg-night">
      <dl className="mx-auto grid max-w-6xl grid-cols-1 gap-x-8 gap-y-6 px-5 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        {PROMISES.map((promise, index) => (
          <Reveal key={promise.head} delay={index * 70}>
            <dt className="text-[24px] font-extrabold tracking-[-0.02em] text-night-ink">
              {promise.head}
            </dt>
            <dd className="mt-1.5 text-[15px] leading-relaxed text-night-quiet">
              {promise.tail}
            </dd>
          </Reveal>
        ))}
      </dl>
    </section>
  );
}

/* ---------- how it works ---------- */

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
    body: "Type their name, type an amount, add a note if you want them to remember what it was for. One tap, no confirmation screen, no fee.",
    note: "And that is the whole thing",
  },
];

function Steps() {
  return (
    <section
      id="how"
      className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20 sm:px-6"
    >
      <Reveal>
        <div className="mb-12 max-w-2xl">
          <Tag className="text-lime-on">Getting started</Tag>
          <h2 className="mt-2 text-[32px] font-extrabold leading-[1.0] tracking-[-0.025em] text-paper-ink sm:text-[42px]">
            Three steps, and you have sent someone money.
          </h2>
          <p className="mt-3 text-[17px] leading-relaxed text-paper-quiet">
            From opening this page to paying somebody is about a minute, and
            most of that is picking a name you like.
          </p>
        </div>
      </Reveal>

      <ol className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {STEPS.map((step, index) => (
          <Reveal key={step.n} delay={index * 80}>
            <li className="site-ring flex h-full flex-col justify-between rounded-2xl bg-paper p-7 transition-all hover:-translate-y-0.5">
              <div>
                <div className="mb-6 flex items-center justify-between">
                  <span className="font-mono text-[30px] font-bold leading-none text-lime-on">
                    {step.n}
                  </span>
                  {index < STEPS.length - 1 && (
                    <ArrowRight className="hidden h-5 w-5 text-paper-rule md:block" />
                  )}
                </div>
                <h3 className="mb-2 text-[20px] font-bold text-paper-ink">
                  {step.title}
                </h3>
                <p className="text-[15px] leading-relaxed text-paper-quiet">
                  {step.body}
                </p>
              </div>
              <p className="mt-6 border-t border-paper-rule pt-4 font-mono text-[12px] text-paper-quiet">
                {step.note}
              </p>
            </li>
          </Reveal>
        ))}
      </ol>
    </section>
  );
}

/* ---------- what you can do ---------- */

/**
 * Each one opens on a situation rather than a feature, because nobody wakes up
 * wanting a "rotating savings contract" -- they want the rent money to go round.
 */
const FEATURES = [
  {
    icon: <AtSign className="h-6 w-6" />,
    tone: "accent" as const,
    title: "Pay someone back",
    body: "You owe your sister for the generator. Type her name, type the amount, add “generator” so you both remember later. She has it before you have put your phone down — and the amount that leaves you is the amount that reaches her.",
    span: "md:col-span-7",
  },
  {
    icon: <LinkIcon className="h-6 w-6" />,
    tone: "inbound" as const,
    title: "Send to someone who isn't here yet",
    body: "Your cousin has never heard of Kolo. Send a link instead: she opens it, sees the money waiting, and takes it. If she never gets round to it, it comes back to you.",
    span: "md:col-span-5",
  },
  {
    icon: <Target className="h-6 w-6" />,
    tone: "accent" as const,
    title: "Put money aside",
    body: "Rent is due in December. Move a little across each week, out of the money you spend from, and watch it fill up. Take any of it back whenever you want, with nothing deducted for changing your mind.",
    span: "md:col-span-4",
  },
  {
    icon: <Meter className="h-6 w-6" />,
    tone: "inbound" as const,
    title: "Split one bill fairly",
    body: "Four of you share one subscription. Everyone puts money in, but each of you only pays for the months you actually used — and whatever you have not used is still yours.",
    span: "md:col-span-4",
  },
  {
    icon: <Circle className="h-6 w-6" />,
    tone: "accent" as const,
    title: "Save with your people",
    body: "Everyone puts in the same each month and one person collects, turn by turn, until everybody has had theirs. Ajo, as you already run it — only nobody has to hold the money.",
    span: "md:col-span-4",
  },
];

function Features() {
  return (
    <section
      id="what"
      className="scroll-mt-20 border-t border-paper-rule bg-paper-2 py-20"
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <Reveal>
          <div className="mb-12 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <Tag className="text-lime-on">What you can do</Tag>
              <h2 className="mt-2 text-[32px] font-extrabold leading-[1.0] tracking-[-0.025em] text-paper-ink sm:text-[42px]">
                Five ways to move money. None of them cost you.
              </h2>
            </div>
            <p className="max-w-md text-[16px] leading-relaxed text-paper-quiet">
              Paying a person, paying someone who is not here yet, saving on
              your own, splitting a bill, and saving with the people you already
              save with.
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
          {FEATURES.map((feature, index) => (
            <Reveal
              key={feature.title}
              className={feature.span}
              delay={(index % 3) * 70}
            >
              <div className="site-ring flex h-full flex-col rounded-[1.25rem] bg-paper p-7 transition-all hover:-translate-y-0.5">
                <span
                  className={`mb-6 flex h-11 w-11 items-center justify-center rounded-xl border
                              ${feature.tone === "accent" ? "border-lime-on/15 bg-lime/35 text-lime-on" : "border-inbound-warm/25 bg-inbound-warm/15 text-inbound-warm"}`}
                >
                  {feature.icon}
                </span>
                <h3 className="text-[21px] font-bold tracking-tight text-paper-ink">
                  {feature.title}
                </h3>
                <p className="mt-2 text-[15px] leading-relaxed text-paper-quiet">
                  {feature.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- circles ---------- */

const CIRCLE_POINTS = [
  {
    title: "Nobody can take the money and go",
    body: "Whoever collects first puts down the most at the start, because they owe the most afterwards. At the moment you are holding everyone's money, you have already put in at least that much yourself.",
  },
  {
    title: "A missed month doesn't hurt whoever's turn it is",
    body: "If somebody is short, it comes out of what they put down at the beginning — so the person collecting is still paid in full, on the day.",
  },
  {
    title: "Nobody gets thrown out",
    body: "Fall behind and you are passed over until you are square, not removed and not fined. You still get your turn, and you get back everything you put down.",
  },
];

function Circles() {
  return (
    <section
      id="circles"
      className="site-grid scroll-mt-20 border-y border-night bg-night py-20"
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-14">
          <Reveal className="lg:col-span-5">
            <div className="group overflow-hidden rounded-[1.25rem] border border-night-rule">
              <Photo
                src="/img/rotating.webp"
                alt="Friends around a table running a savings circle together"
                className="h-[320px] w-full sm:h-[380px]"
              />
            </div>
          </Reveal>

          <div className="lg:col-span-7">
            <Reveal>
              <Tag className="text-lime">Ajo · esusu · susu</Tag>
              <h2 className="mt-2 max-w-xl text-[32px] font-extrabold leading-[1.0] tracking-[-0.025em] text-night-ink sm:text-[42px]">
                Save with your people, the way you already do.
              </h2>
              <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-night-quiet">
                Everybody puts in the same amount each month, and one person
                takes the whole lot. Next month it is somebody else, until
                everyone has had their turn. You know how it works — the only
                new part is that nobody has to be trusted to hold the money or
                keep the book.
              </p>
            </Reveal>

            <div className="mt-8 space-y-4">
              {CIRCLE_POINTS.map((point, index) => (
                <Reveal key={point.title} delay={index * 70}>
                  <div className="flex gap-4 rounded-xl2 border border-night-rule bg-night-2 p-6">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-lime">
                      <Check className="h-4 w-4 text-lime-on" />
                    </span>
                    <div>
                      <h3 className="text-[17px] font-semibold text-night-ink">
                        {point.title}
                      </h3>
                      <p className="mt-1.5 text-[15px] leading-relaxed text-night-quiet">
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

/* ---------- your money is yours ---------- */

const SAFETY = [
  {
    head: "Nothing to pay",
    body: "Not to send, not to receive, not to keep money here. There is no monthly charge and no cut taken off a transfer.",
  },
  {
    head: "Take it out whenever",
    body: "No lock-up, no notice period and no penalty — including money you have set aside toward a goal, before or after you reach it.",
  },
  {
    head: "Nobody can freeze it",
    body: "There is no button on our side that moves your money or holds it. Not for us, and not for anybody who asks us to.",
  },
  {
    head: "You don't have to trust us",
    body: "Which is the point: it is built so that you do not have to, and anyone who wants to check can.",
  },
];

function Safety() {
  return (
    <section className="border-t border-paper-rule bg-paper py-20">
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <Reveal>
          <div className="mb-10 max-w-2xl">
            <Tag className="text-lime-on">Your money is yours</Tag>
            <h2 className="mt-2 text-[32px] font-extrabold leading-[1.0] tracking-[-0.025em] text-paper-ink sm:text-[42px]">
              Four things that are true of it, always.
            </h2>
          </div>
        </Reveal>

        <dl className="grid grid-cols-1 gap-x-10 gap-y-8 md:grid-cols-2">
          {SAFETY.map((item, index) => (
            <Reveal key={item.head} delay={(index % 2) * 70}>
              <div className="flex gap-4">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lime">
                  <Check className="h-3.5 w-3.5 text-lime-on" />
                </span>
                <div>
                  <dt className="text-[18px] font-semibold text-paper-ink">
                    {item.head}
                  </dt>
                  <dd className="mt-1.5 text-[15px] leading-relaxed text-paper-quiet">
                    {item.body}
                  </dd>
                </div>
              </div>
            </Reveal>
          ))}
        </dl>

        <Reveal delay={120}>
          <p className="mt-10 text-[15px] text-paper-quiet">
            If you want to see exactly how that works —{" "}
            <Link
              href="/about"
              className="text-paper-ink underline decoration-paper-rule underline-offset-4 transition hover:decoration-lime-on"
            >
              here is the long answer
            </Link>
            .
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- questions ---------- */

/**
 * The two uncomfortable ones are the reason this section exists. A money page
 * that lets somebody discover on their own that a payment cannot be undone, or
 * that the amounts are public, has not been honest with them -- and those are
 * exactly the two facts that decide whether the rest of the page is believable.
 */
const QUESTIONS = [
  {
    q: "Is it really free?",
    a: "Yes. Sending costs you nothing and receiving costs you nothing, and that is not an introductory rate. The fees that normally come out of a transfer are covered for you.",
  },
  {
    q: "Do I need to download anything?",
    a: "No. Kolo runs in your browser. If you want it to behave like any other app on your phone, add it to your home screen — it opens full-screen and works the same.",
  },
  {
    q: "What if I send it to the wrong person?",
    a: "A payment cannot be undone once it has gone, the same as handing over cash. Check the name on the screen before you tap. If they are not on Kolo yet, send a link instead — you can take that back.",
  },
  {
    q: "Who can see what I send?",
    a: "The amounts and the @handles are recorded publicly and anyone can read them. Your name, your email and your phone number are not, and we do not publish them. If you would not want an amount to be visible, do not send it here.",
  },
  {
    q: "What happens if I lose my phone?",
    a: "Nothing is kept on the phone. Sign in with your email on any other device and your money is where you left it.",
  },
  {
    q: "What is a circle, exactly?",
    a: "A group of people who each put in the same amount every month, with one person collecting the whole lot each time, turn by turn. Ajo, esusu, susu — depending on where you are from. Kolo runs the turns so nobody has to hold the money.",
  },
];

function Questions() {
  return (
    <section
      id="questions"
      className="scroll-mt-20 border-t border-paper-rule bg-paper-2 py-20"
    >
      <div className="mx-auto max-w-4xl px-5 sm:px-6">
        <Reveal>
          <div className="mb-10">
            <Tag className="text-lime-on">Questions</Tag>
            <h2 className="mt-2 text-[32px] font-extrabold leading-[1.0] tracking-[-0.025em] text-paper-ink sm:text-[42px]">
              The things people ask first.
            </h2>
          </div>
        </Reveal>

        <dl className="divide-y divide-paper-rule border-y border-paper-rule">
          {QUESTIONS.map((item, index) => (
            <Reveal key={item.q} delay={Math.min(index, 3) * 60}>
              <div className="py-6">
                <dt className="text-[18px] font-semibold text-paper-ink">
                  {item.q}
                </dt>
                <dd className="mt-2 max-w-3xl text-[15px] leading-relaxed text-paper-quiet">
                  {item.a}
                </dd>
              </div>
            </Reveal>
          ))}
        </dl>
      </div>
    </section>
  );
}

/* ---------- get started ---------- */

function GetStarted() {
  return (
    <section className="site-grid border-t border-night bg-night py-20">
      <div className="mx-auto max-w-4xl px-5 sm:px-6">
        <Reveal>
          <div className="relative flex flex-col items-center overflow-hidden rounded-[1.5rem] border border-night-rule bg-night-2 p-8 text-center md:p-14">
            <span className="pointer-events-none absolute -top-24 h-80 w-80 rounded-full bg-lime/20 blur-[100px]" />

            <h2 className="max-w-2xl text-[32px] font-extrabold leading-[1.0] tracking-[-0.025em] text-night-ink sm:text-[46px]">
              Pick the name people will pay you by.
            </h2>
            <p className="mb-8 mt-4 max-w-md text-[17px] leading-relaxed text-night-quiet">
              Type one and we will tell you right here whether it is still free.
            </p>

            <HandleCTA />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- footer ---------- */

const FOOTER_LINKS = [
  { label: "What you can do", href: "#what" },
  { label: "Circles", href: "#circles" },
  { label: "Questions", href: "#questions" },
  { label: "How it works", href: "/about" },
];

function Footer() {
  return (
    <footer className="border-t border-night-rule bg-night">
      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-6">
        <div className="flex flex-col items-center gap-8 text-center md:flex-row md:justify-between md:text-left">
          <Link href="/" className="flex items-center gap-2.5">
            <KoloMark size={26} />
            <span className="text-[20px] font-bold tracking-tight text-night-ink">
              kolo
            </span>
          </Link>

          <nav className="flex flex-wrap items-center justify-center gap-x-7 gap-y-3 text-[14px] text-night-quiet">
            {FOOTER_LINKS.map((link) =>
              link.href.startsWith("#") ? (
                <a
                  key={link.label}
                  href={link.href}
                  className="transition-colors hover:text-night-ink"
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.label}
                  href={link.href}
                  className="transition-colors hover:text-night-ink"
                >
                  {link.label}
                </Link>
              ),
            )}
          </nav>

          <Link
            href="/app"
            className="inline-flex h-11 items-center justify-center rounded-pill bg-lime px-6
                       text-[15px] font-semibold text-lime-on transition-all hover:bg-lime-hi
                       active:scale-[0.98]"
          >
            Get started
          </Link>
        </div>

        <p className="mt-10 border-t border-night-rule pt-6 text-center text-[13px] text-night-quiet md:text-left">
          Money that moves like a message.{" "}
          <span className="tabular">{formatMoney(0n, "USD")}</span> to send,
          every time.
        </p>
      </div>
    </footer>
  );
}
