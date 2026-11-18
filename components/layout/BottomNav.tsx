/**
 * components/layout/BottomNav.tsx
 * v1.7.1 — exactly FOUR tabs: Chats, Calls, Activity, Profile.
 * Search and New Chat left the nav; both now live in the Chats screen
 * header (mobile + desktop sidebar).
 *
 * v1.7.1 — REBUILT IN THE DESIGN COLOURS. The v1.6.1 dark slate-blue
 * bar and its tall grey-blue oval were rejected by the user from his
 * own phone screenshot ("out of our design colours", "the shape of
 * liquid glass indicator is not standard and beautiful") and are
 * gone. The nav is now a LIGHT glass pill in the app's own palette —
 * white translucent, blur + saturate, bright hairline edge, soft
 * Apple-blue aurora inside so it always reads as glass over the pale
 * list. The active indicator is a standard in-bar capsule: same
 * height as the tab content, rounded-full, solid Apple blue with the
 * icon + label in white, gliding between tabs on the spring
 * (framer-motion layoutId). No bulge above or below the bar. Inactive
 * tabs are ink/grey. In dark mode the pill follows the dark glass
 * tokens and the capsule gets #0A84FF automatically via the token.
 *
 * PINNED (v1.6.1, kept): `fixed` to the viewport bottom, so it never
 * scrolls away on any phone — small screens, tall screens, safe-area
 * notches included. It must NOT live inside a `.glass` ancestor:
 * backdrop-filter creates a containing block for fixed descendants,
 * which would pin the nav to the glass frame (100vh, taller than the
 * visible viewport while the browser URL bar is shown) instead of the
 * viewport. Chats + Hidden render it as a sibling of ScreenContainer
 * for exactly this reason.
 * The Activity unread badge is the same blue pill used in the chat
 * list, so it reads on the light glass.
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
        className="nav-glass fixed inset-x-4 z-50 mx-auto flex max-w-sm items-center justify-around rounded-full px-2 py-2 md:hidden"
        style={{ bottom: "max(16px, env(safe-area-inset-bottom, 0px))" }}
      >
        {/* Slow light sheen across the whole pill (first child, so it
            sits under the tab content). */}
        <span aria-hidden className="nav-sheen" />
        {TABS.map((tab) => {
          const active = isActiveTab(tab.href, pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className="pressable relative flex min-h-14 min-w-16 flex-col items-center justify-center gap-0.5 rounded-full px-3 py-1"
            >
              {active && (
                <motion.span
                  layoutId="bottomnav-active-pill"
                  className="nav-active-bubble absolute inset-0 rounded-full"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <span className="relative z-10 flex flex-col items-center gap-0.5">
                <tab.icon
                  size={22}
                  style={{ color: active ? "#FFFFFF" : "var(--color-gray-1)" }}
                  strokeWidth={active ? 2 : 1.8}
                />
                <span
                  className="text-caption font-medium"
                  style={{ color: active ? "#FFFFFF" : "var(--color-gray-1)" }}
                >
                  {tab.label}
                </span>
              </span>
              {tab.badge && unread > 0 && (
                <span className="absolute top-0 right-2 z-10 min-w-4 h-4 px-1 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: "var(--color-blue)" }}>
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
