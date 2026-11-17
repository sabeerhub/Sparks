/**
 * components/auth/AuthShell.tsx
 * v1.3.0 — the shared frame for every login / signup / recovery /
 * onboarding screen: a glass card centred on the flat soft app
 * surface, the animated calligraphic wordmark at the top, pill
 * inputs and pill buttons inside, spring entrance. One frame, so
 * every auth screen feels like the same new app.
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
}

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <MotionConfig reducedMotion="user">
      <div className="app-surface min-h-screen flex items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 120, damping: 16 }}
          className="w-full max-w-sm"
        >
          <div className="flex justify-center mb-6">
            <SparkWordmark size="large" animate />
          </div>

          <div className="glass-card glass-sheen rounded-[28px] px-6 py-8">
            <h1 className="text-title font-bold text-center">{title}</h1>
            {subtitle && (
              <p className="text-body text-center mt-1" style={{ color: "var(--color-gray-1)" }}>
                {subtitle}
              </p>
            )}
            <div className="mt-6">{children}</div>
          </div>

          {footer && <div className="mt-5 text-center">{footer}</div>}
        </motion.div>
      </div>
    </MotionConfig>
  );
}
