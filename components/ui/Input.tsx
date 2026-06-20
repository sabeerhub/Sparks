/**
 * components/ui/Input.tsx
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
          <label className="text-xs font-semibold mb-1 block" style={{ color: "var(--color-gray-1)" }}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={classNames(
            "w-full px-4 py-3.5 rounded-2xl border outline-none text-sm transition-colors",
            "focus:border-[color:var(--color-blue)]",
            className
          )}
          style={{ borderColor: error ? "var(--color-red)" : "var(--color-gray-3)", background: "var(--color-gray-2)", color: "var(--color-black)" }}
          {...props}
        />
        {error && <p className="text-xs mt-1" style={{ color: "var(--color-red)" }}>{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
