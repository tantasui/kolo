"use client";

/**
 * A continuous ribbon of what is deployed.
 *
 * The list is rendered twice and the track slides exactly half its own width,
 * so the loop closes on itself with no visible seam. It pauses on hover, since
 * the whole point is that somebody can read an address, and it stops entirely
 * under `prefers-reduced-motion` -- which `globals.css` already enforces by
 * collapsing every animation duration.
 *
 * A phone has no hover, so there is no way to stop it by pointing at it. There
 * the track runs at half speed instead, slowly enough to read an address as it
 * passes, and the fades narrow: 64px of gradient either side of a 390px screen
 * would leave a third of the strip unreadable.
 */
export function Ticker({
  items,
}: {
  items: { name: string; address: string }[];
}) {
  const row = [...items, ...items];

  return (
    <div className="group relative overflow-hidden">
      {/* The edges fade rather than cut, so items enter and leave rather than
          popping at a hard boundary. */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-wash-2 to-transparent sm:w-16" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-wash-2 to-transparent sm:w-16" />

      <div className="flex w-max animate-marquee gap-2 py-2 [animation-duration:76s] group-hover:[animation-play-state:paused] sm:gap-3 sm:[animation-duration:38s]">
        {row.map((c, i) => (
          <span
            key={`${c.name}-${i}`}
            className="flex shrink-0 items-center gap-2 rounded-full bg-card px-3 py-2 shadow-sm sm:px-4"
          >
            <span className="h-2 w-2 rounded-full bg-grass" />
            <span className="text-label-lg text-deep">{c.name}</span>
            <span className="tabular text-body-sm text-body-soft">
              {c.address.slice(0, 8)}…{c.address.slice(-6)}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
