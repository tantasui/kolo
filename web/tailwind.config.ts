import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0A0A0C",
        surface: "#141419",
        raised: "#1C1C23",
        line: "#26262F",
        text: "#F7F7F8",
        muted: "#84848F",
        accent: "#D2FF3A",
        "accent-dim": "#A8CC2E",
        inbound: "#5CE39B",
        danger: "#FF6B6B",

        /**
         * The public pages (`/` and `/about`) only.
         *
         * The app's palette above is dark-only and cool: its neutrals sit at
         * hue 240, which is the blue-grey of developer tooling. On a page whose
         * whole job is to tell an ordinary person this is not a crypto product,
         * that temperature was doing the opposite.
         *
         * So these are the same bones, turned warm. The neutrals move to hue
         * ~90 (a green undertone rather than a blue one), the ground becomes
         * light with dark used as *sections*, and the accent comes off acid
         * without losing Kolo's lime. Every pair that carries text was checked
         * against WCAG AA before it landed here; the tightest is muted-on-paper
         * at 5.4:1 and the red was darkened from #D2453E to clear 4.5:1.
         *
         * Named for the surface they belong to, so `paper-quiet` on a dark
         * section is obviously wrong at the call site.
         */
        paper: "#FAFBF6",
        "paper-2": "#EDF0E6",
        "paper-ink": "#0E1210",
        "paper-quiet": "#5A6356",
        "paper-rule": "#DBE0D1",

        night: "#0D1109",
        "night-2": "#151A12",
        "night-ink": "#F4F7F0",
        "night-quiet": "#96A18F",
        "night-rule": "#232A1F",

        /** Green-on-green: the text on the button is dark green, not black. */
        lime: "#CBF24E",
        "lime-on": "#1B3307",
        /** Hover goes *lighter*, not darker -- contrast up, never down. */
        "lime-hi": "#DCFA7A",

        "inbound-warm": "#2FB673",
        "danger-warm": "#C0392F",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        /**
         * Only `/about` loads this, and only for tags and figures. The app has
         * one family; a public page gets a second so a number reads as a
         * measurement rather than as prose. See DESIGN.md, "Outside the app".
         */
        mono: [
          "var(--font-mono)",
          "ui-monospace",
          "SFMono-Regular",
          "monospace",
        ],
      },
      borderRadius: {
        xl2: "1.25rem",
        pill: "999px",
      },
      keyframes: {
        "rise-in": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "sheet-up": {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        "pop-in": {
          "0%": { transform: "scale(0.6)", opacity: "0" },
          "60%": { transform: "scale(1.08)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "draw-check": {
          "0%": { strokeDashoffset: "48" },
          "100%": { strokeDashoffset: "0" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        /* A dot that breathes rather than blinks, for ambient status on
           /about. Opacity only -- nothing moves. */
        "pulse-gentle": {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.9" },
        },
        /* Scroll reveal on /about. Same shape as rise-in, further to travel,
           because it fires against a full-page scroll rather than a sheet. */
        "reveal-up": {
          "0%": { opacity: "0", transform: "translateY(22px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "rise-in": "rise-in 320ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "sheet-up": "sheet-up 280ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "pop-in": "pop-in 420ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "draw-check": "draw-check 320ms 220ms ease-out both",
        shimmer: "shimmer 1.4s linear infinite",
        "reveal-up": "reveal-up 620ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "pulse-gentle": "pulse-gentle 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
