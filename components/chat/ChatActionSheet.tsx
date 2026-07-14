"use client";

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
          <ActionRow icon="pin" label={isPinned ? "Unpin Chat" : "Pin Chat"} onClick={wrap(onTogglePin)} />
          <ActionRow icon="mute" label={isMuted ? "Unmute" : "Mute"} onClick={wrap(onToggleMute)} />
          <ActionRow icon="read" label="Mark as Read" onClick={wrap(onMarkRead)} last />
        </div>

        <div className="rounded-2xl overflow-hidden mt-3" style={{ background: "var(--color-gray-2)" }}>
          <ActionRow icon="block" label="Block User" destructive onClick={wrap(onBlock)} />
          <ActionRow icon="delete" label="Delete Chat" destructive onClick={wrap(onDelete)} last />
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
  icon: "pin" | "mute" | "read" | "block" | "delete";
  label: string;
  onClick: () => void;
  destructive?: boolean;
  last?: boolean;
}

function ActionRow({ icon, label, onClick, destructive, last }: ActionRowProps) {
  const color = destructive ? "var(--color-red)" : "var(--color-black)";
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 bg-white active:opacity-70 transition-opacity ${last ? "" : "border-b"}`}
      style={{ borderColor: "var(--color-gray-2)" }}
    >
      <ActionIcon name={icon} color={color} />
      <span className="text-sm font-medium" style={{ color }}>{label}</span>
    </button>
  );
}

function ActionIcon({ name, color }: { name: ActionRowProps["icon"]; color: string }) {
  const c = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (name) {
    case "pin": return <svg {...c}><line x1="12" y1="17" x2="12" y2="22" /><path d="M5 17h14v-1.76a2 2 0 00-1.11-1.79l-1.78-.9A2 2 0 0115 10.76V6h1a2 2 0 000-4H8a2 2 0 000 4h1v4.76a2 2 0 01-1.11 1.79l-1.78.9A2 2 0 005 15.24V17z" /></svg>;
    case "mute": return <svg {...c}><path d="M11 5L6 9H2v6h4l5 4V5z" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></svg>;
    case "read": return <svg {...c}><path d="M1 5l3 3 4-7" transform="translate(4 6)" /><circle cx="12" cy="12" r="10" /></svg>;
    case "block": return <svg {...c}><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>;
    case "delete": return <svg {...c}><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>;
  }
}
