/**
 * components/brand/SparkWordmark.tsx
 * v1.4.0 — the ONLY brand mark. The word "Sparks" in calligraphy
 * (Great Vibes via next/font/google, graceful cursive fallback if the
 * webfont ever fails), finished with a plain clean blue dot. There is
 * no icon next to it and no lightning bolt anywhere in the app.
 *
 * Animation (v1.4.0 — v1.3.2 was STILL broken; a real browser measured
 * it on the live site):
 * - WRITE-IN: each letter reveals left-to-right with a clip-path wipe
 *   at FULL opacity — a pen stroke, never a fade. Mid-way the word is
 *   always fully black where drawn, never a faint grey scribble.
 * - THE DOT stays hidden until the last letter lands (~1.0s), then
 *   pops in on a spring. It never floats detached from a half-drawn
 *   word.
 * - THE LOOP is a TRUE ADDITIVE HIGHLIGHT: the text is solid ink
 *   (no background-clip, no transparency) and the shine is a separate
 *   screen-blend layer above it (`.wordmark-shine` in globals.css).
 *   The band only ADDS soft light (max ~35% white) — the letters stay
 *   fully legible and dark at every moment; the light passes OVER the
 *   ink, it never replaces it. One 8s motion, seamless loop seam.
 * Under prefers-reduced-motion the entry is instant and the loop is
 * off: a static wordmark.
 */
"use client";

import { Great_Vibes } from "next/font/google";
import { motion, useReducedMotion } from "framer-motion";

const greatVibes = Great_Vibes({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export type WordmarkSize = "hero" | "display" | "large" | "medium" | "small";

const SIZE_CLASSES: Record<WordmarkSize, string> = {
  display: "text-[72px] lg:text-[112px] leading-none",
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

/** Delay (s) before the dot appears: after the last letter lands. */
const DOT_DELAY = 0.08 + (LETTERS.length - 1) * 0.09 + 0.4;

export function SparkWordmark({ size = "medium", animate = false, className = "" }: SparkWordmarkProps) {
  const reduceMotion = useReducedMotion();
  const playEntry = animate && !reduceMotion;

  return (
    <span
      role="img"
      aria-label="Sparks"
      className={`inline-flex items-baseline ${className}`}
    >
      {/* Solid-ink word with the shine layer above it. */}
      <span className="relative inline-block">
        <span
          aria-hidden="true"
          className={`font-script ${greatVibes.className} ${SIZE_CLASSES[size]}`}
          style={{ color: "#1D1D1F" }}
        >
          {LETTERS.map((letter, i) =>
            playEntry ? (
              <motion.span
                key={i}
                className="inline-block"
                initial={{ clipPath: "inset(0 100% 0 0)", y: 4 }}
                animate={{ clipPath: "inset(0 0% 0 0)", y: 0 }}
                transition={{
                  duration: 0.38,
                  ease: [0.22, 1, 0.36, 1],
                  delay: 0.08 + i * 0.09,
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
        {/* Additive shine: a separate screen-blend layer. It only adds
            soft light over the solid ink — the letters never go pale. */}
        <span aria-hidden="true" className={`wordmark-shine${playEntry ? " wordmark-shine--delayed" : ""}`}>
          <span className="wordmark-shine-band" />
        </span>
      </span>
      {/* The dot stays hidden until the word has finished drawing. */}
      {playEntry ? (
        <motion.span
          aria-hidden="true"
          className={`inline-block ${SIZE_CLASSES[size]}`}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 18, delay: DOT_DELAY }}
        >
          <span className="wordmark-dot" />
        </motion.span>
      ) : (
        <span aria-hidden="true" className={`wordmark-dot ${SIZE_CLASSES[size]}`} />
      )}
    </span>
  );
}
