"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A figure that counts up the first time it comes into view.
 *
 * Only for the figures that are quantities. "$0.00" counts; "One" and "Zero"
 * are words and are passed through untouched, because animating a word is a
 * trick rather than a signal.
 *
 * Under `prefers-reduced-motion` it renders the final value immediately. The
 * CSS override in `globals.css` cannot stop a JavaScript interval, so this
 * checks the query itself -- the same reason `Confetti` does.
 */
export function CountUp({
  to,
  prefix = "",
  suffix = "",
  decimals = 0,
  className = "",
}: {
  to: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduced) {
      setValue(to);
      return;
    }

    let frame = 0;
    let settle: ReturnType<typeof setTimeout>;
    /* Scoped to this run of the effect, not to the component.

       It was a ref, which outlived the cleanup that cancels these timers: the
       effect would start the count, be torn down with the count cancelled, run
       again, and find the ref already saying "done" -- so the figure stayed at
       zero for good. That is every mount under StrictMode, and any remount
       after. A local flag dies with the timers it guards. */
    let begun = false;

    /* The animation, and the promise that the figure ends up right.

       The frame loop is the nice path, not the guarantee. If rAF is throttled
       -- a background tab, a reduced-power mode, a headless renderer -- the
       count can stall part-way, and a settlement figure frozen at "0ms" claims
       something false. The timer lands the real number regardless. */
    const start = () => {
      if (begun) return;
      begun = true;
      observer.disconnect();

      const DURATION = 900;
      const started = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - started) / DURATION);
        // The same curve the rest of the page eases on, so the count feels
        // like it belongs to the section rather than to a widget.
        setValue(to * (1 - Math.pow(1 - t, 3)));
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);

      settle = setTimeout(() => {
        cancelAnimationFrame(frame);
        setValue(to);
      }, DURATION + 150);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) start();
      },
      { rootMargin: "0px 0px -15% 0px" },
    );

    /* Whether the figure is on screen, measured rather than observed.

       `start` used to be reachable only from the observer callback, which made
       the observer a single point of failure: where it never delivers -- an
       offscreen render, a very tall viewport, a renderer that suspends the
       lifecycle -- the figure stayed at zero and read as a measurement. So the
       same question is also asked directly, once at mount for anything already
       in view, and once more shortly after as a backstop. */
    const onScreen = () => {
      const r = node.getBoundingClientRect();
      return r.top < window.innerHeight * 0.85 && r.bottom > 0;
    };

    const backstop = setTimeout(() => {
      if (onScreen()) start();
    }, 1200);

    if (onScreen()) start();
    else observer.observe(node);

    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      clearTimeout(settle);
      clearTimeout(backstop);
    };
  }, [to]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {value.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}
