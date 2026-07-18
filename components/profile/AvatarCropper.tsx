"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Check, ZoomIn } from "lucide-react";

interface AvatarCropperProps {
  imageSrc: string;
  onCropped: (blob: Blob) => void;
  onCancel: () => void;
}

const VIEWPORT_SIZE = 280;
const OUTPUT_SIZE = 500;
const MAX_ZOOM_MULTIPLIER = 3;

export function AvatarCropper({ imageSrc, onCropped, onCancel }: AvatarCropperProps) {
  const [coverScale, setCoverScale] = useState(1);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);
  const [exporting, setExporting] = useState(false);

  const imgRef = useRef<HTMLImageElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const dragging = useRef(false);

  const clampTranslate = useCallback((tx: number, ty: number, currentScale: number, natW: number, natH: number) => {
    const displayedW = natW * currentScale;
    const displayedH = natH * currentScale;
    const maxX = Math.max(0, (displayedW - VIEWPORT_SIZE) / 2);
    const maxY = Math.max(0, (displayedH - VIEWPORT_SIZE) / 2);
    return { x: Math.min(maxX, Math.max(-maxX, tx)), y: Math.min(maxY, Math.max(-maxY, ty)) };
  }, []);

  const handleImageLoad = () => {
    const img = imgRef.current;
    if (!img) return;
    const natW = img.naturalWidth;
    const natH = img.naturalHeight;
    const cover = Math.max(VIEWPORT_SIZE / natW, VIEWPORT_SIZE / natH);
    setCoverScale(cover);
    setScale(cover);
    setTranslate({ x: 0, y: 0 });
    setReady(true);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY, tx: translate.x, ty: translate.y };
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragging.current || !imgRef.current) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      const clamped = clampTranslate(
        dragStartRef.current.tx + dx,
        dragStartRef.current.ty + dy,
        scale,
        imgRef.current.naturalWidth,
        imgRef.current.naturalHeight
      );
      setTranslate(clamped);
    };
    const onUp = () => { dragging.current = false; };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [scale, clampTranslate]);

  const handleZoomChange = (value: number) => {
    const img = imgRef.current;
    if (!img) return;
    const nextScale = coverScale * value;
    setScale(nextScale);
    setTranslate((t) => clampTranslate(t.x, t.y, nextScale, img.naturalWidth, img.naturalHeight));
  };

  const handleUsePhoto = async () => {
    const img = imgRef.current;
    if (!img) return;
    setExporting(true);

    const displayedW = img.naturalWidth * scale;
    const displayedH = img.naturalHeight * scale;
    const visibleLeft = (displayedW - VIEWPORT_SIZE) / 2 - translate.x;
    const visibleTop = (displayedH - VIEWPORT_SIZE) / 2 - translate.y;
    const sourceX = visibleLeft / scale;
    const sourceY = visibleTop / scale;
    const sourceSize = VIEWPORT_SIZE / scale;

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) { setExporting(false); return; }

    ctx.drawImage(img, sourceX, sourceY, sourceSize, sourceSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    canvas.toBlob(
      (blob) => {
        setExporting(false);
        if (blob) onCropped(blob);
      },
      "image/jpeg",
      0.9
    );
  };

  return (
    <div className="fixed inset-0 z-[150] flex flex-col items-center justify-center" style={{ background: "rgba(0,0,0,0.85)" }}>
      <div className="flex items-center justify-between w-full max-w-sm px-5 mb-4">
        <button onClick={onCancel} className="text-white text-sm font-medium flex items-center gap-1">
          <X size={18} strokeWidth={2} /> Cancel
        </button>
        <span className="text-white text-sm font-semibold">Move and Scale</span>
        <button
          onClick={handleUsePhoto}
          disabled={!ready || exporting}
          className="text-sm font-semibold flex items-center gap-1 disabled:opacity-50"
          style={{ color: "var(--color-blue)" }}
        >
          {exporting ? "..." : <><Check size={18} strokeWidth={2.2} /> Use</>}
        </button>
      </div>

      <div
        className="relative rounded-full overflow-hidden touch-none select-none"
        style={{ width: VIEWPORT_SIZE, height: VIEWPORT_SIZE, boxShadow: "0 0 0 9999px rgba(0,0,0,0.85)" }}
        onPointerDown={handlePointerDown}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={imageSrc}
          alt="Crop preview"
          onLoad={handleImageLoad}
          draggable={false}
          className="absolute top-1/2 left-1/2 max-w-none"
          style={{
            transform: `translate(-50%, -50%) translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transformOrigin: "center",
          }}
        />
      </div>

      {ready && (
        <div className="w-full max-w-sm px-8 mt-6 flex items-center gap-3">
          <ZoomIn size={16} color="white" strokeWidth={1.8} />
          <input
            type="range"
            min={1}
            max={MAX_ZOOM_MULTIPLIER}
            step={0.01}
            defaultValue={1}
            onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
            className="flex-1"
          />
        </div>
      )}
    </div>
  );
}
