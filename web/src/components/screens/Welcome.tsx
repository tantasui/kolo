"use client";

import { useState } from "react";
import Image from "next/image";
import { markWelcomeSeen } from "@/lib/welcome";
import { Button } from "../ui/Button";
import { ArrowUpRight, Circle, Target } from "../ui/Icons";
import { KoloMark } from "../ui/Wordmark";

/**
 * The three things worth knowing before you sign in.
 *
 * Shown once per browser, ahead of the landing screen, and skippable from the
 * first frame -- somebody who already knows what Kolo is should never have to
 * tap through an explanation to reach the button.
 *
 * Each slide makes one promise and shows the thing it is promising about.
 * There is no "Next" on the last slide: the last slide's action is the action.
 */
type Slide = {
  icon: React.ReactNode;
  title: string;
  body: string;
  /** Drawn art, laid out in the flow above the words. */
  art?: React.ReactNode;
  /**
   * A photograph that is the page rather than a picture on it: full-bleed,
   * unframed, blended into the background. See `Bleed`.
   */
  bleed?: string;
};

const SLIDES: Slide[] = [
  {
    icon: <ArrowUpRight className="h-5 w-5" />,
    title: "Pay anyone by their name",
    body: "No account numbers, no long strings to copy. Type a name, type an amount, and it is with them in seconds.",
    art: <SendArt />,
  },
  {
    icon: <Circle className="h-5 w-5" />,
    title: "Save with your people",
    body: "Everybody puts in the same each month and one person collects, turn by turn — and nobody has to be trusted to hold the money.",
    bleed: "/img/rings.webp",
  },
  {
    icon: <Target className="h-5 w-5" />,
    title: "Nothing to pay, ever",
    body: "Sending costs you nothing, there is nothing to download, and nothing to write down and keep safe. Your email is the whole setup.",
    art: <FreeArt />,
  },
];

export function Welcome({ onDone }: { onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];
  const last = index === SLIDES.length - 1;

  function finish() {
    markWelcomeSeen();
    onDone();
  }

  return (
    <div className="bloom relative flex min-h-[100dvh] flex-col px-6 pb-10 pt-14">
      <div className="flex items-center justify-between">
        <KoloMark size={36} />
        {/* Available from the first frame, not just at the end. */}
        <button
          type="button"
          onClick={finish}
          className="text-[15px] text-muted transition active:scale-95"
        >
          Skip
        </button>
      </div>

      {slide.bleed && <Bleed key={`bleed-${index}`} src={slide.bleed} />}

      <div
        key={index}
        className="relative flex flex-1 animate-rise-in flex-col justify-center"
      >
        {slide.art && (
          <div className="flex justify-center py-8">{slide.art}</div>
        )}

        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-raised text-accent">
          {slide.icon}
        </span>
        <h1 className="mt-5 text-[32px] font-bold leading-tight tracking-tight">
          {slide.title}
        </h1>
        <p className="mt-3 max-w-[20rem] text-[17px] leading-relaxed text-muted">
          {slide.body}
        </p>
      </div>

      <div className="space-y-5">
        <div className="flex justify-center gap-2" role="presentation">
          {SLIDES.map((_, dot) => (
            <span
              key={dot}
              className={`h-1.5 rounded-pill transition-all ${
                dot === index ? "w-6 bg-accent" : "w-1.5 bg-line"
              }`}
            />
          ))}
        </div>

        <Button full onClick={last ? finish : () => setIndex(index + 1)}>
          {last ? "Get started" : "Next"}
        </Button>
      </div>
    </div>
  );
}

/* ---------- the pictures ---------- */

/** A name, an arrow, a name. The whole of sending. */
function SendArt() {
  return (
    <svg
      viewBox="0 0 280 120"
      className="h-auto w-full max-w-[17rem]"
      aria-hidden
    >
      <rect
        x="8"
        y="42"
        width="96"
        height="36"
        rx="18"
        fill="#1C1C23"
        stroke="#26262F"
        strokeWidth="1.5"
      />
      <text
        x="56"
        y="65"
        textAnchor="middle"
        fill="#F7F7F8"
        fontSize="14"
        fontWeight="600"
      >
        @you
      </text>
      <path
        d="M116 60h40"
        stroke="#D2FF3A"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="6 6"
      />
      <path
        d="M150 54l6 6-6 6"
        stroke="#D2FF3A"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <rect
        x="176"
        y="42"
        width="96"
        height="36"
        rx="18"
        fill="#1C1C23"
        stroke="#26262F"
        strokeWidth="1.5"
      />
      <text
        x="224"
        y="65"
        textAnchor="middle"
        fill="#5CE39B"
        fontSize="14"
        fontWeight="600"
      >
        @amara
      </text>
    </svg>
  );
}

/**
 * A photograph that behaves like part of the page.
 *
 * No frame, no corner radius, no container: it is positioned off the top of the
 * screen and allowed to run past both edges. Two things do the real work:
 *
 * - **`mix-blend-screen`.** The art sits on near-black, and screen blending
 *   makes black contribute nothing -- so there is no rectangle, no seam, and no
 *   edge where the image stops and the page begins. It also means the page can
 *   change colour underneath without the image needing a matching backdrop.
 * - **A radial mask.** Screen alone still ends abruptly where the lit parts
 *   reach the frame, so the whole thing is faded out towards its edges.
 *
 * `aria-hidden`: it carries nothing the words do not already say.
 */
function Bleed({ src }: { src: string }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[46%] overflow-hidden"
    >
      <div
        /* Centred with a margin, not -translate-x-1/2: `animate-rise-in`
           animates `transform`, which would overwrite the translate and shove
           the whole thing half its own width to the right. */
        className="absolute left-1/2 top-[-22%] -ml-[60%] aspect-square w-[120%] max-w-none
                   animate-rise-in
                   [mask-image:radial-gradient(closest-side,#000_38%,transparent_82%)]
                   [-webkit-mask-image:radial-gradient(closest-side,#000_38%,transparent_82%)]"
      >
        <Image
          src={src}
          alt=""
          fill
          priority
          sizes="150vw"
          className="object-contain opacity-90 mix-blend-screen"
        />
      </div>
    </div>
  );
}

/** The fee, which is the point. */
function FreeArt() {
  return (
    <svg
      viewBox="0 0 240 120"
      className="h-auto w-full max-w-[15rem]"
      aria-hidden
    >
      <rect
        x="20"
        y="24"
        width="200"
        height="72"
        rx="20"
        fill="#1C1C23"
        stroke="#26262F"
        strokeWidth="1.5"
      />
      <text x="120" y="58" textAnchor="middle" fill="#84848F" fontSize="12">
        Fee
      </text>
      <text
        x="120"
        y="84"
        textAnchor="middle"
        fill="#D2FF3A"
        fontSize="26"
        fontWeight="700"
      >
        Nothing
      </text>
    </svg>
  );
}
