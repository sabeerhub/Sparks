/**
 * components/layout/BottomNav.tsx
 * v1.3.0 — exactly FOUR tabs: Chats, Calls, Activity, Profile.
 * Search and New Chat left the nav; both now live in the Chats screen
 * header (mobile + desktop sidebar). Floating liquid-glass pill: the
 * active tab's highlight is a spring that glides between tabs
 * (framer-motion layoutId), never a hard jump.
 */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, MotionConfig } from "framer-motion";
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
    <MotionConfig reducedMotion="user">
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
            >
              {active && (
                <motion.span
                  layoutId="bottomnav-active-pill"
                  className="absolute inset-0 rounded-full"
                  style={{ background: "rgba(0,122,255,0.10)" }}
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <span className="relative z-10 flex flex-col items-center gap-0.5">
                <tab.icon
                  size={22}
                  color={active ? "var(--color-blue)" : "var(--color-gray-1)"}
                  strokeWidth={active ? 2 : 1.8}
                />
                <span
                  className="text-caption font-medium"
                  style={{ color: active ? "var(--color-blue)" : "var(--color-gray-1)" }}
                >
                  {tab.label}
                </span>
              </span>
              {tab.badge && unread > 0 && (
                <span className="absolute top-0 right-2 z-10 min-w-4 h-4 px-1 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: "var(--color-red)" }}>
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </MotionConfig>
  );
}
