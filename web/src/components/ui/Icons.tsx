type IconProps = { className?: string };

export const ArrowUpRight = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
    <path d="M7 17 17 7M9 7h8v8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ArrowDownLeft = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
    <path d="M17 7 7 17M15 17H7V9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Plus = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

export const Copy = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
    <rect x="9" y="9" width="11" height="11" rx="3" stroke="currentColor" strokeWidth="1.8" />
    <path d="M5 15V7a2 2 0 0 1 2-2h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export const Check = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
    <path d="m5 13 4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Close = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
    <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

export const ChevronLeft = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
    <path d="M15 5 8 12l7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Backspace = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
    <path
      d="M9 5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6-7 6-7Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path d="m12 10 4 4m0-4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export const Warning = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
    <path
      d="M12 4.5 21 19H3l9-14.5Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path d="M12 10v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <circle cx="12" cy="16.6" r="1" fill="currentColor" />
  </svg>
);

export const Gear = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
    <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.8" />
    <path
      d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.9 19.3a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.7 8.9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9.1a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.01a1.7 1.7 0 0 0 1.56 1.03H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.56 1.03Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const SignOut = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
    <path
      d="M15 17v1.5A2.5 2.5 0 0 1 12.5 21H6a2.5 2.5 0 0 1-2.5-2.5v-13A2.5 2.5 0 0 1 6 3h6.5A2.5 2.5 0 0 1 15 5.5V7"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <path d="M10 12h11m0 0-3-3m3 3-3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
