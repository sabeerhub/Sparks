/**
 * components/chat/ChatListItem.tsx
 */
"use client";

import { useRef } from "react";
import { VolumeX } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { formatChatListTime, truncatePreview } from "@/utils/helpers";
import type { ChatListItem as ChatListItemType } from "@/types";

interface ChatListItemProps {
  item: ChatListItemType;
  onClick: () => void;
  onLongPress: () => void;
}

export function ChatListItem({ item, onClick, onLongPress }: ChatListItemProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firedRef = useRef(false);

  const startPress = () => {
    firedRef.current = false;
    timerRef.current = setTimeout(() => {
      firedRef.current = true;
      onLongPress();
    }, 450);
  };

  const endPress = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const handleClick = () => {
    if (firedRef.current) return; // long-press already handled this interaction
    onClick();
  };

  return (
    <button
      onClick={handleClick}
      onTouchStart={startPress}
      onTouchEnd={endPress}
      onTouchMove={endPress}
      onMouseDown={startPress}
      onMouseUp={endPress}
      onMouseLeave={endPress}
      onContextMenu={(e) => { e.preventDefault(); onLongPress(); }}
      className="glass-row w-full flex items-center gap-3.5 px-4 py-4 min-h-[76px] text-left rounded-2xl active:scale-[0.99] transition-all duration-200"
    >
      <Avatar name={item.otherUser.full_name} src={item.otherUser.avatar_url} size={52} online={item.isOnline} />
      <div className="flex-1 min-w-0">
        <span className="text-body truncate block" style={{ color: "var(--color-black)", fontWeight: item.unreadCount ? 700 : 600 }}>
          {item.otherUser.full_name}
          {item.isPinned && <PinGlyph />}
        </span>
        <span className="text-body truncate flex items-center gap-1.5" style={{ color: item.unreadCount ? "var(--color-black)" : "var(--color-gray-1)", fontWeight: item.unreadCount ? 500 : 400 }}>
          {item.isMuted && <VolumeX size={13} color="var(--color-gray-1)" strokeWidth={2} className="flex-shrink-0" />}
          <span className="truncate">{truncatePreview(item.lastMessagePreview || "No messages yet")}</span>
        </span>
      </div>
      {/* WhatsApp place for the unread count: far right of the row, under
          the time — never on top of the profile picture. */}
      <div className="flex flex-col items-end justify-between self-stretch py-0.5 flex-shrink-0">
        <span className="text-caption" style={{ color: "var(--color-gray-1)" }}>
          {formatChatListTime(item.lastMessageAt)}
        </span>
        {item.unreadCount > 0 && (
          <span
            className="min-w-5 h-5 rounded-full flex items-center justify-center text-white font-bold px-1.5 text-[11px]"
            style={{ background: "var(--color-blue)" }}
          >
            {item.unreadCount > 99 ? "99+" : item.unreadCount}
          </span>
        )}
      </div>
    </button>
  );
}

function PinGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--color-gray-1)" className="inline ml-1 -mt-2">
      <path d="M12 17v5M5 17h14v-1.76a2 2 0 00-1.11-1.79l-1.78-.9A2 2 0 0115 10.76V6h1a2 2 0 000-4H8a2 2 0 000 4h1v4.76a2 2 0 01-1.11 1.79l-1.78.9A2 2 0 005 15.24V17z" />
    </svg>
  );
}
