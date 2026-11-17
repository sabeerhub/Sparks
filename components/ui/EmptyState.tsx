/**
 * components/ui/EmptyState.tsx
 * v1.3.0 — the shared empty state: a glass tile, calm copy, one
 * optional action. Chats / Calls / Activity use the `wordmark`
 * variant — the calligraphic wordmark is the tile's whole mark.
 * Everywhere else the tile holds a plain clean dot (never a bolt,
 * never a gimmick emoji) or a caller-supplied icon.
 */
"use client";

import type { ReactNode } from "react";
import { SparkWordmark } from "@/components/brand/SparkWordmark";

interface EmptyStateProps {
  title: string;
  subtitle: string;
  /** Show the calligraphic wordmark in the tile (Chats / Calls / Activity). */
  wordmark?: boolean;
  /** A plain icon tile (lucide only — never a bolt). Used when wordmark is false and no dot is wanted. */
  icon?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, subtitle, wordmark = false, icon, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-8 pt-16 pb-8 text-center">
      <div className="glass-card rounded-[28px] px-6 py-8 flex flex-col items-center w-full max-w-xs">
        {wordmark ? (
          <div className="mb-4">
            <SparkWordmark size="medium" animate />
          </div>
        ) : icon ? (
          <div className="glass w-16 h-16 rounded-[24px] flex items-center justify-center mb-4">{icon}</div>
        ) : (
          <div className="glass w-16 h-16 rounded-full flex items-center justify-center mb-4">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--color-blue)" }} />
          </div>
        )}
        <p className="text-body font-semibold mb-1">{title}</p>
        <p className="text-body" style={{ color: "var(--color-gray-1)" }}>
          {subtitle}
        </p>
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="pressable mt-5 px-5 py-2.5 rounded-full text-body font-semibold text-white"
            style={{ background: "var(--color-blue)" }}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
