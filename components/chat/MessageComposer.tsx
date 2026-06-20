/**
 * components/chat/MessageComposer.tsx
 */
"use client";

import { useState, useRef } from "react";

interface MessageComposerProps {
  onSend: (text: string) => void;
  onTyping: () => void;
  onAttach?: () => void;
}

export function MessageComposer({ onSend, onTyping, onAttach }: MessageComposerProps) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText("");
    inputRef.current?.focus();
  };

  return (
    <div className="px-3 py-2 border-t flex items-end gap-2" style={{ borderColor: "var(--color-gray-2)" }}>
      <button className="mb-1.5" onClick={onAttach} aria-label="Attach file">
        <AttachIcon />
      </button>

      <div
        className="flex-1 flex items-end rounded-3xl border px-3 py-2"
        style={{ borderColor: "var(--color-gray-3)", background: "var(--color-gray-2)" }}
      >
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            onTyping();
          }}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Message..."
          className="flex-1 outline-none text-sm bg-transparent"
          style={{ color: "var(--color-black)" }}
        />
        <button className="ml-2" aria-label="Emoji">
          <EmojiIcon />
        </button>
      </div>

      {text ? (
        <button
          onClick={handleSend}
          className="w-10 h-10 rounded-full flex items-center justify-center mb-0.5"
          style={{ background: "var(--color-blue)" }}
          aria-label="Send"
        >
          <SendIcon />
        </button>
      ) : (
        <button className="mb-1.5" aria-label="Record voice note">
          <MicIcon />
        </button>
      )}
    </div>
  );
}

function AttachIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-gray-1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
    </svg>
  );
}
function EmojiIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-gray-1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="M8 13s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  );
}
function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}
function MicIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-gray-1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" />
    </svg>
  );
}
