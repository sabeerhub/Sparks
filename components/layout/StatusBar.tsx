/**
 * components/layout/StatusBar.tsx
 * ─────────────────────────────────────────────────────────────────────────
 * Renders nothing on purpose. The original design reference was a static
 * mockup image showing a fake iOS status bar (always "9:41") as part of
 * the screen art — appropriate there, since it was illustrating a phone
 * frame in a still image. On a real deployed site, the browser's own
 * status bar already shows the actual time/signal/battery, so a second,
 * fake, always-wrong one stacked underneath it is confusing, not polish.
 * Kept as a no-op component (rather than deleting it and updating every
 * call site) so every screen that renders <StatusBar /> keeps working
 * unchanged; this is the single place that controls whether it shows.
 */
export function StatusBar() {
  return null;
}
