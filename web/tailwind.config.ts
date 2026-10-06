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
         * hue 240, the blue-grey of developer tooling. On a page whose job is
         * to tell an ordinary person this is not a crypto product, that
         * temperature was doing the opposite.
         *
         * This set is light-first and sits at hue 87-120 throughout, so the
         * greys carry a green undertone rather than a blue one. Every pair
         * that carries text was checked against WCAG AA before it landed here;
         * the tightest is `grass` on `wash` at 5.8:1.
         *
         * Named for the role, not the colour, so a swap later does not leave
         * the call sites lying.
         */
        canvas: "#F4FCEF",
        card: "#FFFFFF",
        wash: "#EEF6EA",
        "wash-2": "#E8F0E4",
        "wash-3": "#E3EBDE",
        "wash-4": "#DDE5D9",

        /** Near-black with a green cast. Primary text, and the dark bands. */
        deep: "#091C00",
        "deep-2": "#163300",
        /** Muted text on `deep`. Warm, where a default slate would be cold. */
        "deep-quiet": "#B3BFAE",

        body: "#161D16",
        "body-soft": "#43483D",

        /** Mid green, for affirmative text on light. */
        grass: "#2F6C00",
        /** The CTA. Dark green text on it, never white. */
        spring: "#ACF67C",
        "spring-dim": "#91D963",
        "on-spring": "#092100",
        mint: "#67FE96",

        rule: "#74796C",
        "rule-soft": "#C3C8B9",
        alert: "#BA1A1A",
      },
      fontSize: {
        /**
         * The public pages only. The app uses arbitrary pixel sizes because it
         * is one designed surface; these pages are long enough that repeating
         * `text-[44px] leading-[48px] tracking-[-0.03em]` forty times is the
         * worse failure. Weight and tracking travel with the size, so a
         * heading cannot be half-applied.
         */
        "display-xl": [
          "56px",
          { lineHeight: "60px", letterSpacing: "-0.04em", fontWeight: "800" },
        ],
        "display-lg": [
          "44px",
          { lineHeight: "48px", letterSpacing: "-0.03em", fontWeight: "800" },
        ],
        "headline-lg": [
          "32px",
          { lineHeight: "38px", letterSpacing: "-0.02em", fontWeight: "700" },
        ],
        "headline-md": [
          "24px",
          { lineHeight: "30px", letterSpacing: "-0.015em", fontWeight: "700" },
        ],
        "headline-sm": [
          "20px",
          { lineHeight: "26px", letterSpacing: "-0.01em", fontWeight: "600" },
        ],
        "body-lg": [
          "18px",
          { lineHeight: "28px", letterSpacing: "-0.01em", fontWeight: "400" },
        ],
        "body-md": [
          "15px",
          { lineHeight: "22px", letterSpacing: "-0.005em", fontWeight: "400" },
        ],
        "body-sm": ["13px", { lineHeight: "18px", fontWeight: "400" }],
        "label-lg": [
          "14px",
          { lineHeight: "18px", letterSpacing: "0.01em", fontWeight: "600" },
        ],
        "label-md": [
          "12px",
          { lineHeight: "16px", letterSpacing: "0.02em", fontWeight: "600" },
        ],
        "label-caps": [
          "11px",
          { lineHeight: "14px", letterSpacing: "0.06em", fontWeight: "700" },
        ],
        /** Money keeps its own tier, as it does in the app. */
        "money-hero": [
          "48px",
          { lineHeight: "52px", letterSpacing: "-0.03em", fontWeight: "800" },
        ],
        "money-card": [
          "28px",
          { lineHeight: "34px", letterSpacing: "-0.02em", fontWeight: "700" },
        ],
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        /** Public pages: Epilogue for display, Inter for everything else. */
        display: [
          "var(--font-epilogue)",
          "var(--font-geist-sans)",
          "sans-serif",
        ],
        ui: ["var(--font-inter)", "var(--font-geist-sans)", "sans-serif"],
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
        /* The ticker. One copy of the list is rendered twice and the track
           slides exactly half its width, so the loop has no seam. */
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        /* The send demo's status line, and the voice payload when it swaps. */
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        /* Audio bars on the voice card. Three heights, offset by delay. */
        bar: {
          "0%, 100%": { transform: "scaleY(0.35)" },
          "50%": { transform: "scaleY(1)" },
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
        marquee: "marquee 38s linear infinite",
        "fade-up": "fade-up 320ms cubic-bezier(0.22, 1, 0.36, 1) both",
        bar: "bar 900ms ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
