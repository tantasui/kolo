import { Warning } from "./ui/Icons";

/**
 * Shown instead of the app when required environment variables are absent,
 * so a fresh clone fails loudly and usefully rather than silently.
 */
export function SetupNotice({ missing }: { missing: string[] }) {
  return (
    <div className="flex min-h-[100dvh] flex-col justify-center px-6">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-danger/15">
        <Warning className="h-7 w-7 text-danger" />
      </span>
      <h1 className="mt-6 text-[26px] font-bold tracking-tight">Setup needed</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-muted">
        Add these to <code className="text-text">web/.env.local</code>, then restart the dev
        server. See the README for where each value comes from.
      </p>
      <ul className="mt-5 space-y-2">
        {missing.map((name) => (
          <li
            key={name}
            className="rounded-xl border border-line bg-surface px-4 py-3 font-mono text-[13px] text-text"
          >
            {name}
          </li>
        ))}
      </ul>
    </div>
  );
}
