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

  if (phase === "idle") return null;

  const isVideo = callType === "video";
  const isRinging = phase === "incoming-ringing" || phase === "outgoing-ringing";
  const isActive = phase === "active";

  const statusLabel =
    phase === "incoming-ringing" ? `Incoming ${isVideo ? "video" : "voice"} call…` :
    phase === "outgoing-ringing" ? "Ringing…" :
    phase === "connecting" ? "Connecting…" :
    isActive ? formatDuration(callDurationSec) :
    "";

  return (
    <div className="fixed inset-0 z-[100] flex flex-col" style={{ background: isVideo && isActive ? "#000" : "var(--color-black)" }}>
      {isVideo && (
        <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
      )}
      {!isVideo && <audio ref={remoteAudioRef} autoPlay />}

      <div className="absolute inset-0" style={{ background: isVideo && isActive ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.55)" }} />

      <div className="relative z-10 flex flex-col items-center pt-16 px-6">
        {(!isVideo || !isActive) && (
          <div className="mb-4">
            <Avatar name={otherUserName} src={otherUserAvatar} size={112} />
          </div>
        )}
        <h1 className="text-white text-2xl font-semibold">{otherUserName}</h1>
        <p className="text-white/70 text-base mt-1">{error ?? statusLabel}</p>
      </div>

      {isVideo && localStream && (
        <div className="absolute top-6 right-5 w-24 h-32 rounded-2xl overflow-hidden border-2 border-white/30 z-20">
          <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        </div>
      )}

      <div className="flex-1" />

      <div className="relative z-10 pb-12 px-8">
        {isRinging && phase === "incoming-ringing" ? (
          <div className="flex items-center justify-center gap-16">
            <button onClick={onDecline} className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "var(--color-red)" }}>
                <PhoneOff size={26} color="white" strokeWidth={2} />
              </div>
              <span className="text-white text-xs font-medium">Decline</span>
            </button>
            <button onClick={onAccept} className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "var(--color-green)" }}>
                <Phone size={26} color="white" strokeWidth={2} />
              </div>
              <span className="text-white text-xs font-medium">Accept</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-8">
            <div className="flex items-center justify-center gap-5">
              <CallControlButton active={muted} onClick={onToggleMute} icon={muted ? MicOff : Mic} label="Mute" />
              {isVideo && (
                <CallControlButton active={cameraOff} onClick={onToggleCamera} icon={cameraOff ? VideoOff : Video} label="Camera" />
              )}
              {isVideo && (
                <CallControlButton active={false} onClick={onSwitchCamera} icon={SwitchCamera} label="Flip" />
              )}
              {!isVideo && (
                <CallControlButton active={!speakerOn} onClick={onToggleSpeaker} icon={speakerOn ? Volume2 : VolumeX} label="Speaker" />
              )}
            </div>
            <button onClick={onHangUp} className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "var(--color-red)" }}>
              <PhoneOff size={26} color="white" strokeWidth={2} />
            </button>
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
    <button onClick={onClick} className="flex flex-col items-center gap-2">
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center"
        style={{ background: active ? "white" : "rgba(255,255,255,0.2)" }}
      >
        <Icon size={22} color={active ? "black" : "white"} strokeWidth={1.8} />
      </div>
      <span className="text-white text-xs font-medium">{label}</span>
    </button>
  );
}
