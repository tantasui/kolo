"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * The navigation, on a phone.
 *
 * The header's links are `hidden lg:flex`, which on a phone left four sections
 * -- Features, How it Works, Security, Developers -- reachable only by
 * scrolling the whole page and guessing. This is the same list behind a button,
 * and it is a sheet rather than a dropdown because a thumb starts at the bottom
 * of the screen: the links sit in the lower two thirds, not under the notch.
 *
 * It closes on a tap, on Escape, and whenever the viewport grows past `lg`,
 * where the real nav takes over again. Body scroll is locked while it is open,
 * since a sheet that scrolls the page behind it reads as broken.
 *
 * Everything here is positioned against the header rather than the viewport.
 * The header carries `backdrop-blur`, and a backdrop filter makes an element
 * the containing block for its `fixed` descendants -- so a `fixed` sheet
 * resolved against the header's own 72px box and painted beneath the page.
 * `absolute` says what was meant anyway: directly below the bar, moving with
 * it. The header is the nearest positioned ancestor, so this spans the full
 * width rather than the padded column.
 */
export function MobileNav({
  items,
}: {
  items: { href: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    const wide = window.matchMedia("(min-width: 1024px)");
    function onWide() {
      if (wide.matches) setOpen(false);
    }

    document.addEventListener("keydown", onKey);
    wide.addEventListener("change", onWide);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      wide.removeEventListener("change", onWide);
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((was) => !was)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full
                   text-deep transition-colors active:bg-wash-3 lg:hidden"
      >
        {/* Two bars that become a cross, rather than two icons that swap:
            the shape carries over, so the button reads as the same control. */}
        <span
          className="relative flex h-4 w-5 flex-col justify-between"
          aria-hidden
        >
          <span
            className={`h-[2px] w-full rounded-full bg-deep transition-transform duration-200 ${
              open ? "translate-y-[7px] rotate-45" : ""
            }`}
          />
          <span
            className={`h-[2px] w-full rounded-full bg-deep transition-opacity duration-200 ${
              open ? "opacity-0" : ""
            }`}
          />
          <span
            className={`h-[2px] w-full rounded-full bg-deep transition-transform duration-200 ${
              open ? "-translate-y-[7px] -rotate-45" : ""
            }`}
          />
        </span>
      </button>

      {/* Below the header rather than over it, so the wordmark and the close
          button stay put and the page never appears to jump. */}
      <div
        className={`absolute inset-x-0 top-full z-40 lg:hidden ${
          open ? "" : "pointer-events-none"
        }`}
      >
        <div
          onClick={() => setOpen(false)}
          aria-hidden
          className={`absolute inset-x-0 top-0 h-[100dvh] bg-deep/25 transition-opacity
                      duration-200 ${open ? "opacity-100" : "opacity-0"}`}
        />
        <nav
          className={`relative flex flex-col gap-1 border-b border-rule-soft bg-canvas px-4 pb-6
                      pt-2 shadow-lg transition-all duration-200 ${
                        open
                          ? "translate-y-0 opacity-100"
                          : "-translate-y-3 opacity-0"
                      }`}
        >
          {items.map((item) =>
            item.href.startsWith("#") ? (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex min-h-[52px] items-center rounded-xl px-3 font-display
                           text-headline-sm text-deep transition-colors active:bg-wash-2"
              >
                {item.label}
              </a>
            ) : (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex min-h-[52px] items-center rounded-xl px-3 font-display
                           text-headline-sm text-deep transition-colors active:bg-wash-2"
              >
                {item.label}
              </Link>
            ),
          )}

          <span className="mt-2 flex w-fit items-center gap-2 rounded-full bg-wash-2 px-3 py-1.5">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-grass" />
            <span className="text-label-caps uppercase text-body-soft">
              Monad Testnet
            </span>
          </span>
        </nav>
      </div>
    </>
  );
}
