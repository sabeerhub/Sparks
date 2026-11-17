"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle, Bell, User, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { getUnreadCount } from "@/services/notification-service";

const supabase = createClient();

/**
 * v1.2.0 — exactly FOUR tabs, mirroring the mobile pill: Chats, Calls,
 * Activity, Profile. Search and New Chat left the rail; both now live in
 * the Chats screen header (desktop sidebar). No New Chat button here.
 */
const TABS = [
  { href: "/chats", icon: MessageCircle, label: "Chats" },
  { href: "/calls", icon: Phone, label: "Calls" },
  { href: "/activity", icon: Bell, label: "Activity", badge: true },
  { href: "/profile", icon: User, label: "Profile" },
];

function isActiveTab(href: string, pathname: string): boolean {
  if (href === "/chats") return pathname === "/chats" || pathname.startsWith("/chats/");
  if (href === "/profile") return pathname === "/profile" || pathname.startsWith("/profile/");
  return pathname === href;
}

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
        const active = isActiveTab(href, pathname);
        return (
          <Link
            key={href}
            href={href}
            className="pressable relative w-12 h-12 rounded-2xl flex items-center justify-center transition-colors"
            style={{ background: active ? "rgba(0,122,255,0.12)" : "transparent" }}
            aria-label={label}
            aria-current={active ? "page" : undefined}
            title={label}
          >
            <Icon size={22} color={active ? "var(--color-blue)" : "var(--color-gray-1)"} strokeWidth={active ? 2 : 1.8} />
            {badge && unread > 0 && (
              <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: "var(--color-red)" }}>
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
