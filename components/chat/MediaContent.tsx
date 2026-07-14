"use client";

import { useEffect, useState } from "react";
import { getMediaUrl } from "@/services/media-service";

interface MediaContentProps {
  contentType: "image" | "file" | "voice";
  mediaPath: string;
  fileName: string;
  isMine: boolean;
}

export function MediaContent({ contentType, mediaPath, fileName, isMine }: MediaContentProps) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMediaUrl(mediaPath).then((u) => { if (!cancelled) setUrl(u); });
    return () => { cancelled = true; };
  }, [mediaPath]);

  if (!url) {
    return (
      <div
        className="rounded-2xl px-4 py-6 flex items-center justify-center"
        style={{ background: isMine ? "rgba(255,255,255,0.15)" : "var(--color-gray-3)", minWidth: 160 }}
      >
        <div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(0,0,0,0.15)", borderTopColor: isMine ? "white" : "var(--color-blue)" }} />
      </div>
    );
  }

  if (contentType === "image") {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block rounded-2xl overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={fileName} className="max-w-[220px] max-h-[280px] object-cover" />
      </a>
    );
  }

  if (contentType === "voice") {
    return (
      <div
        className="rounded-3xl px-3 py-2"
        style={{ background: isMine ? "var(--color-blue)" : "var(--color-gray-2)", minWidth: 220 }}
      >
        <audio controls src={url} className="w-full h-8" style={{ filter: isMine ? "invert(0)" : "none" }} />
      </div>
    );
  }

  // "file" — PDF, DOCX, ZIP, etc.
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-2xl px-4 py-3"
      style={{ background: isMine ? "var(--color-blue)" : "var(--color-gray-2)", minWidth: 200 }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: isMine ? "rgba(255,255,255,0.2)" : "rgba(0,122,255,0.15)" }}
      >
        <FileIcon color={isMine ? "white" : "var(--color-blue)"} />
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

function FileIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}
