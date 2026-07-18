"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Loader2 } from "lucide-react";

interface ImageViewerProps {
  url: string;
  senderName: string;
  timestamp: string;
  caption?: string;
  onClose: () => void;
}

const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;
const DISMISS_THRESHOLD = 120;

export function ImageViewer({ url, senderName, timestamp, caption, onClose }: ImageViewerProps) {
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);

  const lastTapRef = useRef(0);
  const pinchStartDistRef = useRef(0);
  const pinchStartScaleRef = useRef(1);
  const panStartRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  useEffect(() => {
    // Trigger the open animation on next frame.
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 180);
  }, [onClose]);

  const distance = (touches: React.TouchList) => {
    const a = touches[0]!;
    const b = touches[1]!;
    return Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      pinchStartDistRef.current = distance(e.touches);
      pinchStartScaleRef.current = scale;
    } else if (e.touches.length === 1) {
      panStartRef.current = { x: e.touches[0]!.clientX, y: e.touches[0]!.clientY, tx: translate.x, ty: translate.y };
      setDragging(true);

      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        // Double tap
        if (scale > 1) {
          setScale(1);
          setTranslate({ x: 0, y: 0 });
        } else {
          setScale(DOUBLE_TAP_SCALE);
        }
      }
      lastTapRef.current = now;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const newDist = distance(e.touches);
      const ratio = newDist / (pinchStartDistRef.current || 1);
      setScale(Math.min(MAX_SCALE, Math.max(1, pinchStartScaleRef.current * ratio)));
    } else if (e.touches.length === 1 && dragging) {
      const dx = e.touches[0]!.clientX - panStartRef.current.x;
      const dy = e.touches[0]!.clientY - panStartRef.current.y;

      if (scale > 1) {
        setTranslate({ x: panStartRef.current.tx + dx, y: panStartRef.current.ty + dy });
      } else if (dy > 0) {
        setDragY(dy);
      }
    }
  };

  const handleTouchEnd = () => {
    setDragging(false);
    if (scale === 1 && dragY > DISMISS_THRESHOLD) {
      handleClose();
    } else {
      setDragY(0);
    }
  };

  const overlayOpacity = scale === 1 ? Math.max(0.3, 1 - dragY / 400) : 1;

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col"
      style={{
        background: `rgba(0,0,0,${overlayOpacity})`,
        opacity: visible ? 1 : 0,
        transition: dragging ? "none" : "opacity 180ms ease-out",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="flex items-center justify-between px-4 pt-6 pb-3 relative z-10">
        <div className="text-white">
          <div className="text-sm font-semibold">{senderName}</div>
          <div className="text-xs text-white/60">{timestamp}</div>
        </div>
        <button onClick={handleClose} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)" }} aria-label="Close">
          <X size={18} color="white" strokeWidth={2} />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center overflow-hidden">
        {!loaded && (
          <Loader2 size={32} color="white" className="animate-spin absolute" />
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt="Shared image"
          onLoad={() => setLoaded(true)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="select-none"
          style={{
            maxWidth: "90vw",
            maxHeight: "90vh",
            objectFit: "contain",
            opacity: loaded ? 1 : 0,
            transform: `scale(${visible ? scale : 0.85}) translate(${translate.x / scale}px, ${(translate.y + dragY) / scale}px)`,
            transition: dragging ? "none" : "transform 200ms ease-out, opacity 200ms ease-out",
            touchAction: "none",
          }}
          draggable={false}
        />
      </div>

      {caption && (
        <div className="px-6 pb-8 pt-3 text-center relative z-10">
          <p className="text-white text-sm">{caption}</p>
        </div>
      )}
    </div>
  );
}
