"use client";

import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { getMediaUrl } from "@/services/media-service";
import { VoiceMessagePlayer } from "@/components/chat/VoiceMessagePlayer";
import { ImageViewer } from "@/components/chat/ImageViewer";
import { formatMessageTime } from "@/utils/helpers";

interface MediaContentProps {
  contentType: "image" | "file" | "voice";
  mediaPath: string;
  fileName: string;
  isMine: boolean;
  senderName: string;
  timestamp: string;
}

export function MediaContent({ contentType, mediaPath, fileName, isMine, senderName, timestamp }: MediaContentProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMediaUrl(mediaPath).then((u) => { if (!cancelled) setUrl(u); });
    return () => { cancelled = true; };
  }, [mediaPath]);

  if (!url) {
    return (
      <div
        className="rounded-[22px] flex items-center justify-center animate-pulse"
        style={{ background: isMine ? "rgba(255,255,255,0.15)" : "var(--color-gray-3)", width: 200, height: contentType === "image" ? 200 : 60 }}
      >
        <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(0,0,0,0.1)", borderTopColor: isMine ? "white" : "var(--color-blue)" }} />
      </div>
    );
  }

  if (contentType === "image") {
    return (
      <>
        <button
          onClick={() => setViewerOpen(true)}
          onTouchStart={() => setPressed(true)}
          onTouchEnd={() => setPressed(false)}
          className="block rounded-[22px] overflow-hidden relative"
          style={{
            boxShadow: "0 2px 10px rgba(0,0,0,0.12)",
            transform: pressed ? "scale(0.97)" : "scale(1)",
            transition: "transform 120ms ease-out",
          }}
        >
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center" style={{ background: "var(--color-gray-3)", width: 220, height: 220 }}>
              <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(0,0,0,0.1)", borderTopColor: "var(--color-blue)" }} />
            </div>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={fileName}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
            className="max-w-[240px] max-h-[300px] object-cover"
            style={{ opacity: imageLoaded ? 1 : 0, transition: "opacity 250ms ease-out" }}
          />
        </button>
        {viewerOpen && (
          <ImageViewer
            url={url}
            senderName={senderName}
            timestamp={timestamp}
            onClose={() => setViewerOpen(false)}
          />
        )}
      </>
    );
  }

  if (contentType === "voice") {
    return <VoiceMessagePlayer url={url} isMine={isMine} />;
  }

  // "file" — PDF, DOCX, ZIP, etc.
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-[22px] px-4 py-3 active:scale-[0.98] transition-transform"
      style={{ background: isMine ? "var(--color-blue)" : "var(--color-gray-2)", minWidth: 200, boxShadow: "0 2px 10px rgba(0,0,0,0.08)" }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: isMine ? "rgba(255,255,255,0.2)" : "rgba(0,122,255,0.15)" }}
      >
        <FileText size={18} color={isMine ? "white" : "var(--color-blue)"} strokeWidth={1.8} />
      </div>
      <span
        className="text-sm font-medium truncate"
        style={{ color: isMine ? "white" : "var(--color-black)" }}
      >
        {fileName}
      </span>
    </a>
  );
}
