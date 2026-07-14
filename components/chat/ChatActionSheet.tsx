"use client";

import { Pin, PinOff, Bell, BellOff, CheckCheck, Ban, Trash2 } from "lucide-react";

interface ChatActionSheetProps {
  open: boolean;
  onClose: () => void;
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
  isPinned,
  isMuted,
  onTogglePin,
  onToggleMute,
  onMarkRead,
  onDelete,
  onBlock,
}: ChatActionSheetProps) {
  if (!open) return null;

  const wrap = (fn: () => void) => () => {
    fn();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.4)" }} />
      <div
        className="relative w-full bg-white rounded-t-3xl px-4 pt-3 pb-8 max-w-lg mx-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: "var(--color-gray-3)" }} />

        <div className="rounded-2xl overflow-hidden" style={{ background: "var(--color-gray-2)" }}>
          <ActionRow icon={isPinned ? PinOff : Pin} label={isPinned ? "Unpin Chat" : "Pin Chat"} onClick={wrap(onTogglePin)} />
          <ActionRow icon={isMuted ? Bell : BellOff} label={isMuted ? "Unmute" : "Mute"} onClick={wrap(onToggleMute)} />
          <ActionRow icon={CheckCheck} label="Mark as Read" onClick={wrap(onMarkRead)} last />
        </div>

        <div className="rounded-2xl overflow-hidden mt-3" style={{ background: "var(--color-gray-2)" }}>
          <ActionRow icon={Ban} label="Block User" destructive onClick={wrap(onBlock)} />
          <ActionRow icon={Trash2} label="Delete Chat" destructive onClick={wrap(onDelete)} last />
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 mt-3 rounded-2xl text-sm font-semibold"
          style={{ background: "var(--color-gray-2)" }}
        >
          Cancel
        </button>
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
      className={`w-full flex items-center gap-3 px-4 py-3.5 bg-white active:opacity-70 transition-opacity ${last ? "" : "border-b"}`}
      style={{ borderColor: "var(--color-gray-2)" }}
    >
      <Icon size={19} color={color} strokeWidth={1.8} />
      <span className="text-sm font-medium" style={{ color }}>{label}</span>
    </button>
  );
}
