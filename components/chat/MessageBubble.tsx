/**
 * components/chat/MessageBubble.tsx
 */
"use client";

import { useState } from "react";
import type { DecryptedMessage } from "@/types";
import { formatMessageTime } from "@/utils/helpers";
import { MessageContextMenu } from "./MessageContextMenu";
import { MediaContent } from "./MediaContent";

interface MessageBubbleProps {
  message: DecryptedMessage;
  isMine: boolean;
  onEdit: (newText: string) => void;
  onDelete: () => void;
  onReact: (emoji: string) => void;
  onReply: () => void;
  reaction?: string;
}

export function MessageBubble({ message, isMine, onEdit, onDelete, onReact, onReply, reaction }: MessageBubbleProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  if (message.deleted_at) {
    return (
      <div className={`flex ${isMine ? "justify-end" : "justify-start"} mb-1`}>
        <div
          className="rounded-3xl px-4 py-2.5 text-sm italic"
          style={{ background: "var(--color-gray-2)", color: "var(--color-gray-1)" }}
        >
          This message was deleted
        </div>
      </div>
    );
  }

  const isMedia = message.content_type !== "text" && !!message.media_url;

  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"} mb-1 relative`}>
      <div className="max-w-xs">
        <div
          onContextMenu={(e) => {
            e.preventDefault();
            setMenuOpen(true);
          }}
          onDoubleClick={() => setMenuOpen(true)}
        >
          {isMedia ? (
            <MediaContent
              contentType={message.content_type as "image" | "file" | "voice"}
              mediaPath={message.media_url as string}
              fileName={message.text || "File"}
              isMine={isMine}
            />
          ) : (
            <button
              className="text-sm text-left w-full"
              style={{
                background: isMine ? "var(--color-blue)" : "var(--color-gray-2)",
                color: isMine ? "#fff" : "var(--color-black)",
                paddingLeft: "var(--bubble-pad-x)",
                paddingRight: "var(--bubble-pad-x)",
                paddingTop: "var(--bubble-pad-y)",
                paddingBottom: "var(--bubble-pad-y)",
                borderRadius: "var(--bubble-radius)",
                borderBottomRightRadius: isMine ? 4 : "var(--bubble-radius)",
                borderBottomLeftRadius: isMine ? "var(--bubble-radius)" : 4,
                opacity: message.status === "pending" ? 0.6 : 1,
              }}
            >
              {message.text}
            </button>
          )}
        </div>

        {reaction && <div className="text-base mt-0.5 ml-1">{reaction}</div>}

        <div className={`flex items-center gap-1 mt-0.5 ${isMine ? "justify-end" : "justify-start"}`}>
          {message.edited_at && (
            <span className="text-xs" style={{ color: "var(--color-gray-1)" }}>
              edited ·
            </span>
          )}
          <span className="text-xs" style={{ color: "var(--color-gray-1)" }}>
            {message.status === "pending" ? "Sending…" : message.status === "failed" ? "Failed to send" : formatMessageTime(message.created_at)}
          </span>
          {isMine && message.status !== "pending" && message.status !== "failed" && (
            <StatusTicks status={message.status} />
          )}
        </div>
      </div>

      {menuOpen && (
        <MessageContextMenu
          isMine={isMine}
          onClose={() => setMenuOpen(false)}
          onReact={(emoji) => {
            onReact(emoji);
            setMenuOpen(false);
          }}
          onReply={() => {
            onReply();
            setMenuOpen(false);
          }}
          onEdit={() => {
            const next = window.prompt("Edit message", message.text);
            if (next != null && next.trim() && next !== message.text) onEdit(next.trim());
            setMenuOpen(false);
          }}
          onDelete={() => {
            onDelete();
            setMenuOpen(false);
          }}
        />
      )}
    </div>
  );
}

function StatusTicks({ status }: { status: DecryptedMessage["status"] }) {
  const color = status === "read" ? "var(--color-blue)" : "var(--color-gray-1)";
  const showSecondTick = status === "delivered" || status === "read";
  return (
    <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
      <path d="M1 5l3 3 4-7" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      {showSecondTick && (
        <path d="M6 5l3 3 4-7" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}
