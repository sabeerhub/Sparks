/**
 * components/chat/ImageViewer.tsx
 * v1.5.0 — WhatsApp-standard image viewer, mobile and PC.
 *
 * Black full-screen backdrop, image centred and fitted. Top bar: sender
 * name + real message time (+ "n of m" when there are several images),
 * close X. Bottom bar: the file name as caption, plus Download and Share
 * — only actions that actually work (Share only appears where the
 * device can share). Mobile: swipe down to dismiss, swipe left/right
 * to move to the next/previous photo, pinch to zoom, double-tap to
 * zoom, tap to hide/show the bars. PC: Esc to close, click outside to
 * close, arrow keys / on-screen arrows to move between images. Nothing
 * extra, nothing dead.
 */
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Download, Share2, ChevronLeft, ChevronRight, Loader2, Check } from "lucide-react";
import { getMediaUrl } from "@/services/media-service";

export interface ViewerImage {
  /** Storage path (resolved to a signed URL on demand). */
  path: string;
  /** Already-resolved signed URL, when the opener has one. */
  url?: string;
  senderName: string;
  timestamp: string;
  /** File name — shown as the caption (it is the message's real text). */
  fileName: string;
}

interface ImageViewerProps {
  images: ViewerImage[];
  index: number;
  onClose: () => void;
}

const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;
const DISMISS_THRESHOLD = 120;
const SWIPE_THRESHOLD = 80;

