"use client";

import { useState } from "react";

interface ShareProfileSheetProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  username: string;
}

export function ShareProfileSheet({ open, onClose, userId, username }: ShareProfileSheetProps) {
  const [copied, setCopied] = useState(false);
  if (!open) return null;

  const profileUrl = typeof window !== "undefined"
    ? `${window.location.origin}/profile/${userId}`
    : `/profile/${userId}`;

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${encodeURIComponent(profileUrl)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API unavailable — copied state just won't show, no crash.
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `@${username} on Spark Chat`, url: profileUrl });
      } catch {
        // User cancelled the share sheet — not an error.
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.4)" }} />
      <div
        className="relative w-full bg-white rounded-t-3xl px-5 pt-3 pb-8 max-w-lg mx-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: "var(--color-gray-3)" }} />

        <h2 className="text-base font-semibold text-center mb-1">Share Profile</h2>
        <p className="text-sm text-center mb-5" style={{ color: "var(--color-gray-1)" }}>
          @{username}
        </p>

        <div className="flex justify-center mb-5">
          <div className="p-3 rounded-2xl" style={{ background: "var(--color-gray-2)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrUrl} alt="Profile QR code" width={220} height={220} className="rounded-lg" />
          </div>
        </div>

        <div
          className="flex items-center justify-between gap-2 px-4 py-3 rounded-2xl mb-3"
          style={{ background: "var(--color-gray-2)" }}
        >
          <span className="text-xs truncate" style={{ color: "var(--color-gray-1)" }}>{profileUrl}</span>
          <button onClick={handleCopy} className="text-xs font-semibold flex-shrink-0" style={{ color: "var(--color-blue)" }}>
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>

        <button
          onClick={handleShare}
          className="w-full py-3 rounded-2xl text-sm font-semibold text-white"
          style={{ background: "var(--color-blue)" }}
        >
          Share Profile Link
        </button>

        <button
          onClick={onClose}
          className="w-full py-3 mt-2 rounded-2xl text-sm font-semibold"
          style={{ color: "var(--color-gray-1)" }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
