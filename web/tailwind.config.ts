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
