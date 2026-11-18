"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle, Bell, User, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { getUnreadCount } from "@/services/notification-service";
import { useChatStore } from "@/store/chat-store";
import { chatCache } from "@/lib/storage";

const supabase = createClient();

/**
 * v1.3.0 — exactly FOUR tabs, mirroring the mobile pill: Chats, Calls,
 * Activity, Profile. Search and New Chat left the rail; both now live in
 * the Chats screen header (desktop sidebar). The rail is glass, and its
 * top mark is a plain clean blue dot — the wordmark lives in the
 * sidebar header, and there is no bolt anywhere.
 */
const TABS = [
  { href: "/chats", icon: MessageCircle, label: "Chats", badge: "chats" as const },
  { href: "/calls", icon: Phone, label: "Calls" },
  { href: "/activity", icon: Bell, label: "Activity", badge: "notifs" as const },
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
  // v1.9.0 — the Chats badge is the REAL chat unread total (from the
  // receipt-backed chat list), not the notifications table: unread
  // messages existed with no badge anywhere because this rail never
  // showed one on Chats. The list hydrates from the local cache so
  // the badge is real on every screen, not only after opening Chats.
  const chatUnread = useChatStore((s) => s.chatList.reduce((n, c) => n + (c.unreadCount ?? 0), 0));

  useEffect(() => {
    chatCache.hydrateChatList().then((cached) => {
      if (cached?.length) useChatStore.getState().setChatList(cached as never);
    }).catch(() => {});
  }, []);

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
      className="glass hidden md:flex md:flex-col md:items-center md:w-[88px] flex-shrink-0 py-6 gap-1"
      style={{ borderLeft: "none", borderTop: "none", borderBottom: "none", borderRadius: 0 }}
    >
      <Link href="/chats" aria-label="Sparks home" className="pressable glass w-9 h-9 rounded-xl flex items-center justify-center mb-4">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--color-blue)" }} />
      </Link>

      {TABS.map(({ href, icon: Icon, label, badge }) => {
        const active = isActiveTab(href, pathname);
        const count = badge === "chats" ? chatUnread : badge === "notifs" ? unread : 0;
        return (
          <Link
            key={href}
            href={href}
            className="pressable relative w-[72px] py-2 rounded-2xl flex flex-col items-center justify-center gap-1 transition-colors"
            style={{ background: active ? "rgba(0,122,255,0.12)" : "transparent" }}
            aria-label={label}
            aria-current={active ? "page" : undefined}
            title={label}
          >
            <span className="relative">
              <Icon size={22} color={active ? "var(--color-blue)" : "var(--color-gray-1)"} strokeWidth={active ? 2 : 1.8} />
              {count > 0 && (
                <span className="absolute -top-1.5 -right-2.5 min-w-4 h-4 px-1 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: "var(--color-blue)" }}>
                  {count > 9 ? "9+" : count}
                </span>
              )}
            </span>
            <span
              className="text-[11px] leading-none font-medium"
              style={{ color: active ? "var(--color-blue)" : "var(--color-gray-1)" }}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
