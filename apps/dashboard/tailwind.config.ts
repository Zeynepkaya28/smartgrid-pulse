import type { Config } from "tailwindcss";

/** Colors resolve to CSS variables (app/globals.css), so light/dark follow the OS. */
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  darkMode: "media",
  theme: {
    extend: {
      colors: {
        canvas: v("canvas"),
        "canvas-alt": v("canvas-alt"),
        surface: v("surface"),
        ink: v("ink"),
        "ink-secondary": v("ink-secondary"),
        accent: v("accent"),
        "accent-fill": v("accent-fill"),
        hairline: v("hairline"),
        ok: v("status-ok"),
        warn: v("status-warn"),
        "warn-strong": v("status-warn-strong"),
        crit: v("status-crit"),
        "crit-strong": v("status-crit-strong"),
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"SF Pro Display"',
          '"SF Pro Text"',
          "var(--font-inter)",
          "Inter",
          "sans-serif",
        ],
      },
      fontSize: {
        hero: ["clamp(48px, 8vw, 96px)", { lineHeight: "1.04", letterSpacing: "-0.015em", fontWeight: "700" }],
        section: ["clamp(32px, 5vw, 56px)", { lineHeight: "1.07", letterSpacing: "-0.015em", fontWeight: "600" }],
        lead: ["clamp(19px, 2vw, 21px)", { lineHeight: "1.4", letterSpacing: "0.004em" }],
        body: ["17px", { lineHeight: "1.47", letterSpacing: "-0.022em" }],
      },
      borderRadius: {
        pill: "980px",
        card: "22px",
        "card-lg": "28px",
      },
      maxWidth: {
        content: "1200px",
      },
      transitionTimingFunction: {
        apple: "cubic-bezier(0.25, 0.1, 0.25, 1)",
      },
      backdropBlur: {
        nav: "20px",
      },
    },
  },
  plugins: [],
};

export default config;
