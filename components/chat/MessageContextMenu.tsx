/**
 * components/chat/MessageContextMenu.tsx
 * v1.5.1 — every row does what it says. Copy really copies (with a
 * "Copied" tick so you know it worked). Forward is back — v1.5.0 removed
 * it because no forward flow existed; v1.5.1 built the real flow
 * (ForwardSheet), so the row is honest again. The "➕" emoji is gone —
 * it used to set your reaction to a plus sign. Six real reactions remain.
 * v1.8.3 — a "Seen by" section at the top: who has read this message
 * and when, from the real receipt rows (only 'read' counts, never
 * invented). "Not seen yet" when nobody has read it.
 */
"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { formatSeenTime } from "@/utils/helpers";
import type { MessageReader } from "@/services/message-service";

const EMOJIS = ["❤️", "👍", "😂", "😮", "😢", "🙏"];

interface MessageContextMenuProps {
  isMine: boolean;
  /** The message's text, so Copy has something real to copy. */
  text: string;
  /** Who has read this message, loaded when the menu opens — null while loading. */
  readers?: MessageReader[] | null;
  readersLoading?: boolean;
  /** The current user's id, so their own read shows as "You". */
  currentUserId?: string | null;
  onClose: () => void;
  onReact: (emoji: string) => void;
  onReply: () => void;
  onForward: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function MessageContextMenu({ isMine, text, readers, readersLoading = false, currentUserId, onClose, onReact, onReply, onForward, onEdit, onDelete }: MessageContextMenuProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(onClose, 700);
    } catch {
      onClose();
    }
  };

  const actions = [
    { icon: ReplyIcon, label: "Reply", onClick: onReply },
    { icon: ForwardIcon, label: "Forward", onClick: onForward },
    { icon: copied ? CheckIcon : CopyIcon, label: copied ? "Copied" : "Copy", onClick: handleCopy },
    ...(isMine ? [{ icon: EditIcon, label: "Edit", onClick: onEdit }] : []),
    ...(isMine ? [{ icon: TrashIcon, label: "Delete", onClick: onDelete, danger: true }] : []),
  ];

  return (
    <div className="fixed inset-0 z-50" style={{ background: "rgba(0,0,0,0.3)" }} onClick={onClose}>
      <div
        className="glass-strong absolute left-4 right-4 bottom-20 rounded-3xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--color-gray-2)" }}>
          {EMOJIS.map((emoji) => (
            <button key={emoji} className="text-title active:scale-125 transition-transform" onClick={() => onReact(emoji)} aria-label={`React with ${emoji}`}>
              {emoji}
            </button>
          ))}
        </div>

        {/* Seen by — who has read this message, and when. Only 'read'
            receipts count, so this never invents a reader or a time;
            the time is the receipt's updated_at, written by markRead
            in the reader's local time. */}
        <div className="px-4 py-3 border-b" style={{ borderColor: "var(--color-gray-2)" }}>
          <div className="text-caption font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--color-gray-1)" }}>
            Seen by
          </div>
          {readersLoading ? (
            <div className="text-body" style={{ color: "var(--color-gray-1)" }}>Loading…</div>
          ) : readers && readers.length > 0 ? (
            <div className="space-y-2.5">
              {readers.map((r) => (
                <div key={r.userId} className="flex items-center gap-2.5">
                  <Avatar name={r.name} src={r.avatarUrl} size={28} />
                  <span className="flex-1 min-w-0 text-body font-medium truncate" style={{ color: "var(--color-black)" }}>
                    {r.userId === currentUserId ? "You" : r.name}
                  </span>
                  <span className="text-caption flex-shrink-0" style={{ color: "var(--color-gray-1)" }}>
                    {formatSeenTime(r.readAt)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-body" style={{ color: "var(--color-gray-1)" }}>Not seen yet</div>
          )}
        </div>

        {actions.map((action) => (
          <button
            key={action.label}
            className="w-full flex items-center justify-between px-4 py-4 border-b last:border-0 active:bg-white/40 transition-colors"
            style={{ borderColor: "var(--color-gray-2)" }}
            onClick={action.onClick}
          >
            <span className="text-body font-medium" style={{ color: action.danger ? "var(--color-red)" : "var(--color-black)" }}>
              {action.label}
            </span>
            <action.icon color={action.danger ? "var(--color-red)" : "var(--color-gray-1)"} />
          </button>
        ))}

        <button className="w-full py-4 text-body font-semibold text-center active:opacity-60 transition-opacity" style={{ color: "var(--color-blue)" }} onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function iconProps(color: string) {
  return { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
}

function ReplyIcon({ color }: { color: string }) {
  return <svg {...iconProps(color)}><polyline points="9 17 4 12 9 7" /><path d="M20 18v-2a4 4 0 00-4-4H4" /></svg>;
}
function ForwardIcon({ color }: { color: string }) {
  return <svg {...iconProps(color)}><polyline points="15 17 20 12 15 7" /><path d="M4 18v-2a4 4 0 014-4h12" /></svg>;
}
function CopyIcon({ color }: { color: string }) {
  return <svg {...iconProps(color)}><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>;
}
function CheckIcon({ color }: { color: string }) {
  return <svg {...iconProps(color)}><polyline points="20 6 9 17 4 12" /></svg>;
}
function EditIcon({ color }: { color: string }) {
  return <svg {...iconProps(color)}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>;
}
function TrashIcon({ color }: { color: string }) {
  return <svg {...iconProps(color)}><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /></svg>;
}
