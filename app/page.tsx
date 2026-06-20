/**
 * app/page.tsx — Landing page. Public route (see middleware/auth-middleware.ts).
 * Server Component: no client state needed, so this ships zero client JS
 * for the marketing page itself (the nested <Link>s hydrate Next's router only).
 */
import Link from "next/link";
import { ScreenContainer } from "@/components/layout/ScreenContainer";

const FEATURES: { label: string; desc: string; icon: "lock" | "bolt" | "phone" | "attach" | "group" | "shield" }[] = [
  { label: "End-to-End Encryption", desc: "Every message encrypted before it leaves your device.", icon: "lock" },
  { label: "Real-time Messaging", desc: "Sub-second delivery powered by Supabase Realtime.", icon: "bolt" },
  { label: "Voice & Video Calls", desc: "Crystal-clear calls, fully encrypted.", icon: "phone" },
  { label: "Share Anything", desc: "Photos, files, voice notes — all secured.", icon: "attach" },
  { label: "Group Chats & More", desc: "Stay connected with everyone that matters.", icon: "group" },
  { label: "Privacy First", desc: "No ads. No data selling. Ever.", icon: "shield" },
];

export default function LandingPage() {
  return (
    <ScreenContainer>
      <div className="h-full overflow-y-auto">
        <nav className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 bg-white border-b" style={{ borderColor: "var(--color-gray-3)" }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "var(--color-blue)" }}>
              <BoltIcon color="#fff" />
            </div>
            <span className="font-bold text-base">Sparks</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium px-4 py-1.5 rounded-full" style={{ color: "var(--color-blue)" }}>
              Login
            </Link>
            <Link href="/login" className="text-sm font-semibold px-4 py-1.5 rounded-full text-white" style={{ background: "var(--color-blue)" }}>
              Get Started
            </Link>
          </div>
        </nav>

        <div className="px-6 pt-10 pb-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6 text-xs font-semibold" style={{ background: "var(--color-blue-light)", color: "var(--color-blue)" }}>
            <ShieldIcon color="var(--color-blue)" size={12} />
            50K+ people trust Sparks
          </div>
          <h1 className="text-4xl font-bold leading-tight mb-2">Messaging. Designed for</h1>
          <h1 className="text-4xl font-bold mb-4" style={{ color: "var(--color-blue)" }}>Humans.</h1>
          <p className="text-sm leading-relaxed mb-8 mx-auto max-w-xs" style={{ color: "var(--color-gray-1)" }}>
            A private, secure, and beautiful messaging app with end-to-end encryption and all the features you love.
          </p>
          <Link href="/login" className="inline-block px-6 py-3 rounded-2xl text-sm font-semibold text-white" style={{ background: "var(--color-blue)" }}>
            Get Started
          </Link>
        </div>

        <div className="px-5 py-8">
          <h2 className="text-xl font-bold text-center mb-6">Everything you need</h2>
          <div className="grid grid-cols-2 gap-3">
            {FEATURES.map((f) => (
              <div key={f.label} className="rounded-2xl p-4" style={{ background: "var(--color-gray-2)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: "var(--color-blue-light)" }}>
                  <FeatureIcon name={f.icon} color="var(--color-blue)" size={18} />
                </div>
                <div className="text-sm font-semibold mb-1">{f.label}</div>
                <div className="text-xs leading-relaxed" style={{ color: "var(--color-gray-1)" }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mx-5 mb-8 rounded-3xl p-6 text-center" style={{ background: "var(--color-blue-light)" }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "var(--color-blue)" }}>
            <ShieldIcon color="#fff" size={24} />
          </div>
          <h3 className="text-lg font-bold mb-2">Your Privacy Comes First</h3>
          <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--color-gray-1)" }}>
            All messages are end-to-end encrypted with AES-256-GCM. Only you and the person you&apos;re talking to can read them.
          </p>
        </div>

        <div className="px-5 pb-10 text-center">
          <Link href="/login" className="block w-full py-4 rounded-2xl text-base font-semibold text-white mb-3" style={{ background: "var(--color-blue)" }}>
            Get Started — It&apos;s Free
          </Link>
          <p className="text-xs" style={{ color: "var(--color-gray-1)" }}>🔒 Secured with end-to-end encryption</p>
        </div>
      </div>
    </ScreenContainer>
  );
}

function BoltIcon({ color }: { color: string }) {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill={color}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>;
}
function ShieldIcon({ color, size }: { color: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
function FeatureIcon({ name, color, size }: { name: "lock" | "bolt" | "phone" | "attach" | "group" | "shield"; color: string; size: number }) {
  const c = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (name) {
    case "lock":
      return <svg {...c}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>;
    case "bolt":
      return <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>;
    case "phone":
      return <svg {...c}><path d="M22 16.92v3a2 2 0 01-2.18 2A19.79 19.79 0 013.07 9.8 19.79 19.79 0 01.18 2 2 2 0 012 .18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z" /></svg>;
    case "attach":
      return <svg {...c}><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" /></svg>;
    case "group":
      return <svg {...c}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>;
    case "shield":
      return <ShieldIcon color={color} size={size} />;
  }
}
