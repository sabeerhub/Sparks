/**
 * components/settings/settings-ui.tsx
 * v1.3.1 — shared Settings design language. Every settings page is built
 * from these pieces so no page is left looking like a form dumped on a
 * white page: a glass header with a real 44px back button, section
 * labels, glass cards with iOS-style rows, and a proper glass switch.
 * Light + dark (v1.7.0, opt-in), Apple blue #007AFF, ink #1D1D1F, system font, no colour
 * gradients, no bolt icons anywhere.
 */
"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";

/** Frosted glass header: 44px glass back button + title-size heading. */
export function SettingsHeader({
  title,
  right,
}: {
  title: string;
  right?: ReactNode;
}) {
  const router = useRouter();
  return (
    <div className="frosted-header flex items-center justify-between px-4 pt-2 pb-3 flex-shrink-0">
      <div className="flex items-center min-w-0">
        <button
          onClick={() => router.back()}
          aria-label="Back"
          className="glass pressable w-11 h-11 -ml-1 rounded-full flex items-center justify-center flex-shrink-0"
        >
          <ChevronLeft size={22} color="var(--color-blue)" strokeWidth={2} />
        </button>
        <h1 className="text-title font-bold ml-2 truncate">{title}</h1>
      </div>
      {right}
    </div>
  );
}

/** Small uppercase section label above a card group. */
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-caption font-semibold uppercase tracking-wide mb-2 px-2" style={{ color: "var(--color-gray-1)" }}>
      {children}
    </p>
  );
}

/** One glass card grouping related rows. */
export function SettingsCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`glass-card rounded-[24px] overflow-hidden ${className}`}>{children}</div>;
}

/** Hairline divider between rows inside a card. */
export function RowDivider() {
  return <div className="mx-4" style={{ height: 1, background: "var(--color-gray-2)" }} />;
}

/** Tinted glass icon tile used by every settings row. */
export function RowIcon({
  icon: Icon,
  tint = "rgba(0,122,255,0.12)",
  color = "var(--color-blue)",
}: {
  icon: import("lucide-react").LucideIcon;
  tint?: string;
  color?: string;
}) {
  return (
    <div
      className="glass w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
      style={{ background: tint }}
    >
      <Icon size={19} color={color} strokeWidth={1.8} />
    </div>
  );
}

/** A tappable row: icon tile + label + description/value + chevron. */
export function SettingsRow({
  icon,
  tint,
  iconColor,
  label,
  desc,
  value,
  onClick,
  danger,
}: {
  icon: import("lucide-react").LucideIcon;
  tint?: string;
  iconColor?: string;
  label: string;
  desc?: string;
  value?: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="pressable w-full flex items-center gap-3 px-4 py-4 text-left"
    >
      <RowIcon icon={icon} tint={tint} color={iconColor} />
      <span className="flex-1 min-w-0">
        <span
          className="block text-body font-medium truncate"
          style={{ color: danger ? "var(--color-red)" : "var(--color-black)" }}
        >
          {label}
        </span>
        {desc && (
          <span className="block text-caption truncate mt-0.5" style={{ color: "var(--color-gray-1)" }}>
            {desc}
          </span>
        )}
      </span>
      {value && (
        <span className="text-body flex-shrink-0" style={{ color: "var(--color-gray-1)" }}>
          {value}
        </span>
      )}
      <ChevronRight size={17} color="#C7C7CC" strokeWidth={1.8} className="flex-shrink-0" />
    </button>
  );
}

/** Apple-style glass switch. */
export function GlassSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="w-[52px] h-8 rounded-full flex-shrink-0 relative transition-colors duration-200"
      style={{
        background: checked ? "var(--color-green)" : "rgba(120,120,128,0.32)",
        boxShadow: checked
          ? "0 2px 8px rgba(52,199,89,0.35)"
          : "inset 0 1px 2px rgba(0,0,0,0.08)",
      }}
    >
      <span
        className="absolute top-[3px] w-[26px] h-[26px] rounded-full bg-white transition-all duration-200"
        style={{
          left: checked ? 23 : 3,
          boxShadow: "0 2px 6px rgba(0,0,0,0.18), 0 0 0 0.5px rgba(0,0,0,0.04)",
        }}
      />
    </button>
  );
}

/** A row with a label, description and a glass switch. */
export function ToggleRow({
  icon,
  label,
  desc,
  checked,
  onChange,
  last,
}: {
  icon: import("lucide-react").LucideIcon;
  label: string;
  desc?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  last?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-4">
      <RowIcon icon={icon} />
      <div className="flex-1 min-w-0">
        <div className="text-body font-medium">{label}</div>
        {desc && (
          <div className="text-caption mt-0.5" style={{ color: "var(--color-gray-1)" }}>
            {desc}
          </div>
        )}
      </div>
      <GlassSwitch checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

/** A selectable option row with a blue check when selected. */
export function OptionRow({
  icon,
  label,
  preview,
  selected,
  onClick,
}: {
  icon: import("lucide-react").LucideIcon;
  label: string;
  preview?: ReactNode;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="pressable w-full flex items-center gap-3 px-4 py-4 text-left">
      <RowIcon icon={icon} />
      <span className="flex-1 text-body font-medium">{label}</span>
      {preview}
      {selected && <Check size={19} color="var(--color-blue)" strokeWidth={2.4} className="flex-shrink-0" />}
    </button>
  );
}
