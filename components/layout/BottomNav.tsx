/**
 * components/layout/BottomNav.tsx
 */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle, Search, Bell, User, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { getUnreadCount } from "@/services/notification-service";

const supabase = createClient();

const TABS = [
  { href: "/chats", icon: MessageCircle, label: "Chats" },
  { href: "/search", icon: Search, label: "Search" },
  { href: "/chats/new", icon: Plus, label: null, fab: true },
  { href: "/activity", icon: Bell, label: "Activity", badge: true },
  { href: "/profile", icon: User, label: "Profile" },
];

export function BottomNav() {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getUnreadCount().then((n) => { if (!cancelled) setUnread(n); });

    const channel = supabase
      .channel("bottomnav-notif-badge")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => {
        getUnreadCount().then((n) => { if (!cancelled) setUnread(n); });
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

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
            <Plus size={22} color="white" strokeWidth={2} />
          </Link>
        ) : (
          <Link key={tab.href} href={tab.href} className="relative flex flex-col items-center gap-0.5 py-1 min-w-12">
            <tab.icon
              size={22}
              color={pathname === tab.href ? "var(--color-blue)" : "var(--color-gray-1)"}
              strokeWidth={1.8}
            />
            {tab.badge && unread > 0 && (
              <span className="absolute top-0 right-2 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ background: "var(--color-red)" }}>
                {unread > 9 ? "9+" : unread}
              </span>
            )}
            <span className="text-xs font-medium" style={{ color: pathname === tab.href ? "var(--color-blue)" : "var(--color-gray-1)" }}>
              {tab.label}
            </span>
          </Link>
        )
      )}
    </nav>
  );
}
