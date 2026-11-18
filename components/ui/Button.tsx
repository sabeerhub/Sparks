/**
 * components/ui/Button.tsx
 * v1.3.0 — pill buttons. Primary keeps its solid Apple blue (with a
 * soft blue shadow); secondary is now glass instead of flat white.
 *
 * v1.8.1 — hardening, after the friend-profile "Message" label burst
 * out of its pill on a 360px phone: padding now comes from ONE place
 * only, the `size` prop. The old pattern — base padding plus a
 * className padding override — silently did nothing: Tailwind emits
 * .px-4 before .px-6 in the stylesheet, so the larger padding always
 * won and "compact" buttons rendered full-size. Never override a
 * Button's padding through className again; pick a size instead.
 *
 * Labels can never spill out of a pill again: `whitespace-nowrap`
 * keeps a label on one line, and a Button is never given `min-w-0`
 * (a flex item's automatic minimum size is what stops it shrinking
 * below its label). Callers must size the slot to fit the label —
 * see the friend profile action row, where the widths are measured
 * out at 360px in the page's header comment.
 */
import { type ButtonHTMLAttributes, forwardRef } from "react";
import { classNames } from "@/utils/helpers";

type ButtonSize = "lg" | "md" | "sm";

const SIZES: Record<ButtonSize, string> = {
  // Default: the big full-width form button (auth, onboarding).
  lg: "text-body py-4 px-6",
  // Uniform 48px action height — profile action rows, Accept/Decline.
  md: "text-body h-12 px-5",
  // Small inline button — the compact Spark request button in search.
  sm: "text-caption h-9 px-4",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "text" | "danger";
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "lg", loading = false, fullWidth = false, className, children, disabled, ...props }, ref) => {
    const base = "pressable rounded-full font-semibold disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2 whitespace-nowrap";

    const variants: Record<string, string> = {
      primary: "text-white",
      secondary: "glass",
      text: "bg-transparent",
      danger: "glass",
    };

    // The text variant keeps its own small padding; every other
    // variant takes its padding from `size` and only from `size`.
    const padding = variant === "text" ? "text-body py-2 px-3" : SIZES[size];

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
        className={classNames(base, variants[variant], padding, fullWidth && "w-full", className)}
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
