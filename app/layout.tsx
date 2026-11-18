import type { Metadata, Viewport } from "next";
import "@/styles/globals.css";
import { CallProvider } from "@/components/call/CallProvider";
import { AppearanceApplier } from "@/components/appearance/AppearanceApplier";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

export const metadata: Metadata = {
  title: "Sparks",
  description: "Private, secure, real-time messaging.",
};

// v1.8.0 — interactiveWidget resizes-content: on Android Chrome the
// keyboard resizes the layout viewport instead of overlaying it, so
// the composer stays above the keyboard instead of sliding under it
// and being shoved around. (No maximumScale: the composer text is
// already 16px, so iOS never zooms on focus — pinch zoom stays
// available for everyone.)
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: the blocking theme script below sets
    // data-theme on <html> before React hydrates, so the attribute
    // React sees can differ from the server render — that is expected,
    // not a bug. Without this flag Next logs a hydration warning.
    <html lang="en" suppressHydrationWarning>
      <body>
        {/* v1.7.0 no-flash theme: this inline script runs before first
            paint and puts the user's saved theme (or Light) on <html>,
            so a dark-mode user never sees a white flash. Same logic as
            lib/theme.ts applyTheme, inlined because it must run before
            React. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <AppearanceApplier />
        <CallProvider>{children}</CallProvider>
      </body>
    </html>
  );
}
