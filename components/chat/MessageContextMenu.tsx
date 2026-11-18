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

import { useState, useRef, useLayoutEffect } from "react";
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
  /** Self-chat (Saved Messages): there is no other reader, so the
      "Seen by" section would always say "Not seen yet" — hide it. */
  showSeenBy?: boolean;
  /** v1.10.0 — where the user tapped (viewport coordinates), so the
      desktop menu opens beside the message. Without it the menu used
      to grow upward from the message's top edge and float over the
      message above it. */
  anchor?: { x: number; y: number } | null;
  onClose: () => void;
  onReact: (emoji: string) => void;
  onReply: () => void;
  onForward: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function MessageContextMenu({ isMine, text, readers, readersLoading = false, currentUserId, showSeenBy = true, anchor = null, onClose, onReact, onReply, onForward, onEdit, onDelete }: MessageContextMenuProps) {
  const [copied, setCopied] = useState(false);
  // v1.10.0 — desktop popover position, measured after mount so the
  // menu never runs off the bottom or the side of the screen. It
  // starts hidden at the tap point until measured — never flashed in
  // the wrong place.
  const popRef = useRef<HTMLDivElement>(null);
  const [popPos, setPopPos] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const el = popRef.current;
    if (!el || !anchor) return;
    const W = 320;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // Open on the bubble's side of the tap: my messages open left of
    // the tap, theirs open right — the menu stays beside the message
    // instead of covering it. Clamped 8px inside every edge.
    let left = isMine ? anchor.x - W : anchor.x;
    left = Math.max(8, Math.min(left, vw - W - 8));
    let top = anchor.y;
    const h = el.offsetHeight;
    if (top + h > vh - 12) top = Math.max(12, vh - h - 12);
    setPopPos({ left, top });
  }, [anchor, isMine, readers, readersLoading]);

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

  // v1.9.0 — the body is shared by the phone bottom sheet and the
  // desktop popover. On desktop the old sheet stretched across half
  // the screen with the reaction emojis ~400px apart; the popover is
  // a compact 320px menu anchored to the message.
  const body = (
    <>
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
            in the reader's local time. Hidden in a self-chat (Saved
            Messages): there is no other reader, so it would always
            say "Not seen yet". */}
        {showSeenBy && (
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
        )}

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
    </>
  );

  return (
    <>
      {/* Phone: the bottom sheet (unchanged). */}
      <div className="fixed inset-0 z-50 md:hidden" style={{ background: "rgba(0,0,0,0.3)" }} onClick={onClose}>
        <div
          className="glass-strong absolute left-4 right-4 bottom-20 rounded-3xl overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {body}
        </div>
      </div>

      {/* Desktop: a compact popover beside the message, at the tap
          point and clamped inside the viewport (v1.10.0 — the old
          `absolute bottom-full` menu grew upward and floated over the
          message above the one you tapped). Fixed positioning is safe
          here: the menu's ancestors carry no transform/filter, and the
          backdrop below already relies on `fixed` from this exact spot. */}
      <div className="hidden md:block fixed inset-0 z-40" onClick={onClose} />
      <div
        ref={popRef}
        className="hidden md:block fixed z-50 w-[320px] glass-strong rounded-3xl overflow-hidden shadow-2xl"
        style={
          popPos
            ? { left: popPos.left, top: popPos.top }
            : { left: anchor?.x ?? 0, top: anchor?.y ?? 0, visibility: "hidden" }
        }
      >
        {body}
      </div>
    </>
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
