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

/**
 * CallScreen — FaceTime / iOS Phone level, with the app's real liquid
 * glass. The glass only reads as glass because it always sits over
 * something real: the remote video while a video call is live, and a
 * dark blue aurora (see .call-aurora in styles/globals.css) the rest of
 * the time. Glass over a flat solid colour would look like plain
 * paint, so there is no flat backdrop anywhere on this screen.
 *
 * Every control here is real — mute, camera, speaker, flip camera,
 * end, accept, decline are all wired to hooks/useCall through
 * CallProvider. Nothing on this screen is decoration: a control that
 * could not work would be removed, not left dead.
 */
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
      ? `Incoming ${isVideo ? "video" : "voice"} call`
      : phase === "outgoing-ringing"
        ? "Ringing…"
        : phase === "connecting"
          ? "Connecting…"
          : isActive
            ? formatDuration(callDurationSec)
            : "";

  return (
    <div className="call-aurora fixed inset-0 z-[100] flex flex-col">
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

      {/* Soft scrim so white text stays legible over video — lighter when
          the video is live, deeper over the aurora. */}
      <div
        className="absolute inset-0"
        style={{ background: remoteVideoVisible ? "rgba(0,0,0,0.22)" : "rgba(0,0,0,0.18)" }}
      />

      {/* Header — big photo, large name, status, call-type chip */}
      <div
        className="relative z-10 flex flex-col items-center px-6"
        style={{ paddingTop: "max(64px, env(safe-area-inset-top, 0px))" }}
      >
        {(!isVideo || !isActive || !remoteStream) && (
          <div className={`mb-6 ${isRinging ? "animate-call-ring" : ""}`}>
            <Avatar name={otherUserName} src={otherUserAvatar} size={128} />
          </div>
        )}
        <h1
          className="text-white font-semibold text-center tracking-tight"
          style={{ fontSize: 30, lineHeight: 1.2 }}
        >
          {otherUserName}
        </h1>
        <p className="text-white/75 text-body mt-2 text-center flex items-center justify-center gap-2">
          {reconnecting && (
            <span
              aria-hidden
              className="inline-block w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"
            />
          )}
          {error ?? statusLabel}
        </p>
        {/* Call-type chip — frosted glass, so it is obvious at a glance
            whether this is voice or video. */}
        <span className="glass-dark mt-4 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-white text-caption font-medium">
          {isVideo ? <Video size={13} strokeWidth={2} /> : <Phone size={13} strokeWidth={2} />}
          {isVideo ? "Video call" : "Voice call"}
        </span>
        {isVideo && isActive && !remoteStream && (
          <p className="text-white/50 text-body mt-3">Waiting for video…</p>
        )}
      </div>

      {/* Local preview — glass frame over the aurora / video */}
      {isVideo && (
        <div
          className="glass-dark absolute top-6 right-5 z-20 w-24 h-32 rounded-[20px] overflow-hidden"
          style={{ top: "max(24px, env(safe-area-inset-top, 0px))" }}
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

      {/* Liquid-glass control bar — frosted, over the video / aurora */}
      <div
        className="glass-dark relative z-10 mx-4 mb-4 rounded-[28px] px-4 pt-5"
        style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom, 0px))" }}
      >
        {isRinging && phase === "incoming-ringing" ? (
          <div className="flex items-center justify-center gap-20 pb-1">
            <button onClick={onDecline} className="flex flex-col items-center gap-2.5 active:scale-95 transition-transform duration-200" aria-label="Decline call">
              <div
                className="w-[72px] h-[72px] rounded-full flex items-center justify-center"
                style={{ background: "#FF3B30", boxShadow: "0 8px 24px rgba(255,59,48,0.45)" }}
              >
                <PhoneOff size={30} color="white" strokeWidth={2} />
              </div>
              <span className="text-white text-caption font-medium">Decline</span>
            </button>
            <button onClick={onAccept} className="flex flex-col items-center gap-2.5 active:scale-95 transition-transform duration-200" aria-label="Accept call">
              <div
                className="animate-accept-pulse w-[72px] h-[72px] rounded-full flex items-center justify-center"
                style={{ background: "#34C759", boxShadow: "0 8px 24px rgba(52,199,89,0.45)" }}
              >
                <Phone size={30} color="white" strokeWidth={2} />
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
        style={
          active
            ? { background: "white", boxShadow: "0 0 0 1px rgba(255,255,255,0.6), 0 4px 16px rgba(0,122,255,0.35)" }
            : { background: "rgba(255,255,255,0.16)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.28)", border: "1px solid rgba(255,255,255,0.22)" }
        }
      >
        <Icon size={22} color={active ? "#1D1D1F" : "white"} strokeWidth={1.8} />
      </div>
      <span className="text-white text-caption font-medium">{label}</span>
    </button>
  );
}
