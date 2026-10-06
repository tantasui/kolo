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
  const done = useRef(false);

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

    const observer = new IntersectionObserver(
      (entries) => {
        if (done.current || !entries.some((e) => e.isIntersecting)) return;
        done.current = true;
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

        // The frame loop is the nice path, not the guarantee. If rAF is
        // throttled -- a background tab, a reduced-power mode, a headless
        // renderer -- the count can stall part-way, and a settlement figure
        // frozen at "0ms" claims something false. This lands the real number
        // regardless.
        settle = setTimeout(() => {
          cancelAnimationFrame(frame);
          setValue(to);
        }, DURATION + 150);
      },
      { rootMargin: "0px 0px -15% 0px" },
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      clearTimeout(settle);
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
