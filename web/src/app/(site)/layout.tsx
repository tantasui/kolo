import { JetBrains_Mono } from "next/font/google";

/**
 * The two public pages -- the landing page and the long answer behind it --
 * are the only surfaces outside the app, and the only ones that load a second
 * family. Scoped to this route group rather than put in the root layout,
 * because the app itself has one typeface and should not pay for another.
 */
const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className={mono.variable}>{children}</div>;
}
