/**
 * components/ui/Input.tsx
 * v1.3.0 — glass pill field: translucent, blurred, blue focus ring.
 */
import { type InputHTMLAttributes, forwardRef } from "react";
import { classNames } from "@/utils/helpers";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => {
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
            "glass-input w-full px-4 py-4 rounded-full outline-none text-body transition-all placeholder:text-[#1D1D1F]/40",
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
