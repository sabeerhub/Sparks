/**
 * lib/webrtc.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Core WebRTC peer connection setup. Media never touches Supabase — only
 * signaling (offer/answer/ICE candidates) goes through Realtime broadcast
 * channels (see services/call-service.ts). Encryption is provided
 * automatically by WebRTC itself (DTLS for the data path, SRTP for media).
 *
 * ICE servers, in the order they are tried:
 *   1. Free Google STUN (direct peer-to-peer path).
 *   2. Your own TURN relay, if set via env vars (see below) — this is
 *      the production path and takes priority over the public fallback.
 *   3. OpenRelay — a free PUBLIC relay run by Metered.ca, built in so
 *      calls work out of the box even before you set up your own TURN.
 *      The username/credential below ("openrelayproject") are PUBLIC
 *      demo credentials published by Metered.ca for anyone to use —
 *      they are not a secret and not private to this app. Honest
 *      limit: it is a free public service, fine for testing and for
 *      getting started, but it is shared with everyone and carries no
 *      uptime guarantee. For the real setup, create your own free
 *      Metered TURN account and set the three env vars — see
 *      docs/DEPLOYMENT_GUIDE.md §6.
 *
 * Why a relay matters at all: two phones on mobile networks often
 * cannot reach each other directly (carrier NAT, network changes
 * mid-call). Without a relay, the call has no other path — when the
 * direct path breaks (~30–60s in, when the carrier re-maps the
 * connection), the call just ends. A TURN relay gives the media a
 * server to pass through, so the call survives the network change.
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

  // Built-in fallback relay — public demo credentials, see the header
  // comment above. UDP first, then TLS (port 443) for networks that
  // block plain UDP.
  servers.push(
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turns:openrelay.metered.ca:443?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject",
    }
  );

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
