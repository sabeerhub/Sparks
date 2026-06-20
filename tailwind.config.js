/** @type {import('tailwindcss').Config} */
module.exports = {
  // Dark mode deliberately NOT enabled — design system mandates light theme only.
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        blue: "#007AFF",
        "blue-light": "#E8F1FF",
        green: "#34C759",
        red: "#FF3B30",
        orange: "#FF9500",
        ink: "#1D1D1F",
        "gray-1": "#6E6E73",
        "gray-2": "#F5F5F7",
        "gray-3": "#E5E5EA",
      },
      borderRadius: {
        sm: "16px",
        md: "24px",
        lg: "28px",
        xl: "32px",
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "SF Pro Display", "SF Pro Text", "Inter", "sans-serif"],
      },
      boxShadow: {
        sm: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        md: "0 4px 16px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)",
      },
    },
  },
  plugins: [],
};
