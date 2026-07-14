/**
 * components/chat/MessageComposer.tsx
 */
"use client";

import { useState, useRef } from "react";
import { Paperclip, Smile, Send, Mic, Trash2 } from "lucide-react";
import { sendMediaMessage, MAX_MEDIA_BYTES } from "@/services/media-service";
import { chatCache } from "@/lib/storage";

interface MessageComposerProps {
  chatId: string;
  onSend: (text: string) => void;
  onTyping: () => void;
}

export function MessageComposer({ chatId, onSend, onTyping }: MessageComposerProps) {
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [error, setError] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText("");
    inputRef.current?.focus();
  };

  const handleAttachClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (file.size > MAX_MEDIA_BYTES) {
      setError("File must be smaller than 25MB.");
      setTimeout(() => setError(""), 3000);
      return;
    }

    setUploading(true);
    setError("");
    try {
      const sent = await sendMediaMessage({
        chatId,
        file,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
      });
      await chatCache.upsertMessage(chatId, sent);
    } catch {
      setError("Couldn't send file. Please try again.");
      setTimeout(() => setError(""), 3000);
    } finally {
      setUploading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setRecording(false);
        setRecordSeconds(0);

        if (blob.size === 0) return;

        setUploading(true);
        try {
          const sent = await sendMediaMessage({
            chatId,
            file: blob,
            fileName: `voice-note-${Date.now()}.webm`,
            mimeType: "audio/webm",
          });
          await chatCache.upsertMessage(chatId, sent);
        } catch {
          setError("Couldn't send voice note.");
          setTimeout(() => setError(""), 3000);
        } finally {
          setUploading(false);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setRecordSeconds(0);
      timerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    } catch {
      setError("Microphone access denied.");
      setTimeout(() => setError(""), 3000);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      chunksRef.current = [];
      mediaRecorderRef.current.stop();
    }
  };

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (recording) {
    return (
      <div className="px-3 py-2 border-t flex items-center gap-3" style={{ borderColor: "var(--color-gray-2)" }}>
        <button onClick={cancelRecording} aria-label="Cancel recording">
          <Trash2 size={20} color="var(--color-red)" strokeWidth={1.8} />
        </button>
        <div className="flex-1 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: "var(--color-red)" }} />
          <span className="text-sm font-medium">{formatDuration(recordSeconds)}</span>
          <span className="text-xs" style={{ color: "var(--color-gray-1)" }}>Recording…</span>
        </div>
        <button
          onClick={stopRecording}
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: "var(--color-blue)" }}
          aria-label="Send voice note"
        >
          <Send size={16} color="white" strokeWidth={2} />
        </button>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="px-4 py-1.5 text-xs text-center" style={{ color: "var(--color-red)", background: "rgba(255,59,48,0.08)" }}>
          {error}
        </div>
      )}
      <div className="px-3 py-2 border-t flex items-end gap-2" style={{ borderColor: "var(--color-gray-2)" }}>
        <button className="mb-1.5" onClick={handleAttachClick} aria-label="Attach file" disabled={uploading}>
          {uploading ? (
            <div className="w-[22px] h-[22px] rounded-full border-2 animate-spin" style={{ borderColor: "var(--color-gray-3)", borderTopColor: "var(--color-blue)" }} />
          ) : (
            <Paperclip size={22} color="var(--color-gray-1)" strokeWidth={1.8} />
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf,.doc,.docx,.zip,.rar,.txt,.csv,.xlsx"
          className="hidden"
          onChange={handleFileChange}
        />

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
            <Smile size={20} color="var(--color-gray-1)" strokeWidth={1.8} />
          </button>
        </div>

        {text ? (
          <button
            onClick={handleSend}
            className="w-10 h-10 rounded-full flex items-center justify-center mb-0.5"
            style={{ background: "var(--color-blue)" }}
            aria-label="Send"
          >
            <Send size={16} color="white" strokeWidth={2} />
          </button>
        ) : (
          <button className="mb-1.5" aria-label="Record voice note" onClick={startRecording}>
            <Mic size={22} color="var(--color-gray-1)" strokeWidth={1.8} />
          </button>
        )}
      </div>
    </div>
  );
}
