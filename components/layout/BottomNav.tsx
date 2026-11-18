/**
 * components/layout/BottomNav.tsx
 * v1.6.1 — exactly FOUR tabs: Chats, Calls, Activity, Profile.
 * Search and New Chat left the nav; both now live in the Chats screen
 * header (mobile + desktop sidebar).
 *
 * v1.6.1 — PINNED + DARK LIQUID GLASS (from the user's reference
 * picture, "like Apple WhatsApp"). The nav is `fixed` to the viewport
 * bottom, so it never scrolls away on any phone — small screens, tall
 * screens, safe-area notches included. It must NOT live inside a
 * `.glass` ancestor: backdrop-filter creates a containing block for
 * fixed descendants, which would pin the nav to the glass frame
 * (100vh, taller than the visible viewport while the browser URL bar
 * is shown) instead of the viewport. Chats + Hidden render it as a
 * sibling of ScreenContainer for exactly this reason.
 *
 * The look, exactly like the picture: a dark near-black translucent
 * bar (blur + saturate, bright thin top edge), icons in white/grey.
 * The ACTIVE tab sits inside a BIGGER rounded glass bubble — a larger
 * capsule that bulges above and below the bar, lighter glass, bright
 * glowing edge, icon + label in white inside it — and the bubble
 * glides between tabs on a spring (framer-motion layoutId).
 * Inactive tabs stay plain small icons + grey labels on the dark bar.
 * The Activity unread badge is the same blue pill used in the chat
 * list, so it reads on the dark glass.
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
        className="nav-glass-dark fixed inset-x-4 z-50 mx-auto flex max-w-sm items-center justify-around rounded-full px-2 py-2 md:hidden"
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
                  className="nav-active-bubble absolute -inset-y-4 inset-x-0 rounded-full"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <span className="relative z-10 flex flex-col items-center gap-0.5">
                <tab.icon
                  size={22}
                  color={active ? "#FFFFFF" : "rgba(255,255,255,0.62)"}
                  strokeWidth={active ? 2 : 1.8}
                />
                <span
                  className="text-caption font-medium"
                  style={{ color: active ? "#FFFFFF" : "rgba(255,255,255,0.62)" }}
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
