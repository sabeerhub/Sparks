/**
 * app/(settings)/layout.tsx
 * v1.9.0 — the settings group had no layout at all, so every page was
 * a ~320px phone column centred on a black screen (the worst screen in
 * the desktop inspection). Desktop now gets a real two-pane shell:
 * the icon rail, a category list on the left (~300px) and the detail
 * page on the right (~600px, ~900px total). Mobile is unchanged —
 * each page still renders its own phone frame.
 */
"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Lock, Bell, HardDrive, Sun, Globe, HelpCircle, Info, ShieldCheck, Settings } from "lucide-react";
import { DesktopNavRail } from "@/components/layout/DesktopNavRail";

const CATEGORIES = [
  { href: "/settings", label: "All Settings", icon: Settings },
  { href: "/settings/account", label: "Account", icon: User },
  { href: "/settings/privacy", label: "Privacy", icon: ShieldCheck },
  { href: "/settings/security", label: "Security", icon: Lock },
  { href: "/settings/notifications", label: "Notifications", icon: Bell },
  { href: "/settings/appearance", label: "Appearance", icon: Sun },
  { href: "/settings/storage", label: "Storage", icon: HardDrive },
  { href: "/settings/language", label: "Language", icon: Globe },
  { href: "/settings/help", label: "Help", icon: HelpCircle },
  { href: "/settings/about", label: "About", icon: Info },
];

export default function SettingsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="app-surface md:flex md:h-dvh md:w-full">
      <div className="hidden md:block flex-shrink-0">
        <DesktopNavRail />
      </div>

      {/* Desktop category list. */}
      <aside
        className="hidden md:flex md:flex-col md:w-[300px] flex-shrink-0 border-r px-4 py-6 overflow-y-auto"
        style={{ borderColor: "var(--color-gray-2)" }}
      >
        <h1 className="text-title font-bold px-2 pb-4" style={{ color: "var(--color-black)" }}>Settings</h1>
        <nav className="space-y-1">
          {CATEGORIES.map(({ href, label, icon: Icon }) => {
            const active = href === "/settings" ? pathname === "/settings" : pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className="pressable flex items-center gap-3 px-3 py-2.5 rounded-2xl text-body font-medium"
                style={active
                  ? { background: "rgba(0,122,255,0.12)", color: "var(--color-blue)" }
                  : { color: "var(--color-black)" }}
              >
                <Icon size={19} color={active ? "var(--color-blue)" : "var(--color-gray-1)"} strokeWidth={1.8} />
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Detail pane — the settings page itself. */}
      <main className="md:flex-1 md:min-w-0 md:h-dvh md:overflow-y-auto md:flex md:justify-center">
        <div className="md:w-full md:max-w-[600px] md:h-full">{children}</div>
      </main>
    </div>
  );
}
