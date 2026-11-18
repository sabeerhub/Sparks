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
import { startRingtone, stopRingtone } from "@/lib/ringtone";
import { createClient } from "@/lib/supabase";

const supabase = createClient();
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

// Reconnect policy (v1.6.0): a mobile network wobble must never end a
// call by itself. 15s of grace with up to 3 ICE restarts a few seconds
// apart — the old 5s + one restart could not survive a real carrier
// network change, which is why calls ended by themselves after about
// a minute. Only when the grace truly runs out, still disconnected,
// does the call end.
const RECONNECT_GRACE_MS = 15_000;
const MAX_ICE_RESTARTS = 3;
const ICE_RESTART_INTERVAL_MS = 4_000;

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
  const [reconnecting, setReconnecting] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const ringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statusUnsubRef = useRef<(() => void) | null>(null);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iceRestartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iceRestartCountRef = useRef(0);
  const ringEnabledRef = useRef(true);

  const cleanup = useCallback(() => {
    if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
    if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    reconnectTimerRef.current = null;
    if (iceRestartTimerRef.current) clearTimeout(iceRestartTimerRef.current);
    iceRestartTimerRef.current = null;
    iceRestartCountRef.current = 0;
    stopRingtone();
    setReconnecting(false);
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
        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
        if (iceRestartTimerRef.current) clearTimeout(iceRestartTimerRef.current);
        iceRestartTimerRef.current = null;
        iceRestartCountRef.current = 0;
        stopRingtone();
        setReconnecting(false);
        setPhase("active");
      } else if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        // A brief network drop must never end a call by itself. Give it
        // the full 15s grace with up to 3 ICE restarts a few seconds
        // apart, and only end the call when the grace truly runs out
        // with the connection still down. The screen shows
        // "Reconnecting…" the whole time (see CallScreen) — never a
        // fake "connected" while the media path is down.
        if (reconnectTimerRef.current) return;
        setReconnecting(true);
        iceRestartCountRef.current = 0;

        // Fresh ICE candidates travel over the signaling channel — if
        // that channel dropped too, rejoin it so the restart can
        // actually get through. The Supabase socket normally rejoins
        // channels itself on reconnect; this is the belt-and-braces
        // check for a channel left closed/errored.
        const channel = channelRef.current;
        if (channel && (channel.state === "closed" || channel.state === "errored")) {
          try {
            channel.subscribe();
          } catch {
            // Socket rejoin still covers it; the grace timer decides.
          }
        }

        const tryRestart = () => {
          // Call already cleaned up, or recovered on its own — stop.
          if (pcRef.current !== pc || pc.connectionState === "connected") return;
          if (iceRestartCountRef.current >= MAX_ICE_RESTARTS) return;
          iceRestartCountRef.current += 1;
          try {
            pc.restartIce();
          } catch {
            // restartIce is best-effort; the grace timer still decides.
          }
          // Space the next try a few seconds out — a restart needs
          // time to gather fresh candidates before another one helps.
          iceRestartTimerRef.current = setTimeout(tryRestart, ICE_RESTART_INTERVAL_MS);
        };
        tryRestart();

        reconnectTimerRef.current = setTimeout(() => {
          reconnectTimerRef.current = null;
          if (iceRestartTimerRef.current) clearTimeout(iceRestartTimerRef.current);
          iceRestartTimerRef.current = null;
          if (pcRef.current?.connectionState !== "connected") {
            setError("Call connection lost.");
            reset();
          }
        }, RECONNECT_GRACE_MS);
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
    startRingtone();

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
          stopRingtone();
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
    // The Voice/Video call notification toggles in Settings are real: the
    // ringtone only sounds if the user has that call type's notifications
    // on. The call screen itself still shows, so a silenced call is never
    // missed silently — it is visible, just quiet.
    void (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          startRingtone();
          return;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase.from("profiles") as any)
          .select("notify_voice_calls, notify_video_calls")
          .eq("id", user.id)
          .maybeSingle();
        const row = data as { notify_voice_calls?: boolean; notify_video_calls?: boolean } | null;
        const enabled =
          call.call_type === "video" ? row?.notify_video_calls !== false : row?.notify_voice_calls !== false;
        ringEnabledRef.current = enabled;
        if (enabled) startRingtone();
      } catch {
        startRingtone();
      }
    })();

    ringTimeoutRef.current = setTimeout(() => { reset(); }, RING_TIMEOUT_MS);
  }, [reset]);

  const acceptIncoming = useCallback(async () => {
    if (!incomingCall) return;
    if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
    stopRingtone();
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

  /**
   * Speaker toggle — honest limit: browsers expose NO API to route audio
   * to the earpiece vs the loudspeaker. What this toggle really does is
   * switch the remote audio volume between loudspeaker level (1.0) and
   * earpiece level (0.35); CallScreen applies it to the remote audio /
   * video element. It is labelled "Speaker" and never claims hardware
   * routing it cannot do.
   */
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
    reconnecting,
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
