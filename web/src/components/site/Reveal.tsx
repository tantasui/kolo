"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Brings a block in as it reaches the viewport, once.
 *
 * Three things it is careful about, because scroll animation is usually done
 * badly:
 *
 * - **Nothing is hidden by the markup.** The hiding class is added by an effect,
 *   so the page is fully readable with JavaScript off or before hydration --
 *   content that needs a script to become visible is not content.
 * - **It honours `prefers-reduced-motion`.** The media query in `globals.css`
 *   collapses the duration to nothing, and the opacity is dropped in the same
 *   frame it is restored, so a reduced-motion reader sees a static page.
 * - **It fires once and disconnects.** Nothing re-animates when you scroll back
 *   up, which is the behaviour people find irritating rather than lively.
 *
 * `delay` staggers siblings in a grid. Keep it small: 60-90ms steps read as one
 * movement, anything longer reads as a queue.
 */
export function Reveal({
  delay = 0,
  className = "",
  children,
}: {
  delay?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"ready" | "armed" | "shown">("ready");

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // Anything already on screen on first paint should not animate in at all.
    const onScreen =
      node.getBoundingClientRect().top < window.innerHeight * 0.9;
    if (onScreen) {
      setState("shown");
      return;
    }

    setState("armed");

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setState("shown");
        observer.disconnect();
      },
      { rootMargin: "0px 0px -12% 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`${state === "armed" ? "opacity-0" : ""} ${
        state === "shown" ? "animate-reveal-up" : ""
      } ${className}`}
      style={
        state === "shown" && delay
          ? { animationDelay: `${delay}ms` }
          : undefined
      }
    >
      {children}
    </div>
  );
}
