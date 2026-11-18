/**
 * components/chat/MessageContextMenu.tsx
 * v1.5.0 — every row does what it says. Copy really copies (with a
 * "Copied" tick so you know it worked). There is no Forward row: no
 * forward flow exists, and a button that only closes the menu is fake.
 * The "➕" emoji is gone too — it used to set your reaction to a plus
 * sign. Six real reactions remain.
 */
"use client";

import { useState } from "react";

const EMOJIS = ["❤️", "👍", "😂", "😮", "😢", "🙏"];

interface MessageContextMenuProps {
  isMine: boolean;
  /** The message's text, so Copy has something real to copy. */
  text: string;
  onClose: () => void;
  onReact: (emoji: string) => void;
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function MessageContextMenu({ isMine, text, onClose, onReact, onReply, onEdit, onDelete }: MessageContextMenuProps) {
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
