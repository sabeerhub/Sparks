/**
 * components/brand/SparkWordmark.tsx
 * v1.3.0 — the ONLY brand mark. The word "Sparks" in calligraphy
 * (Great Vibes via next/font/google, graceful cursive fallback if the
 * webfont ever fails), finished with a plain clean blue dot. There is
 * no icon next to it and no lightning bolt anywhere in the app.
 *
 * Animation (v1.3.2 — the v1.3.0 motion was broken, see globals.css):
 * on entry the letters write themselves in — staggered fade + rise on
 * springs (~1.4s, no blur: blurring every letter while the loop ran
 * forced constant repaints and flicker). After entry ONE calm infinite
 * motion runs forever: a slow soft-blue shimmer sweep (pure CSS,
 * `.wordmark-loop` / `.wordmark-dot` in globals.css), 8s cycle with
 * long solid-ink pauses, seamless loop seam. The loop waits 1.6s when
 * an entry plays, so it never starts mid-write-in. Under
 * prefers-reduced-motion the entry is instant and the loop is off:
 * a static wordmark.
 */
"use client";

import { Great_Vibes } from "next/font/google";
import { motion, useReducedMotion } from "framer-motion";

const greatVibes = Great_Vibes({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export type WordmarkSize = "hero" | "large" | "medium" | "small";

const SIZE_CLASSES: Record<WordmarkSize, string> = {
  hero: "text-[64px] md:text-[88px] leading-none",
  large: "text-[44px] leading-none",
  medium: "text-[34px] leading-none",
  small: "text-[26px] leading-none",
};

interface SparkWordmarkProps {
  size?: WordmarkSize;
  /** Play the write-in on mount. The infinite loop runs either way. */
  animate?: boolean;
  /** Extra classes (e.g. a custom font size) — applied to the wrapper. */
  className?: string;
}

const LETTERS = ["S", "p", "a", "r", "k", "s"];

export function SparkWordmark({ size = "medium", animate = false, className = "" }: SparkWordmarkProps) {
  const reduceMotion = useReducedMotion();
  const playEntry = animate && !reduceMotion;

  return (
    <span
      role="img"
      aria-label="Sparks"
      className={`inline-flex items-baseline ${className}`}
    >
      <span
        aria-hidden="true"
        className={`wordmark-loop font-script ${greatVibes.className} ${SIZE_CLASSES[size]}${playEntry ? " wordmark-loop--delayed" : ""}`}
      >
        {LETTERS.map((letter, i) =>
          playEntry ? (
            <motion.span
              key={i}
              className="inline-block"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                type: "spring",
                stiffness: 110,
                damping: 16,
                delay: 0.1 + i * 0.07,
              }}
            >
              {letter}
            </motion.span>
          ) : (
            <span key={i} className="inline-block">
              {letter}
            </span>
          )
        )}
      </span>
      <span aria-hidden="true" className={`wordmark-dot ${SIZE_CLASSES[size]}`} />
    </span>
  );
}
