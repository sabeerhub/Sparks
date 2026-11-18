/** @type {import('tailwindcss').Config} */
module.exports = {
  // v1.7.0: dark mode is real and opt-in (Settings → Appearance). It is
  // driven by `html[data-theme="dark"]` redefining the CSS variables in
  // globals.css — NOT by Tailwind's dark: variant, so no per-component
  // dark: classes exist anywhere. Every semantic colour below is a
  // variable reference, so flipping the theme flips the whole app.
  // `white` and `black` stay literal: white text on blue buttons and
  // switch knobs must stay white in both themes.
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        blue: "var(--color-blue)",
        "blue-light": "var(--color-blue-light)",
        "blue-pressed": "var(--color-blue-pressed)",
        green: "var(--color-green)",
        red: "var(--color-red)",
        orange: "var(--color-orange)",
        ink: "rgb(var(--color-black-rgb) / <alpha-value>)",
        "gray-1": "var(--color-gray-1)",
        "gray-2": "var(--color-gray-2)",
        "gray-3": "var(--color-gray-3)",
        surface: "var(--color-surface)",
        background: "var(--color-background)",
      },
      // ─── v1.2.0 unified type scale ─────────────────────────────────────
      // One size per job, used everywhere: title for screen/section titles,
      // body for all reading text and labels, caption for timestamps, meta
      // and footnotes. (The landing hero is the single exception: it uses
      // the .text-display class in globals.css.) Notification badges keep
      // their 9–10px micro size — a badge is not body copy.
      fontSize: {
        title: ["24px", { lineHeight: "30px", letterSpacing: "-0.02em", fontWeight: "700" }],
        body: ["16px", { lineHeight: "24px" }],
        caption: ["12px", { lineHeight: "16px" }],
      },
      borderRadius: {
        sm: "16px",
        md: "24px",
        lg: "28px",
        xl: "32px",
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "SF Pro Display", "SF Pro Text", "Inter", "sans-serif"],
        // v1.3.0 calligraphic brand face — Great Vibes with cursive fallback.
        script: ["Great Vibes", "Snell Roundhand", "Segoe Script", "Brush Script MT", "cursive"],
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
      },
    },
  },
  plugins: [],
};
