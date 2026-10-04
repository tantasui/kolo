/**
 * The app itself: a phone-width column, centred on anything larger.
 *
 * This lives here rather than in the root layout because `/about` is a web
 * page and needs the full viewport. Route groups don't appear in URLs, so
 * every path below is unchanged -- `/`, `/claim`, `/circle/join`, `/pot/join`
 * and the `/~offline` fallback the service worker names in `sw.ts`.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-[100dvh] w-full max-w-md">{children}</div>
  );
}
