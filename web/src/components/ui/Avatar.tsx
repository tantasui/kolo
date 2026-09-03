import { initials } from "@/lib/format";

const TONES = [
  "bg-[#D2FF3A] text-ink",
  "bg-[#5CE39B] text-ink",
  "bg-[#7CC7FF] text-ink",
  "bg-[#FFB86B] text-ink",
  "bg-[#E5A8FF] text-ink",
  "bg-[#FF9BA8] text-ink",
];

/** Deterministic colour per handle, so people stay recognisable in the feed. */
function toneFor(handle: string): string {
  let hash = 0;
  for (let i = 0; i < handle.length; i += 1) hash = (hash * 31 + handle.charCodeAt(i)) >>> 0;
  return TONES[hash % TONES.length];
}

export function Avatar({ handle, size = 44 }: { handle: string; size?: number }) {
  const label = handle || "?";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold ${toneFor(label)}`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden
    >
      {initials(label)}
    </span>
  );
}
