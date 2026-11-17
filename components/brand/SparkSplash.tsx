/**
 * components/brand/SparkSplash.tsx
 * v1.3.0 — short intro: the calligraphic wordmark writes itself in
 * over soft glass, then the screen fades away. No icon, no bolt —
 * the wordmark is the whole brand.
 *
 * Never blocks: a tap or click anywhere skips it at once, the Escape
 * key skips it too, and `prefers-reduced-motion` skips the animation
 * entirely (`onDone` at once). `onDone` fires exactly once, however
 * the splash ends. The parent decides whether to show it (landing
 * shows it once per session).
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SparkWordmark } from "./SparkWordmark";

const SPLASH_MS = 1900;
const FADE_MS = 280;

export function SparkSplash({ onDone }: { onDone: () => void }) {
  const doneRef = useRef(false);
  const [leaving, setLeaving] = useState(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setLeaving(true);
    window.setTimeout(onDone, FADE_MS);
  }, [onDone]);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      finish();
      return;
    }
    const timer = window.setTimeout(finish, SPLASH_MS);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") finish();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [finish]);

  return (
    <div
      aria-hidden="true"
      onClick={finish}
      className="fixed inset-0 z-50 flex cursor-pointer flex-col items-center justify-center gap-6 bg-white transition-opacity duration-300"
      style={{ opacity: leaving ? 0 : 1 }}
    >
      <SparkWordmark size="hero" animate />
      <p className="text-body" style={{ color: "var(--color-gray-1)" }}>
        Tap anywhere to continue
      </p>
    </div>
  );
}
