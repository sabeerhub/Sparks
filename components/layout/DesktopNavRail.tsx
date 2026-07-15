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
  { href: "/activity", icon: Bell, label: "Activity", badge: true },
  { href: "/profile", icon: User, label: "Profile" },
];

/**
 * Persistent desktop-only (md+) icon rail providing navigation between the
 * app's top-level sections. On mobile this renders nothing — BottomNav
 * remains the mobile navigation, unchanged. Shared across the (chat) and
 * (profile) route groups so every screen keeps a consistent way to reach
 * every other screen once the viewport is wide enough for the two/three
 * column desktop layout.
 */
export function DesktopNavRail() {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getUnreadCount().then((n) => { if (!cancelled) setUnread(n); });

    const channel = supabase
      .channel("desktop-rail-notif-badge")
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
    <div
      className="hidden md:flex md:flex-col md:items-center md:w-[72px] flex-shrink-0 border-r py-6 gap-2"
      style={{ borderColor: "var(--color-gray-2)" }}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-4" style={{ background: "var(--color-blue)" }}>
        <span className="text-white text-base font-bold">⚡</span>
      </div>

      {TABS.map(({ href, icon: Icon, label, badge }) => {
        const active = pathname === href || (href === "/chats" && pathname.startsWith("/chats"));
        return (
          <Link
            key={href}
            href={href}
            className="relative w-12 h-12 rounded-2xl flex items-center justify-center transition-colors"
            style={{ background: active ? "rgba(0,122,255,0.12)" : "transparent" }}
            aria-label={label}
          >
            <Icon size={22} color={active ? "var(--color-blue)" : "var(--color-gray-1)"} strokeWidth={1.8} />
            {badge && unread > 0 && (
              <span className="absolute top-1.5 right-2 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: "var(--color-red)" }}>
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Link>
        );
      })}

      <Link
        href="/chats/new"
        className="w-12 h-12 rounded-2xl flex items-center justify-center mt-2"
        style={{ background: "var(--color-blue)" }}
        aria-label="New chat"
      >
        <Plus size={20} color="white" strokeWidth={2} />
      </Link>
    </div>
  );
}
