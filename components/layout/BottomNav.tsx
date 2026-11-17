/**
 * components/layout/BottomNav.tsx
 * v1.2.0 — exactly FOUR tabs: Chats, Calls, Activity, Profile.
 * Search and New Chat left the nav; both now live in the Chats screen
 * header (mobile + desktop sidebar). Floating liquid-glass pill, refined
 * from v1.1.0: frosted backdrop blur, hairline border, soft shadow.
 */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle, Bell, User, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { getUnreadCount } from "@/services/notification-service";

const supabase = createClient();

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
      aria-label="Main navigation"
      className="frosted-pill mx-4 flex items-center justify-around rounded-full px-2 pt-2"
      style={{ marginBottom: "max(12px, env(safe-area-inset-bottom, 0px))" }}
    >
      {TABS.map((tab) => {
        const active = isActiveTab(tab.href, pathname);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className="pressable relative flex flex-col items-center justify-center gap-0.5 min-w-16 min-h-11 rounded-full px-3 py-1"
            style={{ background: active ? "rgba(0,122,255,0.10)" : "transparent" }}
          >
            <tab.icon
              size={22}
              color={active ? "var(--color-blue)" : "var(--color-gray-1)"}
              strokeWidth={active ? 2 : 1.8}
            />
            {tab.badge && unread > 0 && (
              <span className="absolute top-0 right-2 min-w-4 h-4 px-1 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: "var(--color-red)" }}>
                {unread > 9 ? "9+" : unread}
              </span>
            )}
            <span
              className="text-caption font-medium"
              style={{ color: active ? "var(--color-blue)" : "var(--color-gray-1)" }}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
