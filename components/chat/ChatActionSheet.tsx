/**
 * components/chat/ChatActionSheet.tsx
 * v1.5.0 — Delete and Block now confirm inside this sheet, in plain
 * words, instead of the browser's ugly window.confirm box. The sheet
 * stays calm: tap Delete → confirm step → tap Delete again to confirm.
 */
"use client";

import { useState } from "react";
import { Pin, PinOff, Bell, BellOff, CheckCheck, Ban, Trash2 } from "lucide-react";

interface ChatActionSheetProps {
  open: boolean;
  onClose: () => void;
  /** The other person's name, for the confirm copy. */
  chatName: string;
  isPinned: boolean;
  isMuted: boolean;
  onTogglePin: () => void;
  onToggleMute: () => void;
  onMarkRead: () => void;
  onDelete: () => void;
  onBlock: () => void;
}

export function ChatActionSheet({
  open,
  onClose,
  chatName,
  isPinned,
  isMuted,
  onTogglePin,
  onToggleMute,
  onMarkRead,
  onDelete,
  onBlock,
}: ChatActionSheetProps) {
  const [confirm, setConfirm] = useState<"delete" | "block" | null>(null);

  if (!open) return null;

  const close = () => {
    setConfirm(null);
    onClose();
  };

  const wrap = (fn: () => void) => () => {
    fn();
    close();
  };

  const confirmCopy =
    confirm === "delete"
      ? {
          title: `Delete chat with ${chatName}?`,
          body: "This only removes it from your side. The messages stay on their phone.",
          action: "Delete Chat",
          onConfirm: wrap(onDelete),
        }
      : {
          title: `Block ${chatName}?`,
          body: "They won't be able to message you anymore.",
          action: "Block",
          onConfirm: wrap(onBlock),
        };

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={close}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.4)" }} />
      <div
        className="glass-strong relative w-full rounded-t-3xl px-4 pt-3 pb-8 max-w-lg mx-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: "var(--color-gray-3)" }} />

        {confirm ? (
          <div className="glass rounded-2xl overflow-hidden px-5 py-5 text-center">
            <p className="text-title font-semibold mb-1.5">{confirmCopy.title}</p>
            <p className="text-body mb-5" style={{ color: "var(--color-gray-1)" }}>
              {confirmCopy.body}
            </p>
            <button
              onClick={confirmCopy.onConfirm}
              className="pressable w-full py-3 rounded-2xl text-body font-semibold text-white mb-2"
              style={{ background: "var(--color-red)" }}
            >
              {confirmCopy.action}
            </button>
            <button
              onClick={() => setConfirm(null)}
              className="pressable w-full py-3 rounded-2xl text-body font-semibold"
              style={{ color: "var(--color-blue)" }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <>
            <div className="glass rounded-2xl overflow-hidden">
              <ActionRow icon={isPinned ? PinOff : Pin} label={isPinned ? "Unpin Chat" : "Pin Chat"} onClick={wrap(onTogglePin)} />
              <ActionRow icon={isMuted ? Bell : BellOff} label={isMuted ? "Unmute" : "Mute"} onClick={wrap(onToggleMute)} />
              <ActionRow icon={CheckCheck} label="Mark as Read" onClick={wrap(onMarkRead)} last />
            </div>

            <div className="glass rounded-2xl overflow-hidden mt-3">
              <ActionRow icon={Ban} label="Block User" destructive onClick={() => setConfirm("block")} />
              <ActionRow icon={Trash2} label="Delete Chat" destructive onClick={() => setConfirm("delete")} last />
            </div>

            <button
              onClick={close}
              className="glass w-full py-3 mt-3 rounded-2xl text-body font-semibold"
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}

interface ActionRowProps {
  icon: import("lucide-react").LucideIcon;
  label: string;
  onClick: () => void;
  destructive?: boolean;
  last?: boolean;
}

function ActionRow({ icon: Icon, label, onClick, destructive, last }: ActionRowProps) {
  const color = destructive ? "var(--color-red)" : "var(--color-black)";
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-4 bg-white/50 hover:bg-white/70 active:opacity-70 transition-opacity ${last ? "" : "border-b"}`}
      style={{ borderColor: "var(--color-gray-2)" }}
    >
      <Icon size={19} color={color} strokeWidth={1.8} />
      <span className="text-body font-medium" style={{ color }}>{label}</span>
    </button>
  );
}
