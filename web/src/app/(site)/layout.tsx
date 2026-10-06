import { Epilogue, Inter } from "next/font/google";

/**
 * The two public pages are the only surfaces outside the app, and the only
 * ones that load a second and third family. Scoped to this route group rather
 * than the root layout, because the app has one typeface and should not pay
 * for two more.
 *
 * Epilogue carries the display sizes and Inter everything else, which is the
 * pairing the design is built on: Epilogue's tighter counters hold up at 56px
 * where Inter goes slack, and Inter reads better than Epilogue below 18px.
 */
const epilogue = Epilogue({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-epilogue",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${epilogue.variable} ${inter.variable} font-ui`}>
      {children}
    </div>
  );
}
