/**
 * components/layout/ScreenContainer.tsx
 * Mobile-first frame: caps width at a phone-like max so the app reads
 * correctly even when opened on a wider viewport, per "mobile-first ALWAYS."
 * v1.3.0 — the frame itself is glass: translucent white over the soft
 * app surface, so the whole phone frame reads as one glass sheet.
 */
import type { ReactNode } from "react";

export function ScreenContainer({ children }: { children: ReactNode }) {
  return (
    <div className="app-surface min-h-screen flex items-center justify-center">
      <div className="glass h-screen w-full max-w-sm mx-auto overflow-hidden flex flex-col shadow-2xl relative" style={{ borderRadius: 0, borderLeft: "1px solid rgba(255,255,255,0.65)", borderRight: "1px solid rgba(255,255,255,0.65)" }}>
        {children}
      </div>
    </div>
  );
}
