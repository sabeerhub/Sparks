/**
 * components/layout/ScreenContainer.tsx
 * Mobile-first frame: caps width at a phone-like max so the app reads
 * correctly even when opened on a wider viewport, per "mobile-first ALWAYS."
 */
import type { ReactNode } from "react";

export function ScreenContainer({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#F0F0F5" }}>
      <div className="h-screen w-full max-w-sm mx-auto overflow-hidden flex flex-col shadow-2xl relative bg-white">
        {children}
      </div>
    </div>
  );
}
