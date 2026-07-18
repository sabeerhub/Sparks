/**
 * components/chat/MessageComposer.tsx
 */
"use client";

import { useState, useRef, useEffect } from "react";
import { Paperclip, Smile, Send, Mic, Trash2, Lock, ChevronLeft } from "lucide-react";
import { sendMediaMessage, MAX_MEDIA_BYTES } from "@/services/media-service";
import { chatCache } from "@/lib/storage";

interface MessageComposerProps {
  chatId: string;
  onSend: (text: string) => void;
  onTyping: () => void;
}

const LOCK_THRESHOLD = 80;
const CANCEL_THRESHOLD = 100;
const WAVEFORM_BARS = 28;

export function MessageComposer({ chatId, onSend, onTyping }: MessageComposerProps) {
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [locked, setLocked] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [dragY, setDragY] = useState(0);
  const [liveLevels, setLiveLevels] = useState<number[]>([]);
  const [error, setError] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pointerStartRef = useRef({ x: 0, y: 0 });
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const lockedRef = useRef(false);
  const cancelledRef = useRef(false);
  const recordingRef = useRef(false);
  const dragXRef = useRef(0);

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

  const startLiveWaveform = (stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;

      const data = new Uint8Array(analyser.frequencyBinCount);
      let lastSample = 0;

      const loop = (time: number) => {
        if (!analyserRef.current) return;
        if (time - lastSample > 90) {
          lastSample = time;
          analyserRef.current.getByteFrequencyData(data);
          const avg = data.reduce((sum, v) => sum + v, 0) / data.length;
          setLiveLevels((prev) => {
            const next = [...prev, Math.max(0.08, avg / 255)];
            return next.length > WAVEFORM_BARS ? next.slice(next.length - WAVEFORM_BARS) : next;
          });
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch {
      // Waveform is purely visual — recording still works without it.
    }
  };

  const stopLiveWaveform = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    analyserRef.current = null;
    setLiveLevels([]);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      cancelledRef.current = false;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        stopLiveWaveform();
        if (timerRef.current) clearInterval(timerRef.current);
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setRecording(false);
        recordingRef.current = false;
        setLocked(false);
        lockedRef.current = false;
        setRecordSeconds(0);
        setDragX(0);
        dragXRef.current = 0;
        setDragY(0);

        if (cancelledRef.current) return;

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
      startLiveWaveform(stream);
      setRecording(true);
      recordingRef.current = true;
      setRecordSeconds(0);
      timerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    } catch {
      setError("Microphone access denied.");
      setTimeout(() => setError(""), 3000);
    }
  };

  const stopRecording = () => mediaRecorderRef.current?.stop();

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      cancelledRef.current = true;
      mediaRecorderRef.current.stop();
    }
  };

  const handleMicPointerDown = (e: React.PointerEvent) => {
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    startRecording();
  };

  // Tracked on `window`, not the mic button — the button unmounts the
  // instant `recording` becomes true (replaced by the floating recording
  // bar), so listeners attached to it stop receiving events mid-gesture.
  // Window-level listeners keep tracking the same physical pointer
  // regardless of what re-renders underneath it.
  useEffect(() => {
    if (!recording) return;

    const onMove = (e: PointerEvent) => {
      if (lockedRef.current) return;
      const dx = Math.min(0, e.clientX - pointerStartRef.current.x);
      const dy = Math.min(0, e.clientY - pointerStartRef.current.y);
      dragXRef.current = dx;
      setDragX(dx);
      setDragY(dy);

      if (dy <= -LOCK_THRESHOLD) {
        lockedRef.current = true;
        setLocked(true);
        setDragX(0);
        dragXRef.current = 0;
        setDragY(0);
      }
    };

    const onUp = () => {
      if (lockedRef.current) return; // locked: stays recording until Send/Delete tapped
      if (dragXRef.current <= -CANCEL_THRESHOLD) {
        cancelRecording();
      } else {
        stopRecording();
      }
      setDragX(0);
      dragXRef.current = 0;
      setDragY(0);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording]);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const cancelOpacity = Math.max(0, 1 - Math.abs(dragX) / CANCEL_THRESHOLD);
  const lockProgress = Math.min(1, Math.abs(dragY) / LOCK_THRESHOLD);

  if (recording) {
    return (
      <div className="relative px-3 py-2 border-t" style={{ borderColor: "var(--color-gray-2)" }}>
        {!locked && (
          <div
            className="absolute right-6 flex flex-col items-center gap-1"
            style={{
              bottom: `calc(100% + ${8 + lockProgress * 24}px)`,
              opacity: 1 - lockProgress * 0.3,
              transition: dragY === 0 ? "bottom 200ms ease-out" : "none",
            }}
          >
            <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "var(--color-gray-2)" }}>
              <Lock size={16} color="var(--color-blue)" strokeWidth={2} />
            </div>
          </div>
        )}

        <div
          className="flex items-center gap-3"
          style={{ transform: `translateX(${locked ? 0 : dragX}px)`, transition: dragX === 0 ? "transform 200ms ease-out" : "none" }}
        >
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: "var(--color-red)" }} />
          <span className="text-sm font-medium flex-shrink-0">{formatDuration(recordSeconds)}</span>

          <div className="flex-1 flex items-center gap-[2px] h-8 overflow-hidden">
            {liveLevels.map((level, i) => (
              <span
                key={i}
                className="flex-1 rounded-full flex-shrink-0"
                style={{ height: `${Math.max(level * 26, 3)}px`, background: "var(--color-red)", opacity: 0.4 + level * 0.6 }}
              />
            ))}
          </div>

          {!locked && (
            <span className="text-xs flex items-center gap-1 flex-shrink-0" style={{ color: "var(--color-gray-1)", opacity: cancelOpacity }}>
              <ChevronLeft size={14} strokeWidth={2} /> Slide to cancel
            </span>
          )}
        </div>

        {locked && (
          <div className="flex items-center justify-end gap-3 mt-2">
            <button onClick={cancelRecording} aria-label="Delete recording">
              <Trash2 size={20} color="var(--color-red)" strokeWidth={1.8} />
            </button>
            <button
              onClick={stopRecording}
              className="w-11 h-11 rounded-full flex items-center justify-center"
              style={{ background: "var(--color-blue)" }}
              aria-label="Send voice note"
            >
              <Send size={17} color="white" strokeWidth={2} />
            </button>
          </div>
        )}
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
          <button
            className="mb-1.5 active:scale-110 transition-transform touch-none"
            aria-label="Record voice note"
            onPointerDown={handleMicPointerDown}
          >
            <Mic size={22} color="var(--color-gray-1)" strokeWidth={1.8} />
          </button>
        )}
      </div>
    </div>
  );
}
