/**
 * components/auth/AuthShell.tsx
 * v1.3.0 — the shared frame for every login / signup / recovery /
 * onboarding screen: a glass card centred on the flat soft app
 * surface, the animated calligraphic wordmark at the top, pill
 * inputs and pill buttons inside, spring entrance. One frame, so
 * every auth screen feels like the same new app.
 * v1.11.0 — Instagram-style rebuild: the card is now a calm flat
 * surface card (solid token surface, hairline border, 16px radius,
 * soft shadow — no glass, no sheen), the column is 380px like
 * Instagram's auth box, and the footer switch link lives in its own
 * matching card below, exactly like Instagram's second box. The
 * wordmark, titles, subtitles and spring entrance are unchanged.
 * Dark mode follows the tokens: surface becomes #1C1C1E, hairline
 * becomes the white hairline — nothing is hardcoded light.
 */
"use client";

import type { ReactNode } from "react";
import { motion, MotionConfig } from "framer-motion";
import { SparkWordmark } from "@/components/brand/SparkWordmark";

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Small progress cue above the title, e.g. "Step 3 of 3" (onboarding). */
  stepLabel?: string;
}

export function AuthShell({ title, subtitle, children, footer, stepLabel }: AuthShellProps) {
  return (
    <MotionConfig reducedMotion="user">
      <div className="app-surface min-h-screen flex items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 120, damping: 16 }}
          className="w-full max-w-[380px]"
        >
          <div className="flex justify-center mb-8">
            <SparkWordmark size="large" animate />
          </div>

          <div
            className="rounded-2xl px-6 py-10"
            style={{ background: "var(--color-surface)", border: "1px solid var(--hairline)", boxShadow: "var(--shadow-sm)" }}
          >
            {stepLabel && (
              <p className="text-caption font-semibold text-center mb-3" style={{ color: "var(--color-blue)" }}>
                {stepLabel}
              </p>
            )}
            {/* v1.11.0 — no big headlines: the title is small and quiet,
                the wordmark above is the only large element. */}
            <h1 className="text-body font-bold text-center">{title}</h1>
            {subtitle && (
              <p className="text-caption text-center mt-1.5 leading-relaxed" style={{ color: "var(--color-gray-1)" }}>
                {subtitle}
              </p>
            )}
            <div className="mt-6">{children}</div>
          </div>

          {footer && (
            <div
              className="mt-4 px-6 py-4 text-center rounded-2xl"
              style={{ background: "var(--color-surface)", border: "1px solid var(--hairline)", boxShadow: "var(--shadow-sm)" }}
            >
              {footer}
            </div>
          )}
        </motion.div>
      </div>
    </MotionConfig>
  );
}
