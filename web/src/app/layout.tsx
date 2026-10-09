import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const APP_NAME = "Kolo";
const APP_TITLE = "Kolo — send money by @handle";
const APP_DESCRIPTION =
  "Send money to anyone by their @handle. Instantly, with no fee.";

export const metadata: Metadata = {
  /* Every other URL in here is resolved against this one. Without it Next
     falls back to localhost, and the card Twitter fetches is a 404. */
  metadataBase: new URL("https://usekolo.finance"),
  applicationName: APP_NAME,
  title: { default: APP_TITLE, template: "%s — Kolo" },
  description: APP_DESCRIPTION,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: APP_NAME,
  },
  other: { "mobile-web-app-capable": "yes" },
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: APP_TITLE,
    description: APP_DESCRIPTION,
  },
  /* The image itself is `opengraph-image.png` / `twitter-image.png` next to
     this file; Next picks those up by name and fills in the url, dimensions
     and alt text. This is the part it cannot infer: without the card type,
     Twitter renders a thumbnail the size of a stamp. */
  twitter: {
    card: "summary_large_image",
    title: APP_TITLE,
    description: APP_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0C",
  width: "device-width",
  initialScale: 1,
  // Let the app paint under the notch and home indicator.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      {/* The phone-width column lives in `(app)/layout.tsx`, not here, so
          the public page at `/` can use the full viewport. */}
      <body className={`${geistSans.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