export function ImageViewer({ images, index: startIndex, onClose }: ImageViewerProps) {
  const [visible, setVisible] = useState(false);
  const [idx, setIdx] = useState(startIndex);
  const [currentUrl, setCurrentUrl] = useState<string | null>(images[startIndex]?.url ?? null);
  const [loaded, setLoaded] = useState(false);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [dragY, setDragY] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [savedNote, setSavedNote] = useState("");
  const [sharedNote, setSharedNote] = useState("");

  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const gestureRef = useRef({
    startX: 0,
    startY: 0,
    startTime: 0,
    moved: 0,
    pinchStartDist: 0,
    pinchStartScale: 1,
    panStart: { x: 0, y: 0 },
    scale: 1,
    translate: { x: 0, y: 0 },
    // Latest drag offsets (the ref is always current; state can lag a
    // frame behind during a fast swipe, which is when we read them).
    dragX: 0,
    dragY: 0,
  });
  const lastTapRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const urlCacheRef = useRef(new Map<number, string>());
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const current = images[idx];
  const hasMultiple = images.length > 1;

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    // Lock body scroll while the viewer is open.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 180);
  }, [onClose]);

  // Resolve the signed URL for the current image (cached per index).
  useEffect(() => {
    let cancelled = false;
    const item = images[idx];
    if (!item) return;
    const cached = urlCacheRef.current.get(idx) ?? item.url;
    if (cached) {
      setCurrentUrl(cached);
      return;
    }
    setLoaded(false);
    setCurrentUrl(null);
    getMediaUrl(item.path)
      .then((u) => {
        if (cancelled) return;
        if (!u) {
          setCurrentUrl(null);
          return;
        }
        urlCacheRef.current.set(idx, u);
        setCurrentUrl(u);
      })
      .catch(() => {
        if (!cancelled) setCurrentUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [idx, images]);

  const goTo = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(images.length - 1, next));
      if (clamped === idx) return;
      setIdx(clamped);
      setScale(1);
      gestureRef.current.scale = 1;
      setTranslate({ x: 0, y: 0 });
      gestureRef.current.translate = { x: 0, y: 0 };
      setDragY(0);
      setDragX(0);
      setLoaded(false);
      setChromeVisible(true);
    },
    [idx, images.length]
  );

  // PC: Esc closes, arrow keys move between images.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
      if (e.key === "ArrowLeft") goTo(idx - 1);
      if (e.key === "ArrowRight") goTo(idx + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleClose, goTo, idx]);

  const resetGesture = () => {
    pointersRef.current.clear();
    setDragY(0);
    setDragX(0);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLImageElement>) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gestureRef.current;
    if (pointersRef.current.size === 2) {
      const pts = [...pointersRef.current.values()];
      const a = pts[0]!;
      const b = pts[1]!;
      g.pinchStartDist = Math.hypot(b.x - a.x, b.y - a.y);
      g.pinchStartScale = g.scale;
      if (tapTimerRef.current) {
        clearTimeout(tapTimerRef.current);
        tapTimerRef.current = null;
      }
    } else if (pointersRef.current.size === 1) {
      g.startX = e.clientX;
      g.startY = e.clientY;
      g.startTime = Date.now();
      g.moved = 0;
      g.panStart = { ...g.translate };
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLImageElement>) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gestureRef.current;

    if (pointersRef.current.size === 2) {
      const pts = [...pointersRef.current.values()];
      const a = pts[0]!;
      const b = pts[1]!;
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      const next = Math.min(MAX_SCALE, Math.max(1, g.pinchStartScale * (dist / (g.pinchStartDist || 1))));
      g.scale = next;
      setScale(next);
      if (next === 1) {
        g.translate = { x: 0, y: 0 };
        setTranslate({ x: 0, y: 0 });
      }
      return;
    }

    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    g.moved = Math.max(g.moved, Math.abs(dx), Math.abs(dy));

    if (g.scale > 1) {
      const limit = 260 * g.scale;
      const next = {
        x: Math.max(-limit, Math.min(limit, g.panStart.x + dx)),
        y: Math.max(-limit, Math.min(limit, g.panStart.y + dy)),
      };
      g.translate = next;
      setTranslate(next);
    } else if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal swipe: the photo follows the finger; on release it
      // slides to the next / previous photo (or snaps back).
      g.dragX = dx;
      g.dragY = 0;
      setDragX(dx);
      setDragY(0);
    } else if (dy > 0) {
      // Vertical swipe down: the photo follows the finger; on release
      // past the threshold it dismisses.
      g.dragX = 0;
      g.dragY = dy;
      setDragY(dy);
      setDragX(0);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLImageElement>) => {
    const g = gestureRef.current;
    const wasTap = g.moved < 10 && Date.now() - g.startTime < 350;
    const pointersLeft = pointersRef.current.size;
    pointersRef.current.delete(e.pointerId);

    if (pointersRef.current.size > 0) return; // still pinching

    if (wasTap && pointersLeft === 1) {
      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        // Double tap: toggle zoom.
        if (tapTimerRef.current) {
          clearTimeout(tapTimerRef.current);
          tapTimerRef.current = null;
        }
        lastTapRef.current = 0;
        if (g.scale > 1) {
          g.scale = 1;
          setScale(1);
          g.translate = { x: 0, y: 0 };
          setTranslate({ x: 0, y: 0 });
        } else {
          g.scale = DOUBLE_TAP_SCALE;
          setScale(DOUBLE_TAP_SCALE);
        }
      } else {
        lastTapRef.current = now;
        // Single tap: toggle the top/bottom bars (after the double-tap window).
        tapTimerRef.current = setTimeout(() => setChromeVisible((v) => !v), 280);
      }
    } else if (g.scale === 1 && g.dragY > DISMISS_THRESHOLD) {
      handleClose();
    } else if (g.scale === 1 && Math.abs(g.dragX) > SWIPE_THRESHOLD) {
      // Swipe left: next photo. Swipe right: previous photo. At either
      // end goTo clamps, so the photo just snaps back.
      goTo(idx + (g.dragX < 0 ? 1 : -1));
    }
    if (g.scale === 1) {
      g.dragX = 0;
      g.dragY = 0;
      setDragY(0);
      setDragX(0);
    }
  };

  const handleDownload = async () => {
    if (!currentUrl || !current || downloading) return;
    setDownloading(true);
    try {
      const res = await fetch(currentUrl);
      if (!res.ok) throw new Error("fetch failed");
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = current.fileName || "image";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
      setSavedNote("Saved");
      setTimeout(() => setSavedNote(""), 2000);
    } catch {
      // If the direct download is blocked, open the image so it can still be saved.
      window.open(currentUrl, "_blank", "noopener");
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!currentUrl || !current || !navigator.share) return;
    try {
      await navigator.share({ url: currentUrl, title: current.fileName || "Sparks image" });
    } catch (err) {
      // User cancelled the share sheet — not an error. Anything else: copy the link.
      if ((err as Error)?.name !== "AbortError") {
        try {
          await navigator.clipboard.writeText(currentUrl);
          setSharedNote("Link copied");
          setTimeout(() => setSharedNote(""), 2000);
        } catch {
          /* clipboard unavailable — nothing more to do */
        }
      }
    }
  };

  const overlayOpacity = scale === 1 ? Math.max(0.25, 1 - dragY / 420) : 1;

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col"
      style={{
        background: `rgba(0,0,0,${overlayOpacity})`,
        opacity: visible ? 1 : 0,
        transition: "opacity 180ms ease-out",
      }}
      onClick={(e) => {
        // Click outside the image (and outside any button) closes — WhatsApp behaviour.
        if ((e.target as HTMLElement).closest("img, button")) return;
        handleClose();
      }}
    >
      {/* Top bar: sender + time (+ position), close. */}
      <div
        className="flex items-center justify-between px-4 pt-5 pb-3 relative z-10 transition-opacity duration-200"
        style={{ opacity: chromeVisible ? 1 : 0, pointerEvents: chromeVisible ? "auto" : "none" }}
      >
        <div className="text-white min-w-0">
          <div className="text-body font-semibold truncate">{current?.senderName}</div>
          <div className="text-caption text-white/60">
            {current?.timestamp}
            {hasMultiple && ` · ${idx + 1} of ${images.length}`}
          </div>
        </div>
        <button
          onClick={handleClose}
          className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform"
          style={{ background: "rgba(255,255,255,0.15)" }}
          aria-label="Close"
        >
          <X size={20} color="white" strokeWidth={2} />
        </button>
      </div>

      {/* Centre: the image. v1.9.0 — the image now scales to the
          viewport (was max 100vw / its natural size, so a 720px
          photo sat small in a 1919px black frame). The frame is
          92vw × 86vh and the image fills it with contain, so a small
          photo grows and a big one still fits. Prev/Next sit next to
          the image, not at the far screen edges. */}
      <div className="flex-1 flex items-center justify-center overflow-hidden relative min-h-0">
        <div className="relative flex items-center justify-center" style={{ width: "min(92vw, 1400px)", height: "min(86vh, 1000px)" }}>
          {!loaded && (
            <Loader2 size={32} color="white" className="animate-spin absolute" />
          )}
          {currentUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentUrl}
              alt={current?.fileName || "Shared image"}
              onLoad={() => setLoaded(true)}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={() => resetGesture()}
              className="select-none"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                opacity: loaded ? 1 : 0,
                transform: `scale(${visible ? scale : 0.92}) translate(${(translate.x + dragX) / scale}px, ${(translate.y + dragY) / scale}px)`,
                transition: "transform 200ms ease-out, opacity 200ms ease-out",
                touchAction: "none",
                cursor: scale > 1 ? "grab" : "default",
              }}
              draggable={false}
            />
          )}
          {/* PC arrows: move between images in this chat. */}
          {hasMultiple && (
            <>
              <button
                onClick={() => goTo(idx - 1)}
                disabled={idx === 0}
                aria-label="Previous image"
                className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full items-center justify-center disabled:opacity-30 active:scale-95 transition-all"
                style={{ background: "rgba(255,255,255,0.15)" }}
              >
                <ChevronLeft size={22} color="white" strokeWidth={2} />
              </button>
              <button
                onClick={() => goTo(idx + 1)}
                disabled={idx === images.length - 1}
                aria-label="Next image"
                className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full items-center justify-center disabled:opacity-30 active:scale-95 transition-all"
                style={{ background: "rgba(255,255,255,0.15)" }}
              >
                <ChevronRight size={22} color="white" strokeWidth={2} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Bottom bar: caption + real actions. */}
      <div
        className="px-5 pb-7 pt-3 relative z-10 transition-opacity duration-200"
        style={{ opacity: chromeVisible ? 1 : 0, pointerEvents: chromeVisible ? "auto" : "none" }}
      >
        {current?.fileName && (
          <p className="text-white text-body text-center truncate mb-3">{current.fileName}</p>
        )}
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={handleDownload}
            disabled={downloading || !currentUrl}
            aria-label="Download image"
            className="flex flex-col items-center gap-1 active:scale-95 transition-transform disabled:opacity-50"
          >
            {savedNote ? (
              <Check size={22} color="white" strokeWidth={2} />
            ) : (
              <Download size={22} color="white" strokeWidth={2} />
            )}
            <span className="text-caption text-white/80">{savedNote || "Save"}</span>
          </button>
          {canShare && (
            <button
              onClick={handleShare}
              aria-label="Share image"
              className="flex flex-col items-center gap-1 active:scale-95 transition-transform"
            >
              <Share2 size={22} color="white" strokeWidth={2} />
              <span className="text-caption text-white/80">{sharedNote || "Share"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
