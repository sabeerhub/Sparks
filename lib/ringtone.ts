/**
 * lib/ringtone.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Soft in-call ringtone built with the WebAudio API — no external audio
 * files, no network fetch. A gentle two-tone chime (880 Hz → 660 Hz)
 * repeated once a second while a call is ringing, stopped as soon as the
 * call connects, is declined, ends, or times out.
 *
 * AudioContext creation is best-effort: browsers may keep it suspended
 * until a user gesture, so start() resumes it when allowed and silently
 * gives up when it cannot — the call itself is never blocked by the
 * ringtone.
 */

let audioCtx: AudioContext | null = null;
let ringTimer: ReturnType<typeof setInterval> | null = null;

function getContext(): AudioContext | null {
  try {
    if (!audioCtx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      audioCtx = new AudioCtx();
    }
    if (audioCtx.state === "suspended") {
      void audioCtx.resume().catch(() => undefined);
    }
    return audioCtx;
  } catch {
    return null;
  }
}

function chime(ctx: AudioContext, frequency: number, startAt: number): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(0.06, startAt + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.45);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + 0.5);
}

function playRing(): void {
  const ctx = getContext();
  if (!ctx) return;
  const now = ctx.currentTime + 0.05;
  chime(ctx, 880, now);
  chime(ctx, 659.25, now + 0.45);
}

/** Start ringing. Safe to call repeatedly — only one ring loop runs. */
export function startRingtone(): void {
  if (ringTimer) return;
  playRing();
  ringTimer = setInterval(playRing, 1000);
}

/** Stop ringing immediately. Safe to call when not ringing. */
export function stopRingtone(): void {
  if (ringTimer) {
    clearInterval(ringTimer);
    ringTimer = null;
  }
}
