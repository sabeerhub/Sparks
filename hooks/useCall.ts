/**
 * hooks/useCall.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Orchestrates the full call lifecycle as a state machine:
 *
 *   idle -> outgoing-ringing -> connecting -> active -> ended
 *   idle -> incoming-ringing -> connecting -> active -> ended
 *
 * Handshake to avoid a lost-offer race (Realtime broadcast channels don't
 * replay messages to late subscribers):
 *   1. Caller creates the call row, gets local media, creates the peer
 *      connection, subscribes to the signaling channel, and waits.
 *   2. Callee sees the incoming call, taps Accept: gets local media,
 *      creates the peer connection, subscribes to the signaling channel,
 *      marks the call accepted in the DB, then broadcasts "ready".
 *   3. Caller (already listening) receives "ready", creates the SDP offer,
 *      and sends it. From here it's the standard offer/answer/ICE dance.
 *
 * Media never touches Supabase — only the SDP/ICE signaling messages do,
 * via ephemeral broadcast (see services/call-service.ts). Once connected,
 * audio/video flows directly peer-to-peer, encrypted by WebRTC itself.
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createPeerConnection, getLocalMedia, stopMediaStream } from "@/lib/webrtc";
import {
  initiateCall,
  acceptCall,
  declineCall,
  endCall,
  markCallMissed,
  subscribeToCallSignaling,
  subscribeToCallStatus,
  sendOffer,
  sendAnswer,
  sendIceCandidate,
  sendHangupSignal,
  sendReady,
  type CallType,
  type CallRow,
} from "@/services/call-service";

export type CallPhase = "idle" | "outgoing-ringing" | "incoming-ringing" | "connecting" | "active" | "ended";

const RING_TIMEOUT_MS = 45_000;

interface IncomingCallInfo {
  call: CallRow;
  callerName: string;
  callerAvatar: string | null;
}

export function useCall() {
  const [phase, setPhase] = useState<CallPhase>("idle");
  const [callType, setCallType] = useState<CallType>("voice");
  const [callId, setCallId] = useState<string | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCallInfo | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [callDurationSec, setCallDurationSec] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const ringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statusUnsubRef = useRef<(() => void) | null>(null);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);

  const cleanup = useCallback(() => {
    if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
    if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
    statusUnsubRef.current?.();
    statusUnsubRef.current = null;

    pcRef.current?.close();
    pcRef.current = null;

    channelRef.current?.unsubscribe();
    channelRef.current = null;

    stopMediaStream(localStreamRef.current);
    localStreamRef.current = null;

    pendingIceRef.current = [];
    setLocalStream(null);
    setRemoteStream(null);
    setCallDurationSec(0);
    setMuted(false);
    setCameraOff(false);
  }, []);

  const reset = useCallback(() => {
    cleanup();
    setPhase("idle");
    setCallId(null);
    setIncomingCall(null);
    setError(null);
  }, [cleanup]);

  const setupPeerConnection = useCallback((channel: RealtimeChannel) => {
    const pc = createPeerConnection();

    pc.onicecandidate = (event) => {
      if (event.candidate) sendIceCandidate(channel, event.candidate.toJSON());
    };

    pc.ontrack = (event) => {
      if (event.streams[0]) setRemoteStream(event.streams[0]);
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        setPhase("active");
      } else if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        setError("Call connection lost.");
        reset();
      }
    };

    pcRef.current = pc;
    return pc;
  }, [reset]);

  const startDurationTimer = useCallback(() => {
    durationIntervalRef.current = setInterval(() => {
      setCallDurationSec((s) => s + 1);
    }, 1000);
  }, []);

  const startCall = useCallback(async (calleeId: string, type: CallType) => {
    setError(null);
    setCallType(type);
    setPhase("outgoing-ringing");

    try {
      const call = await initiateCall(calleeId, type);
      setCallId(call.id);

      const stream = await getLocalMedia(type);
      localStreamRef.current = stream;
      setLocalStream(stream);

      const channel = subscribeToCallSignaling(call.id, {
        onAnswer: async (sdp) => {
          const pc = pcRef.current;
          if (!pc) return;
          await pc.setRemoteDescription(sdp);
          for (const c of pendingIceRef.current) await pc.addIceCandidate(c);
          pendingIceRef.current = [];
        },
        onIceCandidate: async (candidate) => {
          const pc = pcRef.current;
          if (pc?.remoteDescription) await pc.addIceCandidate(candidate);
          else pendingIceRef.current.push(candidate);
        },
        onReady: async () => {
          const pc = pcRef.current;
          if (!pc) return;
          setPhase("connecting");
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          sendOffer(channel, offer);
        },
        onHangup: () => reset(),
      });
      channelRef.current = channel;

      const pc = setupPeerConnection(channel);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      statusUnsubRef.current = subscribeToCallStatus(call.id, (updated) => {
        if (updated.status === "declined") { setError("Call declined."); reset(); }
        if (updated.status === "ended") reset();
      });

      ringTimeoutRef.current = setTimeout(async () => {
        await markCallMissed(call.id);
        setError("No answer.");
        reset();
      }, RING_TIMEOUT_MS);
    } catch {
      setError("Couldn't start call — check microphone/camera permissions.");
      reset();
    }
  }, [reset, setupPeerConnection]);

  const setIncoming = useCallback((call: CallRow, callerName: string, callerAvatar: string | null) => {
    setIncomingCall({ call, callerName, callerAvatar });
    setCallType(call.call_type);
    setCallId(call.id);
    setPhase("incoming-ringing");

    ringTimeoutRef.current = setTimeout(() => { reset(); }, RING_TIMEOUT_MS);
  }, [reset]);

  const acceptIncoming = useCallback(async () => {
    if (!incomingCall) return;
    if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
    setPhase("connecting");

    try {
      const stream = await getLocalMedia(incomingCall.call.call_type);
      localStreamRef.current = stream;
      setLocalStream(stream);

      const channel = subscribeToCallSignaling(incomingCall.call.id, {
        onOffer: async (sdp) => {
          const pc = pcRef.current;
          if (!pc) return;
          await pc.setRemoteDescription(sdp);
          for (const c of pendingIceRef.current) await pc.addIceCandidate(c);
          pendingIceRef.current = [];
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sendAnswer(channel, answer);
        },
        onIceCandidate: async (candidate) => {
          const pc = pcRef.current;
          if (pc?.remoteDescription) await pc.addIceCandidate(candidate);
          else pendingIceRef.current.push(candidate);
        },
        onHangup: () => reset(),
      });
      channelRef.current = channel;

      const pc = setupPeerConnection(channel);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      await acceptCall(incomingCall.call.id);
      sendReady(channel);

      statusUnsubRef.current = subscribeToCallStatus(incomingCall.call.id, (updated) => {
        if (updated.status === "ended") reset();
      });
    } catch {
      setError("Couldn't join call — check microphone/camera permissions.");
      reset();
    }
  }, [incomingCall, reset, setupPeerConnection]);

  const declineIncoming = useCallback(async () => {
    if (!incomingCall) return;
    await declineCall(incomingCall.call.id);
    reset();
  }, [incomingCall, reset]);

  const hangUp = useCallback(async () => {
    if (channelRef.current) sendHangupSignal(channelRef.current);
    if (callId) await endCall(callId);
    reset();
  }, [callId, reset]);

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !muted;
    stream.getAudioTracks().forEach((t) => { t.enabled = !next; });
    setMuted(next);
  }, [muted]);

  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !cameraOff;
    stream.getVideoTracks().forEach((t) => { t.enabled = !next; });
    setCameraOff(next);
  }, [cameraOff]);

  const switchCamera = useCallback(async () => {
    const stream = localStreamRef.current;
    const pc = pcRef.current;
    if (!stream || !pc) return;
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) return;

    const currentFacing = videoTrack.getSettings().facingMode;
    const nextFacing = currentFacing === "user" ? "environment" : "user";

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: nextFacing },
        audio: false,
      });
      const newTrack = newStream.getVideoTracks()[0];
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      if (newTrack) await sender?.replaceTrack(newTrack);

      videoTrack.stop();
      stream.removeTrack(videoTrack);
      if (newTrack) stream.addTrack(newTrack);
      setLocalStream(new MediaStream(stream.getTracks()));
    } catch {
      // Device may not have a second camera — silently keep current one.
    }
  }, []);

  const toggleSpeaker = useCallback(() => {
    setSpeakerOn((s) => !s);
  }, []);

  useEffect(() => {
    if (phase === "active" && !durationIntervalRef.current) startDurationTimer();
  }, [phase, startDurationTimer]);

  useEffect(() => () => cleanup(), [cleanup]);

  return {
    phase,
    callType,
    incomingCall,
    localStream,
    remoteStream,
    muted,
    cameraOff,
    speakerOn,
    callDurationSec,
    error,
    startCall,
    setIncoming,
    acceptIncoming,
    declineIncoming,
    hangUp,
    toggleMute,
    toggleCamera,
    switchCamera,
    toggleSpeaker,
  };
}
