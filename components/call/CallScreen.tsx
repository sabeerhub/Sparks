"use client";

import { useEffect, useRef } from "react";
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Volume2, VolumeX, SwitchCamera } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import type { CallPhase } from "@/hooks/useCall";
import type { CallType } from "@/services/call-service";

interface CallScreenProps {
  phase: CallPhase;
  callType: CallType;
  otherUserName: string;
  otherUserAvatar: string | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  muted: boolean;
  cameraOff: boolean;
  speakerOn: boolean;
  callDurationSec: number;
  error: string | null;
  reconnecting: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onHangUp: () => void;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onSwitchCamera: () => void;
  onToggleSpeaker: () => void;
}

function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Speaker volume (honest): browsers expose no earpiece-routing API, so the
 * speaker toggle switches remote volume between loudspeaker level (1.0)
 * and earpiece level (0.35) — applied here to the remote audio element
 * for voice calls and the remote video element for video calls.
 */
const SPEAKER_VOLUME = 1.0;
const EARPIECE_VOLUME = 0.35;

export function CallScreen({
  phase,
  callType,
  otherUserName,
  otherUserAvatar,
  localStream,
  remoteStream,
  muted,
  cameraOff,
  speakerOn,
  callDurationSec,
  error,
  reconnecting,
  onAccept,
  onDecline,
  onHangUp,
  onToggleMute,
  onToggleCamera,
  onSwitchCamera,
  onToggleSpeaker,
}: CallScreenProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    if (callType === "video" && remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
    if (callType === "voice" && remoteAudioRef.current) remoteAudioRef.current.srcObject = remoteStream;
  }, [remoteStream, callType]);

  useEffect(() => {
    const volume = speakerOn ? SPEAKER_VOLUME : EARPIECE_VOLUME;
    if (remoteAudioRef.current) remoteAudioRef.current.volume = volume;
    if (remoteVideoRef.current) remoteVideoRef.current.volume = volume;
  }, [speakerOn, remoteStream, callType]);

  if (phase === "idle") return null;

  const isVideo = callType === "video";
  const isRinging = phase === "incoming-ringing" || phase === "outgoing-ringing";
  const isActive = phase === "active";
  const remoteVideoVisible = isVideo && isActive && remoteStream && !reconnecting;

  const statusLabel = reconnecting
    ? "Reconnecting…"
    : phase === "incoming-ringing"
      ? `Incoming ${isVideo ? "video" : "voice"} call…`
      : phase === "outgoing-ringing"
        ? "Ringing…"
        : phase === "connecting"
          ? "Connecting…"
          : isActive
            ? formatDuration(callDurationSec)
            : "";

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col"
      style={{ background: remoteVideoVisible ? "#000" : "#1D1D1F" }}
    >
      {isVideo && (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: remoteVideoVisible ? 1 : 0 }}
        />
      )}
      {!isVideo && <audio ref={remoteAudioRef} autoPlay />}

      <div
        className="absolute inset-0"
        style={{ background: remoteVideoVisible ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.55)" }}
      />

      {/* Header — name + status, safe-area aware */}
      <div
        className="relative z-10 flex flex-col items-center px-6"
        style={{ paddingTop: "max(64px, env(safe-area-inset-top, 0px))" }}
      >
        {(!isVideo || !isActive || !remoteStream) && (
          <div className={`mb-5 ${isRinging ? "animate-call-ring" : ""}`}>
            <Avatar name={otherUserName} src={otherUserAvatar} size={112} />
          </div>
        )}
        <h1 className="text-white text-title font-semibold text-center tracking-tight">{otherUserName}</h1>
        <p className="text-white/70 text-body mt-1 text-center">{error ?? statusLabel}</p>
        {isVideo && isActive && !remoteStream && (
          <p className="text-white/50 text-body mt-2">Waiting for video…</p>
        )}
      </div>

      {/* Local preview — avatar placeholder when the camera is off */}
      {isVideo && (
        <div
          className="absolute top-6 right-5 z-20 w-24 h-32 rounded-2xl overflow-hidden border border-white/30"
          style={{ top: "max(24px, env(safe-area-inset-top, 0px))", background: "rgba(255,255,255,0.12)" }}
        >
          {cameraOff || !localStream ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 px-2">
              <Avatar name="You" src={null} size={40} />
              <span className="text-white/80 text-caption font-medium text-center">Camera off</span>
            </div>
          ) : (
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          )}
        </div>
      )}

      <div className="flex-1" />

      {/* Frosted-glass control bar */}
      <div
        className="relative z-10 mx-4 mb-4 rounded-[28px] px-4 pt-5"
        style={{
          background: "rgba(255,255,255,0.12)",
          backdropFilter: "blur(24px) saturate(1.4)",
          WebkitBackdropFilter: "blur(24px) saturate(1.4)",
          paddingBottom: "max(20px, env(safe-area-inset-bottom, 0px))",
        }}
      >
        {isRinging && phase === "incoming-ringing" ? (
          <div className="flex items-center justify-center gap-16 pb-1">
            <button onClick={onDecline} className="flex flex-col items-center gap-2 active:scale-95 transition-transform duration-200" aria-label="Decline call">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "#FF3B30" }}>
                <PhoneOff size={26} color="white" strokeWidth={2} />
              </div>
              <span className="text-white text-caption font-medium">Decline</span>
            </button>
            <button onClick={onAccept} className="flex flex-col items-center gap-2 active:scale-95 transition-transform duration-200" aria-label="Accept call">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "#34C759" }}>
                <Phone size={26} color="white" strokeWidth={2} />
              </div>
              <span className="text-white text-caption font-medium">Accept</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-5">
            <div className="flex items-center justify-center gap-4">
              <CallControlButton active={muted} onClick={onToggleMute} icon={muted ? MicOff : Mic} label={muted ? "Unmute" : "Mute"} />
              {isVideo && (
                <CallControlButton active={cameraOff} onClick={onToggleCamera} icon={cameraOff ? VideoOff : Video} label="Camera" />
              )}
              {isVideo && (
                <CallControlButton active={false} onClick={onSwitchCamera} icon={SwitchCamera} label="Flip" />
              )}
              <CallControlButton active={!speakerOn} onClick={onToggleSpeaker} icon={speakerOn ? Volume2 : VolumeX} label="Speaker" />
            </div>
            <button
              onClick={onHangUp}
              aria-label="End call"
              className="w-[72px] h-[72px] rounded-full flex items-center justify-center active:scale-95 transition-transform duration-200"
              style={{ background: "#FF3B30", boxShadow: "0 8px 24px rgba(255,59,48,0.45)" }}
            >
              <PhoneOff size={30} color="white" strokeWidth={2} />
            </button>
            <span className="text-white/60 text-caption font-medium pb-1">End call</span>
          </div>
        )}
      </div>
    </div>
  );
}

function CallControlButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: import("lucide-react").LucideIcon;
  label: string;
}) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-2 active:scale-95 transition-transform duration-200" aria-label={label}>
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center"
        style={{ background: active ? "white" : "rgba(255,255,255,0.2)" }}
      >
        <Icon size={22} color={active ? "black" : "white"} strokeWidth={1.8} />
      </div>
      <span className="text-white text-caption font-medium">{label}</span>
    </button>
  );
}
