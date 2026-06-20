/**
 * components/ui/Button.tsx
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
    const base = "rounded-2xl text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2 py-3.5 px-6";

    const variants: Record<string, string> = {
      primary: "text-white",
      secondary: "border bg-white",
      text: "bg-transparent py-2 px-3",
      danger: "border text-[color:var(--color-red)] bg-white",
    };

    const style =
      variant === "primary"
        ? { background: "var(--color-blue)" }
        : variant === "secondary"
        ? { borderColor: "var(--color-gray-3)", color: "var(--color-black)" }
        : variant === "danger"
        ? { borderColor: "var(--color-red)" }
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
