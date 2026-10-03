type IconProps = { className?: string };

/**
 * Icons `/about` needs that the app does not.
 *
 * The page this was built from used the Material Symbols icon font. These are
 * hand-rolled in the same 24x24 stroke style as `ui/Icons.tsx`, because
 * DESIGN.md keeps icon fonts out: a webfont for glyphs costs a round trip, ships
 * thousands of shapes to use a dozen, and renders as tofu before it lands.
 *
 * They live here rather than in the app's set so the app's icon list stays the
 * list of icons the app actually uses.
 */

export const ArrowRight = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
    <path
      d="M4 12h15m-6-6 6 6-6 6"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const ArrowDown = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
    <path
      d="M12 4v15m-6-6 6 6 6-6"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const Bolt = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
    <path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12L13 2Z" fill="currentColor" />
  </svg>
);

export const Person = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
    <circle cx="12" cy="8" r="3.6" fill="currentColor" />
    <path d="M4.5 20a7.5 7.5 0 0 1 15 0Z" fill="currentColor" />
  </svg>
);

export const AtSign = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.9" />
    <path
      d="M16 8v5a3 3 0 0 0 3 3 3.2 3.2 0 0 0 1-2.4A9 9 0 1 0 15.5 20"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
    />
  </svg>
);

/** Two arrows passing: the dollar/naira switch. */
export const SyncAlt = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
    <path
      d="M4 9h13l-3-3M20 15H7l3 3"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const Verified = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
    <path
      d="m12 2.6 2.3 1.7 2.8-.2.9 2.7 2.3 1.7-1 2.7 1 2.7-2.3 1.7-.9 2.7-2.8-.2L12 21.4l-2.3-1.7-2.8.2-.9-2.7L3.7 15.5l1-2.7-1-2.7L6 8.4l.9-2.7 2.8.2L12 2.6Z"
      fill="currentColor"
    />
    <path
      d="m8.8 12.2 2.1 2.1 4.3-4.6"
      stroke="#0A0A0C"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const Shield = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
    <path
      d="M12 3l7 2.6v5.6c0 4.3-2.8 8-7 9.2-4.2-1.2-7-4.9-7-9.2V5.6L12 3Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
  </svg>
);

export const ShieldCheck = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
    <path
      d="M12 3l7 2.6v5.6c0 4.3-2.8 8-7 9.2-4.2-1.2-7-4.9-7-9.2V5.6L12 3Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path
      d="m9 12 2.1 2.1L15.3 9.7"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const Lock = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
    <rect
      x="5"
      y="10.5"
      width="14"
      height="9.5"
      rx="2.4"
      stroke="currentColor"
      strokeWidth="1.8"
    />
    <path
      d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

export const CheckCircle = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
    <path
      d="m8.2 12.3 2.6 2.6 5-5.4"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const Terminal = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
    <rect
      x="3"
      y="4.5"
      width="18"
      height="15"
      rx="2.6"
      stroke="currentColor"
      strokeWidth="1.8"
    />
    <path
      d="m7.5 10 2.2 2.2-2.2 2.2M12.5 14.4h4"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const Quote = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
    <path
      d="M9.4 5C6.4 6.6 4.6 9.3 4.6 12.6V19h6.2v-6.2H7.5c0-2.2.9-3.9 2.8-5.2L9.4 5Zm9.6 0c-3 1.6-4.8 4.3-4.8 7.6V19h6.2v-6.2h-3.3c0-2.2.9-3.9 2.8-5.2L19 5Z"
      fill="currentColor"
    />
  </svg>
);

/* ---------- the phone's own status bar ---------- */

export const Signal = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
    <rect x="3" y="15" width="3" height="5" rx="1" fill="currentColor" />
    <rect x="8" y="11.5" width="3" height="8.5" rx="1" fill="currentColor" />
    <rect x="13" y="8" width="3" height="12" rx="1" fill="currentColor" />
    <rect x="18" y="4.5" width="3" height="15.5" rx="1" fill="currentColor" />
  </svg>
);

export const Wifi = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
    <path
      d="M3.5 9a13 13 0 0 1 17 0"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M6.8 12.6a8.4 8.4 0 0 1 10.4 0"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M10 16.2a3.9 3.9 0 0 1 4 0"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <circle cx="12" cy="19.2" r="1.3" fill="currentColor" />
  </svg>
);

export const Battery = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
    <rect
      x="2"
      y="8"
      width="18"
      height="8"
      rx="2.4"
      stroke="currentColor"
      strokeWidth="1.6"
    />
    <rect x="4" y="10" width="14" height="4" rx="1.2" fill="currentColor" />
    <path
      d="M21.4 10.8v2.4"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

/** A clock face: used beside "explore the architecture", for a slower read. */
export const Clock = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
    <path
      d="M12 7.5V12l3 3"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
