"use client";

import { useState } from "react";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { StatusBar } from "@/components/layout/StatusBar";
import { BottomNav } from "@/components/layout/BottomNav";

/**
 * MVP scope note: voice/video call infrastructure (WebRTC signaling via
 * Supabase Realtime, ICE/TURN config) is intentionally out of scope for
 * this deliverable — the PRD lists calls as a feature card on the landing
 * page, but the core deliverable here is the messaging system. The row
 * layout below matches the design reference exactly so it's ready to wire
 * up to a `calls` table the moment that backend exists; until then this
 * renders a genuine empty state instead of fabricated call history.
 */
interface CallRecord {
  id: string;
  name: string;
  type: "Outgoing Call" | "Missed Call" | "Incoming Call";
  time: string;
  avatarUrl?: string;
}

export default function ActivityPage() {
  const [filter, setFilter] = useState<"All" | "Missed" | "Outgoing" | "Incoming">("All");
  const calls: CallRecord[] = []; // populated once a real calls table/backend exists

  const filtered = filter === "All" ? calls : calls.filter((c) => c.type.startsWith(filter));

  return (
    <ScreenContainer>
      <div className="flex flex-col h-full">
        <StatusBar />
        <div className="px-5 pt-3 pb-2">
          <h1 className="text-2xl font-bold mb-4">Calls</h1>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(["All", "Missed", "Outgoing", "Incoming"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className="px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap"
                style={{ background: filter === t ? "var(--color-blue)" : "var(--color-gray-2)", color: filter === t ? "#fff" : "var(--color-gray-1)" }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
            <p className="font-semibold mb-1">No call history yet</p>
            <p className="text-sm" style={{ color: "var(--color-gray-1)" }}>
              Voice &amp; video calling is on the roadmap — not part of this MVP build.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto divide-y" style={{ borderColor: "var(--color-gray-2)" }}>
            {filtered.map((call) => (
              <div key={call.id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold" style={{ background: "var(--color-blue)" }}>
                  {call.name.split(" ").map((n) => n[0] ?? "").join("").slice(0, 2)}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm">{call.name}</div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <CallTypeIcon type={call.type} />
                    <span className="text-xs" style={{ color: call.type === "Missed Call" ? "var(--color-red)" : "var(--color-gray-1)" }}>{call.type}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs mb-2" style={{ color: "var(--color-gray-1)" }}>{call.time}</div>
                  <button aria-label="Call"><PhoneIcon /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        <BottomNav />
      </div>
    </ScreenContainer>
  );
}

function CallTypeIcon({ type }: { type: CallRecord["type"] }) {
  const color = type === "Missed Call" ? "var(--color-red)" : type === "Outgoing Call" ? "var(--color-green)" : "var(--color-blue)";
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 01-2.18 2A19.79 19.79 0 013.07 9.8 19.79 19.79 0 01.18 2 2 2 0 012 .18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z" />
    </svg>
  );
}
function PhoneIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 01-2.18 2A19.79 19.79 0 013.07 9.8 19.79 19.79 0 01.18 2 2 2 0 012 .18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z" />
    </svg>
  );
}
