/**
 * services/call-service.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Two responsibilities, deliberately kept in one file since they're tightly
 * coupled to the same call lifecycle:
 *
 * 1. Call row CRUD — persisted state (ringing/accepted/declined/missed/
 *    ended) in the `calls` table, so history and missed-call notifications
 *    work (via a Postgres trigger — see migration).
 *
 * 2. WebRTC signaling — offer/answer/ICE candidates relayed through a
 *    per-call Supabase Realtime BROADCAST channel (not postgres_changes,
 *    and never written to a table). This is purely ephemeral message
 *    passing; actual audio/video never touches Supabase at all — that
 *    flows peer-to-peer once WebRTC negotiation completes.
 */

import { createClient } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

const supabase = createClient();

export type CallType = "voice" | "video";
export type CallStatus = "ringing" | "accepted" | "declined" | "missed" | "ended";

export interface CallRow {
  id: string;
  caller_id: string;
  callee_id: string;
  call_type: CallType;
  status: CallStatus;
  started_at: string;
  answered_at: string | null;
  ended_at: string | null;
}

export interface CallHistoryItem extends CallRow {
  otherUserId: string;
  otherUserName: string;
  otherUserAvatar: string | null;
  isOutgoing: boolean;
}

// ─── Call row lifecycle ─────────────────────────────────────────────────────

export async function initiateCall(calleeId: string, callType: CallType): Promise<CallRow> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("calls") as any)
    .insert({ caller_id: user.id, callee_id: calleeId, call_type: callType })
    .select("*")
    .single();

  if (error) throw error;
  return data as CallRow;
}

export async function acceptCall(callId: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("calls") as any)
    .update({ status: "accepted", answered_at: new Date().toISOString() })
    .eq("id", callId);
}

export async function declineCall(callId: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("calls") as any)
    .update({ status: "declined", ended_at: new Date().toISOString() })
    .eq("id", callId);
}

export async function markCallMissed(callId: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("calls") as any)
    .update({ status: "missed", ended_at: new Date().toISOString() })
    .eq("id", callId);
}

export async function endCall(callId: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("calls") as any)
    .update({ status: "ended", ended_at: new Date().toISOString() })
    .eq("id", callId);
}

/** Listens for a new incoming call (INSERT where I'm the callee, still ringing). */
export function subscribeToIncomingCalls(
  userId: string,
  onIncoming: (call: CallRow) => void
): () => void {
  const channel = supabase
    .channel(`incoming-calls:${userId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "calls", filter: `callee_id=eq.${userId}` },
      (payload) => {
        const row = payload.new as CallRow;
        if (row.status === "ringing") onIncoming(row);
      }
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}

/** Listens for status changes on a specific call (e.g. callee declined, or caller hung up). */
export function subscribeToCallStatus(
  callId: string,
  onChange: (call: CallRow) => void
): () => void {
  const channel = supabase
    .channel(`call-status:${callId}`)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "calls", filter: `id=eq.${callId}` },
      (payload) => onChange(payload.new as CallRow)
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}

export async function fetchCallHistory(limit = 50): Promise<CallHistoryItem[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: calls, error } = await (supabase.from("calls") as any)
    .select("*")
    .or(`caller_id.eq.${user.id},callee_id.eq.${user.id}`)
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error || !calls?.length) return [];

  const otherIds = [...new Set((calls as CallRow[]).map((c) =>
    c.caller_id === user.id ? c.callee_id : c.caller_id
  ))];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profiles } = await (supabase.from("profiles") as any)
    .select("id, full_name, avatar_url")
    .in("id", otherIds);

  const profileById = new Map<string, { full_name: string; avatar_url: string | null }>();
  (profiles ?? []).forEach((p: { id: string; full_name: string; avatar_url: string | null }) =>
    profileById.set(p.id, p)
  );

  return (calls as CallRow[]).map((c) => {
    const isOutgoing = c.caller_id === user.id;
    const otherUserId = isOutgoing ? c.callee_id : c.caller_id;
    const otherProfile = profileById.get(otherUserId);
    return {
      ...c,
      otherUserId,
      otherUserName: otherProfile?.full_name ?? "Unknown",
      otherUserAvatar: otherProfile?.avatar_url ?? null,
      isOutgoing,
    };
  });
}

// ─── WebRTC signaling (ephemeral broadcast — never persisted) ──────────────

export interface SignalingHandlers {
  onOffer?: (sdp: RTCSessionDescriptionInit) => void;
  onAnswer?: (sdp: RTCSessionDescriptionInit) => void;
  onIceCandidate?: (candidate: RTCIceCandidateInit) => void;
  onHangup?: () => void;
  onReady?: () => void;
}

export function subscribeToCallSignaling(callId: string, handlers: SignalingHandlers): RealtimeChannel {
  const channel = supabase.channel(`call-signal:${callId}`, {
    config: { broadcast: { self: false } },
  });

  if (handlers.onOffer) {
    channel.on("broadcast", { event: "offer" }, ({ payload }) => handlers.onOffer!(payload.sdp));
  }
  if (handlers.onAnswer) {
    channel.on("broadcast", { event: "answer" }, ({ payload }) => handlers.onAnswer!(payload.sdp));
  }
  if (handlers.onIceCandidate) {
    channel.on("broadcast", { event: "ice-candidate" }, ({ payload }) => handlers.onIceCandidate!(payload.candidate));
  }
  if (handlers.onReady) {
    channel.on("broadcast", { event: "ready" }, () => handlers.onReady!());
  }
  if (handlers.onHangup) {
    channel.on("broadcast", { event: "hangup" }, () => handlers.onHangup!());
  }

  channel.subscribe();
  return channel;
}

export function sendOffer(channel: RealtimeChannel, sdp: RTCSessionDescriptionInit) {
  channel.send({ type: "broadcast", event: "offer", payload: { sdp } });
}
export function sendAnswer(channel: RealtimeChannel, sdp: RTCSessionDescriptionInit) {
  channel.send({ type: "broadcast", event: "answer", payload: { sdp } });
}
export function sendIceCandidate(channel: RealtimeChannel, candidate: RTCIceCandidateInit) {
  channel.send({ type: "broadcast", event: "ice-candidate", payload: { candidate } });
}
export function sendReady(channel: RealtimeChannel) {
  channel.send({ type: "broadcast", event: "ready", payload: {} });
}

export function sendHangupSignal(channel: RealtimeChannel) {
  channel.send({ type: "broadcast", event: "hangup", payload: {} });
}
