/**
 * components/chat/MessageBubble.tsx
 * v1.5.1 — forwarded messages show an honest "Forwarded" label (only
 * when the row is actually flagged forwarded — see migration 0007), and
 * in-thread search can highlight the query and ring the current match.
 * Everything from v1.5.0 stays: quote strips, inline edit, real
 * reaction pills, generous spacing.
 */
"use client";

import { useState } from "react";
import type { DecryptedMessage, MessageReaction } from "@/types";
import { formatMessageTime, truncatePreview } from "@/utils/helpers";
import { MessageContextMenu } from "./MessageContextMenu";
import { MediaContent } from "./MediaContent";
import type { ViewerImage } from "./ImageViewer";

export interface ReplyQuote {
  senderName: string;
  text: string;
}

/** Renders `text` with every case-insensitive match of `query` tinted. */
function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const lower = text.toLowerCase();
  const needle = query.trim().toLowerCase();
  const parts: { text: string; match: boolean }[] = [];
  let from = 0;
  let at = lower.indexOf(needle, from);
  while (at !== -1) {
    if (at > from) parts.push({ text: text.slice(from, at), match: false });
    parts.push({ text: text.slice(at, at + needle.length), match: true });
    from = at + needle.length;
    at = lower.indexOf(needle, from);
  }
  if (from < text.length) parts.push({ text: text.slice(from), match: false });
  return (
    <>
      {parts.map((p, i) =>
        p.match ? (
          <span key={i} style={{ background: "rgba(0,122,255,0.25)", borderRadius: 3, padding: "0 1px" }}>
            {p.text}
          </span>
        ) : (
          <span key={i}>{p.text}</span>
        )
      )}
    </>
  );
}

interface MessageBubbleProps {
  senderName: string;
  message: DecryptedMessage;
  isMine: boolean;
  onEdit: (newText: string) => void;
  onDelete: () => void;
  onReact: (emoji: string) => void;
  onRemoveReaction: () => void;
  onReply: () => void;
  onForward: () => void;
  /** The message this one replies to, if any — shown as a quote strip. */
  replyTo?: ReplyQuote | null;
  /** All reactions on this message (persisted server-side). */
  reactions?: MessageReaction[];
  /** The current user's id, so we know which reaction is theirs. */
  currentUserId?: string | null;
  /** All images in this chat, for prev/next in the viewer. */
  viewerImages?: ViewerImage[];
  /** This message's image position inside viewerImages. */
  viewerIndex?: number;
  /** In-thread search: the query to highlight inside this bubble. */
  highlight?: string;
  /** In-thread search: true when this is the match the user is on. */
  isSearchMatch?: boolean;
}

