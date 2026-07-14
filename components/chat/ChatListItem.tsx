/**
 * components/chat/ChatListItem.tsx
 */
"use client";

import { useRef } from "react";
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
      className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors"
    >
      <Avatar name={item.otherUser.full_name} src={item.otherUser.avatar_url} size={48} online={item.isOnline} badge={item.unreadCount || null} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-sm truncate" style={{ color: "var(--color-black)" }}>
            {item.otherUser.full_name}
            {item.isPinned && <PinGlyph />}
          </span>
          <span className="text-xs flex-shrink-0" style={{ color: "var(--color-gray-1)" }}>
            {formatChatListTime(item.lastMessageAt)}
          </span>
        </div>
        <span className="text-sm truncate block" style={{ color: "var(--color-gray-1)" }}>
          {item.isMuted && "🔇 "}
          {truncatePreview(item.lastMessagePreview || "Encrypted message")}
        </span>
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
