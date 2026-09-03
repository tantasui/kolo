/** The Kolo mark: a coin dropping into a savings box. */
export function KoloMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden>
      <rect width="40" height="40" rx="12" fill="#D2FF3A" />
      <rect x="11" y="17.5" width="18" height="3.2" rx="1.6" fill="#0A0A0C" />
      <circle cx="20" cy="9.5" r="3.6" fill="#0A0A0C" />
      <path
        d="M12 25.5c1.9 2.6 4.7 4 8 4s6.1-1.4 8-4"
        stroke="#0A0A0C"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Wordmark({ size = 40 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <KoloMark size={size} />
      <span className="text-[26px] font-bold tracking-tight text-text">Kolo</span>
    </span>
  );
}
