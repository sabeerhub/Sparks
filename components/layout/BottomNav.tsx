/**
 * components/layout/BottomNav.tsx
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/chats", icon: "chat", label: "Chats" },
  { href: "/search", icon: "search", label: "Search" },
  { href: "/chats/new", icon: "plus", label: null, fab: true },
  { href: "/activity", icon: "activity", label: "Activity" },
  { href: "/profile", icon: "user", label: "Profile" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="flex items-center justify-around px-4 py-2 border-t"
      style={{ background: "rgba(255,255,255,0.95)", borderColor: "var(--color-gray-3)", paddingBottom: 8 }}
    >
      {TABS.map((tab) =>
        tab.fab ? (
          <Link
            key={tab.href}
            href={tab.href}
            className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95"
            style={{ background: "var(--color-blue)" }}
          >
            <PlusIcon color="#fff" />
          </Link>
        ) : (
          <Link key={tab.href} href={tab.href} className="flex flex-col items-center gap-0.5 py-1 min-w-12">
            <TabIcon name={tab.icon} active={pathname === tab.href} />
            <span className="text-xs font-medium" style={{ color: pathname === tab.href ? "var(--color-blue)" : "var(--color-gray-1)" }}>
              {tab.label}
            </span>
          </Link>
        )
      )}
    </nav>
  );
}

function TabIcon({ name, active }: { name: string; active: boolean }) {
  const color = active ? "var(--color-blue)" : "var(--color-gray-1)";
  const common = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  switch (name) {
    case "chat":
      return <svg {...common}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>;
    case "search":
      return <svg {...common}><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>;
    case "activity":
      return <svg {...common}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>;
    case "user":
      return <svg {...common}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
    default:
      return null;
  }
}

function PlusIcon({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
