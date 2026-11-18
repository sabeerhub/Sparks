/**
 * components/ui/Input.tsx
 * v1.3.0 — glass pill field: translucent, blurred, blue focus ring.
 * v1.11.0 — `variant="auth"`: the Instagram-style filled field for the
 * auth / onboarding screens (light grey fill, 12px radius, hairline
 * border — see `.auth-input` in globals.css). The glass pill stays the
 * default everywhere else; nothing else in the app changes shape.
 */
import { type InputHTMLAttributes, forwardRef } from "react";
import { classNames } from "@/utils/helpers";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  /** "pill" (default, glass) or "auth" (Instagram-style filled field). */
  variant?: "pill" | "auth";
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, variant = "pill", className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="text-caption font-semibold mb-1 block" style={{ color: "var(--color-gray-1)" }}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={classNames(
            variant === "auth"
              ? "auth-input w-full px-4 py-3.5 rounded-xl outline-none text-body transition-all placeholder:text-ink/40"
              : "glass-input w-full px-4 py-4 rounded-full outline-none text-body transition-all placeholder:text-ink/40",
            className
          )}
          style={{ borderColor: error ? "var(--color-red)" : undefined, color: "var(--color-black)" }}
          {...props}
        />
        {error && <p className="text-caption mt-1" style={{ color: "var(--color-red)" }}>{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
