"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Play, Pause } from "lucide-react";

interface VoiceMessagePlayerProps {
  url: string;
  isMine: boolean;
}

const BAR_COUNT = 40;
const SPEEDS = [1, 1.5, 2] as const;

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function extractPeaks(audioBuffer: AudioBuffer, barCount: number): number[] {
  const channelData = audioBuffer.getChannelData(0);
  const samplesPerBar = Math.floor(channelData.length / barCount);
  const peaks: number[] = [];

  for (let i = 0; i < barCount; i++) {
    const start = i * samplesPerBar;
    let max = 0;
    for (let j = 0; j < samplesPerBar; j++) {
      const abs = Math.abs(channelData[start + j] ?? 0);
      if (abs > max) max = abs;
    }
    peaks.push(max);
  }

  const globalMax = Math.max(...peaks, 0.01);
  return peaks.map((p) => Math.max(0.12, p / globalMax));
}

export function VoiceMessagePlayer({ url, isMine }: VoiceMessagePlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [peaks, setPeaks] = useState<number[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speedIndex, setSpeedIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const audio = new Audio(url);
    audio.preload = "metadata";
    audioRef.current = audio;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => { setPlaying(false); setCurrentTime(0); };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);

    (async () => {
      try {
        const res = await fetch(url);
        const arrayBuffer = await res.arrayBuffer();
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioCtx();
        const decoded = await ctx.decodeAudioData(arrayBuffer);
        if (!cancelled) {
          setPeaks(extractPeaks(decoded, BAR_COUNT));
          if (!duration) setDuration(decoded.duration);
        }
        ctx.close();
      } catch {
        if (!cancelled) setPeaks(new Array(BAR_COUNT).fill(0.4));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      audio.pause();
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play();
      setPlaying(true);
    }
  }, [playing]);

  const cycleSpeed = useCallback(() => {
    const next = (speedIndex + 1) % SPEEDS.length;
    setSpeedIndex(next);
    if (audioRef.current) audioRef.current.playbackRate = SPEEDS[next] ?? 1;
  }, [speedIndex]);

  const seekTo = useCallback((ratio: number) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    audio.currentTime = ratio * duration;
    setCurrentTime(audio.currentTime);
  }, [duration]);

  const progress = duration > 0 ? currentTime / duration : 0;
  const fg = isMine ? "white" : "var(--color-blue)";
  const bg = isMine ? "rgba(255,255,255,0.3)" : "var(--color-gray-3)";
  const trackColor = isMine ? "var(--color-blue)" : "var(--color-gray-2)";

  return (
    <div
      className="flex items-center gap-2.5 rounded-3xl px-3 py-2.5"
      style={{ background: trackColor, minWidth: 240 }}
    >
      <button
        onClick={togglePlay}
        disabled={loading}
        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform"
        style={{ background: isMine ? "rgba(255,255,255,0.25)" : "rgba(0,122,255,0.15)" }}
        aria-label={playing ? "Pause" : "Play"}
      >
        {loading ? (
          <div className="w-3.5 h-3.5 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(255,255,255,0.4)", borderTopColor: fg }} />
        ) : playing ? (
          <Pause size={16} color={fg} fill={fg} />
        ) : (
          <Play size={16} color={fg} fill={fg} style={{ marginLeft: 2 }} />
        )}
      </button>

      <button
        className="flex-1 flex items-center gap-[2px] h-8"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          seekTo((e.clientX - rect.left) / rect.width);
        }}
        aria-label="Seek"
      >
        {(peaks ?? new Array(BAR_COUNT).fill(0.3)).map((peak, i) => {
          const isPast = i / BAR_COUNT <= progress;
          return (
            <span
              key={i}
              className="flex-1 rounded-full transition-colors"
              style={{
                height: `${Math.max(peak * 26, 3)}px`,
                background: isPast ? fg : bg,
              }}
            />
          );
        })}
      </button>

      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <button
          onClick={cycleSpeed}
          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
          style={{ background: isMine ? "rgba(255,255,255,0.25)" : "rgba(0,122,255,0.15)", color: fg }}
        >
          {SPEEDS[speedIndex]}×
        </button>
        <span className="text-[11px] font-medium" style={{ color: isMine ? "rgba(255,255,255,0.85)" : "var(--color-gray-1)" }}>
          {formatTime(playing || currentTime > 0 ? currentTime : duration)}
        </span>
      </div>
    </div>
  );
}
