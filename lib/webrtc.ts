/**
 * lib/webrtc.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Core WebRTC peer connection setup. Media never touches Supabase — only
 * signaling (offer/answer/ICE candidates) goes through Realtime broadcast
 * channels (see services/call-service.ts). Encryption is provided
 * automatically by WebRTC itself (DTLS for the data path, SRTP for media).
 *
 * ICE servers: free Google STUN by default. For production reliability
 * across restrictive networks (corporate WiFi, some carriers), set
 * NEXT_PUBLIC_TURN_URL / NEXT_PUBLIC_TURN_USERNAME / NEXT_PUBLIC_TURN_CREDENTIAL
 * env vars (e.g. from Metered.ca's free tier) — picked up automatically,
 * no code changes needed.
 */

export function getIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ];

  const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
  const turnUsername = process.env.NEXT_PUBLIC_TURN_USERNAME;
  const turnCredential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;

  if (turnUrl && turnUsername && turnCredential) {
    servers.push({ urls: turnUrl, username: turnUsername, credential: turnCredential });
  }

  return servers;
}

export function createPeerConnection(): RTCPeerConnection {
  return new RTCPeerConnection({ iceServers: getIceServers() });
}

export async function getLocalMedia(callType: "voice" | "video"): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: true,
    video: callType === "video" ? { facingMode: "user" } : false,
  });
}

export function stopMediaStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}
