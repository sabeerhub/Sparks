/**
 * components/layout/ScreenContainer.tsx
 * Mobile-first frame: caps width at a phone-like max so the app reads
 * correctly even when opened on a wider viewport, per "mobile-first ALWAYS."
 * v1.3.0 — the frame itself is glass: translucent white over the soft
 * app surface, so the whole phone frame reads as one glass sheet.
 * v1.9.0 — on desktop (md+) the frame disappears: the page fills the
 * screen like a real desktop app instead of a phone column floating
 * on a void. The shape lives in `.screen-frame` / `.screen-frame-outer`
 * in styles/globals.css; mobile behaviour is unchanged.
 */
import type { ReactNode } from "react";

export function ScreenContainer({ children }: { children: ReactNode }) {
  return (
    <div className="app-surface screen-frame-outer">
      <div className="glass screen-frame">{children}</div>
    </div>
  );
}