export function MessageBubble({
  message,
  isMine,
  senderName,
  onEdit,
  onDelete,
  onReact,
  onRemoveReaction,
  onReply,
  onForward,
  replyTo,
  reactions = [],
  currentUserId,
  viewerImages,
  viewerIndex = 0,
  highlight = "",
  isSearchMatch = false,
}: MessageBubbleProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.text);

  if (message.deleted_at) {
    return (
      <div className={`flex ${isMine ? "justify-end" : "justify-start"} mb-2`}>
        <div
          className="glass rounded-3xl px-4 py-2.5 text-body italic"
          style={{ color: "var(--color-gray-1)" }}
        >
          This message was deleted
        </div>
      </div>
    );
  }

  const isMedia = message.content_type !== "text" && !!message.media_url;
  // Group reactions by emoji so two people reacting the same way show as one pill with a count.
  const grouped = reactions.reduce<Record<string, { count: number; mine: boolean }>>((acc, r) => {
    const entry = acc[r.emoji] ?? { count: 0, mine: false };
    entry.count += 1;
    if (r.user_id === currentUserId) entry.mine = true;
    acc[r.emoji] = entry;
    return acc;
  }, {});

  const saveEdit = () => {
    const next = draft.trim();
    setEditing(false);
    if (next && next !== message.text) onEdit(next);
    else setDraft(message.text);
  };

  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"} mb-2 relative`}>
      <div
        className="max-w-[78%] sm:max-w-md"
        style={
          isSearchMatch
            ? { outline: "2px solid var(--color-blue)", outlineOffset: 4, borderRadius: 24 }
            : undefined
        }
      >
        {message.is_forwarded && (
          <div className={`flex items-center gap-1 mb-1 px-1 ${isMine ? "justify-end" : "justify-start"}`}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-gray-1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 17 20 12 15 7" />
              <path d="M4 18v-2a4 4 0 014-4h12" />
            </svg>
            <span className="text-caption italic" style={{ color: "var(--color-gray-1)" }}>
              Forwarded
            </span>
          </div>
        )}
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
              senderName={senderName}
              timestamp={formatMessageTime(message.created_at)}
              viewerImages={viewerImages}
              viewerIndex={viewerIndex}
            />
          ) : editing ? (
            <div
              className="rounded-[24px] px-4 py-3"
              style={{
                background: isMine ? "var(--color-blue)" : "var(--color-bubble-theirs)",
                border: isMine ? "none" : "1px solid var(--color-glass-edge)",
                borderBottomRightRadius: isMine ? 4 : 24,
                borderBottomLeftRadius: isMine ? 24 : 4,
              }}
            >
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    saveEdit();
                  }
                  if (e.key === "Escape") {
                    setDraft(message.text);
                    setEditing(false);
                  }
                }}
                rows={2}
                autoFocus
                aria-label="Edit message"
                className="w-full bg-transparent outline-none resize-none text-body"
                style={{ color: isMine ? "#fff" : "var(--color-black)" }}
              />
              <div className="flex items-center justify-end gap-3 mt-2">
                <button
                  onClick={() => {
                    setDraft(message.text);
                    setEditing(false);
                  }}
                  className="text-caption font-semibold"
                  style={{ color: isMine ? "rgba(255,255,255,0.8)" : "var(--color-gray-1)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  className="text-caption font-semibold"
                  style={{ color: isMine ? "#fff" : "var(--color-blue)" }}
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <button
              className="pressable text-body text-left w-full shadow-sm"
              style={{
                background: isMine ? "var(--color-blue)" : "var(--color-bubble-theirs)",
                backdropFilter: isMine ? undefined : "blur(12px) saturate(160%)",
                WebkitBackdropFilter: isMine ? undefined : "blur(12px) saturate(160%)",
                border: isMine ? "none" : "1px solid var(--color-glass-edge)",
                boxShadow: isMine ? undefined : "inset 0 1px 0 var(--color-glass-edge), 0 2px 8px rgba(29,29,31,0.05)",
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
              {replyTo && (
                <span className="flex gap-2 mb-1.5 py-0.5 text-left">
                  {/* Straight edge, no curves: a thin bar on its own,
                      not a border following a rounded corner — the old
                      border-left + rounded-md drew a stray curved line
                      on the left edge of the strip. */}
                  <span
                    className="w-[2.5px] rounded-full flex-shrink-0 self-stretch"
                    style={{ background: isMine ? "rgba(255,255,255,0.7)" : "var(--color-blue)" }}
                  />
                  <span className="min-w-0">
                    <span
                      className="block text-caption font-semibold truncate"
                      style={{ color: isMine ? "#fff" : "var(--color-blue)" }}
                    >
                      {replyTo.senderName}
                    </span>
                    <span
                      className="block text-caption truncate"
                      style={{ color: isMine ? "rgba(255,255,255,0.75)" : "var(--color-gray-1)" }}
                    >
                      {truncatePreview(replyTo.text, 60)}
                    </span>
                  </span>
                </span>
              )}
              {message.text ? <HighlightedText text={message.text} query={highlight} /> : message.text}
            </button>
          )}
        </div>

        {Object.keys(grouped).length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1.5 ${isMine ? "justify-end" : "justify-start"}`}>
            {Object.entries(grouped).map(([emoji, info]) => (
              <button
                key={emoji}
                onClick={() => {
                  if (info.mine) onRemoveReaction();
                  else onReact(emoji);
                }}
                aria-label={info.mine ? `Remove your ${emoji} reaction` : `React with ${emoji}`}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption font-medium"
                style={{
                  background: info.mine ? "rgba(0,122,255,0.12)" : "var(--color-bubble-theirs)",
                  border: info.mine
                    ? "1px solid rgba(0,122,255,0.35)"
                    : "1px solid var(--color-glass-edge)",
                  boxShadow: "0 1px 4px rgba(29,29,31,0.06)",
                  color: "var(--color-black)",
                }}
              >
                {emoji}
                {info.count > 1 && <span>{info.count}</span>}
              </button>
            ))}
          </div>
        )}

        <div className={`flex items-center gap-1 mt-1 ${isMine ? "justify-end" : "justify-start"}`}>
          {message.edited_at && (
            <span className="text-caption" style={{ color: "var(--color-gray-1)" }}>
              edited ·
            </span>
          )}
          <span className="text-caption" style={{ color: "var(--color-gray-1)" }}>
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
          text={message.text}
          onClose={() => setMenuOpen(false)}
          onReact={(emoji) => {
            onReact(emoji);
            setMenuOpen(false);
          }}
          onReply={() => {
            onReply();
            setMenuOpen(false);
          }}
          onForward={() => {
            onForward();
            setMenuOpen(false);
          }}
          onEdit={() => {
            setDraft(message.text);
            setEditing(true);
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
