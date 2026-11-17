/**
 * components/ui/Button.tsx
 * v1.3.0 — pill buttons. Primary keeps its solid Apple blue (with a
 * soft blue shadow); secondary is now glass instead of flat white.
 */
import { type ButtonHTMLAttributes, forwardRef } from "react";
import { classNames } from "@/utils/helpers";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "text" | "danger";
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", loading = false, fullWidth = false, className, children, disabled, ...props }, ref) => {
    const base = "pressable rounded-full text-body font-semibold disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2 py-4 px-6";

    const variants: Record<string, string> = {
      primary: "text-white",
      secondary: "glass",
      text: "bg-transparent py-2 px-3",
      danger: "glass",
    };

    const style =
      variant === "primary"
        ? { background: "var(--color-blue)", boxShadow: "0 8px 24px rgba(0,122,255,0.3)" }
        : variant === "secondary"
        ? { color: "var(--color-black)" }
        : variant === "danger"
        ? { color: "var(--color-red)" }
        : { color: "var(--color-blue)" };

    return (
      <button
        ref={ref}
        className={classNames(base, variants[variant], fullWidth && "w-full", className)}
        style={style}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin opacity-70" />
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
