/**
 * components/profile/TikTokProfileHeader.tsx
 * v1.3.2 — the TikTok-style profile header, shared by the own profile
 * and other-user profile pages so both look identical in structure.
 *
 * Layout follows the latest TikTok profile (2026 rollout): centred
 * avatar, display name + verified badge, @username, a stats row with
 * bold number + grey label inline, centred bio, small location /
 * joined line, then the action buttons. No card around the header —
 * TikTok profiles are open space, not boxes. The glass language
 * survives in the buttons and chips only. Desktop is the same centred
 * column, just wider (the page caps it at 640px).
 *
 * Stats are REAL numbers only, passed in by the page — never invented
 * here. No followers/likes counts exist in Sparks, so they are not
 * shown. No bolt icons, no gradients.
 */
"use client";

import { BadgeCheck, Calendar, MapPin } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";

export interface TikTokStat {
  value: string;
  label: string;
}

interface TikTokProfileHeaderProps {
  name: string;
  username: string;
  verified?: boolean;
  premium?: boolean;
  avatarUrl?: string | null;
  online?: boolean;
  bio?: string | null;
  location?: string | null;
  joinedLabel: string;
  stats: TikTokStat[];
  /** Buttons row (Edit/Share, Spark request, calls, …) rendered by the page. */
  actions: React.ReactNode;
  /** Extra control next to the name (e.g. the nickname pencil). */
  nameExtra?: React.ReactNode;
}

export function TikTokProfileHeader({
  name,
  username,
  verified = false,
  premium = false,
  avatarUrl,
  online = false,
  bio,
  location,
  joinedLabel,
  stats,
  actions,
  nameExtra,
}: TikTokProfileHeaderProps) {
  return (
    <div className="flex flex-col items-center text-center px-4 pt-2">
      {/* Avatar — centred, blue ring when premium, white ring otherwise. */}
      <div
        className="rounded-full p-[3px] mb-4"
        style={{
          background: premium ? "var(--color-blue)" : "rgba(255,255,255,0.95)",
          boxShadow: premium
            ? "0 10px 28px rgba(0,122,255,0.22)"
            : "0 8px 24px rgba(29,29,31,0.10)",
        }}
      >
        <div className="rounded-full ring-4 ring-white/90">
          <Avatar name={name || "?"} src={avatarUrl} size={112} online={online} />
        </div>
      </div>

      {/* Display name + verified badge. */}
      <div className="flex items-center justify-center gap-1.5">
        <h1
          className="font-bold"
          style={{ color: "#1D1D1F", fontSize: 21, lineHeight: "26px", letterSpacing: "-0.01em" }}
        >
          {name || "—"}
        </h1>
        {verified && <BadgeCheck size={20} fill="#007AFF" color="white" />}
        {nameExtra}
      </div>
      {premium && (
        <span
          className="mt-2 px-3 py-1 rounded-full text-caption font-bold"
          style={{ background: "rgba(0,122,255,0.12)", color: "var(--color-blue)" }}
        >
          Premium
        </span>
      )}

      <p className="mt-1" style={{ color: "#6E6E73", fontSize: 15, lineHeight: "20px" }}>
        @{username}
      </p>

      {/* Stats — TikTok style: bold number + grey label, inline, one row. */}
      {stats.length > 0 && (
        <div className="flex items-center justify-center gap-6 mt-4 flex-wrap">
          {stats.map((stat) => (
            <div key={stat.label} className="flex items-baseline gap-1.5">
              <span
                className="font-bold"
                style={{ color: "#1D1D1F", fontSize: 16, lineHeight: "20px" }}
              >
                {stat.value}
              </span>
              <span style={{ color: "#6E6E73", fontSize: 13, lineHeight: "18px" }}>
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Action buttons — rendered by the page, full-width row. */}
      <div className="w-full mt-5">{actions}</div>

      {/* Bio — centred under the buttons, TikTok style. */}
      {bio && (
        <p
          className="mt-4 leading-relaxed"
          style={{ color: "#1D1D1F", fontSize: 15, lineHeight: "21px" }}
        >
          {bio}
        </p>
      )}

      {/* Location / joined — small grey line. */}
      <div className="flex items-center justify-center gap-4 mt-3 flex-wrap">
        {location && (
          <span
            className="flex items-center gap-1"
            style={{ color: "#6E6E73", fontSize: 13, lineHeight: "18px" }}
          >
            <MapPin size={13} strokeWidth={1.8} /> {location}
          </span>
        )}
        <span
          className="flex items-center gap-1"
          style={{ color: "#6E6E73", fontSize: 13, lineHeight: "18px" }}
        >
          <Calendar size={13} strokeWidth={1.8} /> Joined {joinedLabel}
        </span>
      </div>
    </div>
  );
}
