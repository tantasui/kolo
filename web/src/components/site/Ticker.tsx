"use client";

/**
 * A continuous ribbon of what is deployed.
 *
 * The list is rendered twice and the track slides exactly half its own width,
 * so the loop closes on itself with no visible seam. It pauses on hover, since
 * the whole point is that somebody can read an address, and it stops entirely
 * under `prefers-reduced-motion` -- which `globals.css` already enforces by
 * collapsing every animation duration.
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
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-wash-2 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-wash-2 to-transparent" />

      <div className="flex w-max animate-marquee gap-3 py-2 group-hover:[animation-play-state:paused]">
        {row.map((c, i) => (
          <span
            key={`${c.name}-${i}`}
            className="flex shrink-0 items-center gap-2 rounded-full bg-card px-4 py-2 shadow-sm"
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
