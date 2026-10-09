import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  // A service worker in dev makes iterating on the app confusing.
  disable: process.env.NODE_ENV === "development",
});

export default withSerwist({
  reactStrictMode: true,
  // The public page used to live at /about and the app at /. Links to the
  // old address should still land on the page they were sent for.
  async redirects() {
    return [{ source: "/about", destination: "/", permanent: true }];
  },
});
