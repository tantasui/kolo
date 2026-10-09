import { JetBrains_Mono } from "next/font/google";

/**
 * `/about` is the one surface outside the app, so it is the one surface that
 * loads a second family. Scoped here rather than in the root layout: the app
 * itself has one typeface and should not pay for another.
 */
const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className={mono.variable}>{children}</div>;
}
