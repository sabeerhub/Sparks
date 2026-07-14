"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { StatusBar } from "@/components/layout/StatusBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Avatar } from "@/components/ui/Avatar";
import { ShareProfileSheet } from "@/components/profile/ShareProfileSheet";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase";
import { getSparkCount } from "@/services/chat-service";
import type { Profile } from "@/types";

const supabase = createClient();

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-full ${className ?? ""}`}
      style={{ background: "var(--color-gray-3)" }}
    />
  );
}

function ProfileSkeleton() {
  return (
    <div>
      <div className="flex flex-col items-center py-8 px-5 bg-white">
        <div
          className="w-24 h-24 rounded-full animate-pulse mb-3"
          style={{ background: "var(--color-gray-3)" }}
        />
        <Skeleton className="h-5 w-36 mb-2" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="px-4 pt-4 space-y-3">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-2xl bg-white p-1">
            {[0, 1].map((j) => (
              <div key={j} className="flex items-center gap-3 px-3 py-3.5">
                <div
                  className="w-9 h-9 rounded-xl animate-pulse flex-shrink-0"
                  style={{ background: "var(--color-gray-3)" }}
                />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function daysActive(createdAt: string | undefined): number {
  if (!createdAt) return 0;
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  return Math.max(1, Math.floor((now - created) / (1000 * 60 * 60 * 24)));
}

function formatJoinDate(createdAt: string | undefined): string {
  if (!createdAt) return "—";
  return new Date(createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default function ProfilePage() {
  const router = useRouter();
  const { logout } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sparkCount, setSparkCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from("profiles") as any)
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      setProfile(data as Profile | null);
      getSparkCount(user.id).then(setSparkCount);
      setLoading(false);
    })();
  }, [router]);

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  return (
    <ScreenContainer>
      <div className="flex flex-col h-full" style={{ background: "var(--color-gray-2)" }}>
        <StatusBar />
        <div className="flex-1 overflow-y-auto">
          {loading || !profile ? (
            <ProfileSkeleton />
          ) : (
            <>
              {/* Header card */}
              <div className="flex flex-col items-center py-8 px-5 bg-white">
                <div
                  className="rounded-full p-1"
                  style={profile.is_premium ? { background: "linear-gradient(135deg, var(--color-orange), var(--color-blue))" } : undefined}
                >
                  <Avatar name={profile.full_name ?? "?"} src={profile.avatar_url} size={92} />
                </div>

                <div className="flex items-center gap-1.5 mt-3">
                  <h2 className="text-xl font-bold text-center">{profile.full_name ?? "—"}</h2>
                  {profile.is_verified && <VerifiedBadge />}
                </div>

                {profile.username && (
                  <p className="text-sm mt-0.5" style={{ color: "var(--color-blue)" }}>
                    @{profile.username}
                  </p>
                )}

                <div className="mt-4 flex items-center gap-1.5">
                  <BoltIcon />
                  <span className="text-2xl font-bold">{sparkCount}</span>
                </div>
                <p className="text-xs -mt-0.5" style={{ color: "var(--color-gray-1)" }}>Total Sparks</p>

                {profile.bio && (
                  <p className="text-sm mt-3 text-center max-w-xs" style={{ color: "var(--color-gray-1)" }}>
                    {profile.bio}
                  </p>
                )}

                <div className="flex items-center gap-4 mt-3 text-xs" style={{ color: "var(--color-gray-1)" }}>
                  {profile.location && (
                    <span className="flex items-center gap-1">
                      <PinIcon /> {profile.location}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <CalendarIcon /> Joined {formatJoinDate(profile.created_at)}
                  </span>
                </div>

                <button
                  onClick={() => router.push("/profile/edit")}
                  className="mt-5 w-full max-w-xs flex items-center justify-center gap-2 py-2.5 rounded-2xl text-sm font-semibold border"
                  style={{ borderColor: "var(--color-gray-2)" }}
                >
                  <EditIcon /> Edit Profile
                </button>
              </div>

              {/* Overview stats */}
              <div className="px-4 pt-4">
                <div className="grid grid-cols-2 gap-3">
                  <StatCard icon="bolt" value={sparkCount} label="Total Sparks" />
                  <StatCard icon="calendar" value={daysActive(profile.created_at)} label="Days Active" />
                </div>
              </div>

              {/* Quick actions */}
              <div className="px-4 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide mb-2 px-1" style={{ color: "var(--color-gray-1)" }}>
                  Quick Actions
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <QuickAction icon="qr" label="Spark QR Code" onClick={() => setShareOpen(true)} />
                  <QuickAction icon="share" label="Share Profile" onClick={() => setShareOpen(true)} />
                </div>
              </div>

              {/* Menu rows */}
              <div className="px-4 pt-6 space-y-3 pb-6">
                <div className="rounded-2xl overflow-hidden bg-white">
                  <Row icon="star" iconColor="var(--color-orange)" label="Sparks Premium" badge={profile.is_premium ? "Active" : undefined} onClick={() => {}} last />
                </div>
                <div className="rounded-2xl overflow-hidden bg-white">
                  <Row icon="shield" iconColor="var(--color-green)" label="Security Center" onClick={() => router.push("/settings/security")} />
                  <Row icon="pin" iconColor="var(--color-blue)" label="Saved Messages" onClick={() => {}} last />
                </div>
                <div className="rounded-2xl overflow-hidden bg-white">
                  <Row icon="settings" iconColor="var(--color-gray-1)" label="Settings" onClick={() => router.push("/settings")} last />
                </div>
                <div className="rounded-2xl overflow-hidden bg-white">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3.5 active:opacity-70 transition-opacity"
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(255,59,48,0.12)" }}
                    >
                      <LogoutIcon />
                    </div>
                    <span className="text-sm font-medium" style={{ color: "var(--color-red)" }}>
                      Log Out
                    </span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
        <BottomNav />
      </div>

      {profile && (
        <ShareProfileSheet
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          userId={profile.id}
          username={profile.username}
        />
      )}
    </ScreenContainer>
  );
}

function StatCard({ icon, value, label }: { icon: "bolt" | "calendar"; value: number; label: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 flex flex-col items-center">
      {icon === "bolt" ? <BoltIcon large /> : <CalendarIcon large />}
      <span className="text-xl font-bold mt-1.5">{value.toLocaleString()}</span>
      <span className="text-xs mt-0.5" style={{ color: "var(--color-gray-1)" }}>{label}</span>
    </div>
  );
}

function QuickAction({ icon, label, onClick }: { icon: "qr" | "share"; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-2xl bg-white p-4 flex items-center gap-2.5 active:opacity-70 transition-opacity">
      {icon === "qr" ? <QrIcon /> : <ShareIcon />}
      <span className="text-sm font-medium text-left">{label}</span>
    </button>
  );
}

function VerifiedBadge() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--color-blue)" aria-label="Verified">
      <path d="M12 2l2.4 2.2 3.2-.6.9 3.1 3 1.4-1 3.1 1 3.1-3 1.4-.9 3.1-3.2-.6L12 21l-2.4-2.2-3.2.6-.9-3.1-3-1.4 1-3.1-1-3.1 3-1.4.9-3.1 3.2.6z" />
      <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BoltIcon({ large }: { large?: boolean }) {
  const s = large ? 20 : 18;
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="var(--color-blue)"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>;
}
function CalendarIcon({ large }: { large?: boolean }) {
  const s = large ? 20 : 12;
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="var(--color-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>;
}
function PinIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-gray-1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>;
}
function EditIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-black)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>;
}
function QrIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><line x1="14" y1="14" x2="14" y2="21" /><line x1="21" y1="14" x2="21" y2="14.01" /><line x1="14" y1="17.5" x2="17.5" y2="17.5" /><line x1="17.5" y1="14" x2="21" y2="17.5" /><line x1="14" y1="21" x2="21" y2="21" /></svg>;
}
function ShareIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>;
}

interface RowProps {
  icon: "star" | "shield" | "pin" | "settings";
  iconColor: string;
  label: string;
  badge?: string;
  onClick: () => void;
  last?: boolean;
}

function Row({ icon, iconColor, label, badge, onClick, last }: RowProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 active:opacity-70 transition-opacity ${last ? "" : "border-b"}`}
      style={{ borderColor: "var(--color-gray-2)" }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${iconColor}20` }}
      >
        <RowIcon name={icon} color={iconColor} />
      </div>
      <span className="flex-1 text-sm font-medium text-left">{label}</span>
      {badge && (
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full mr-1"
          style={{ background: "rgba(52,199,89,0.15)", color: "var(--color-green)" }}
        >
          {badge}
        </span>
      )}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-gray-1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  );
}

function RowIcon({ name, color }: { name: RowProps["icon"]; color: string }) {
  const c = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (name) {
    case "star": return <svg {...c} fill={color}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>;
    case "shield": return <svg {...c}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
    case "pin": return <svg {...c}><line x1="12" y1="17" x2="12" y2="22" /><path d="M5 17h14v-1.76a2 2 0 00-1.11-1.79l-1.78-.9A2 2 0 0115 10.76V6h1a2 2 0 000-4H8a2 2 0 000 4h1v4.76a2 2 0 01-1.11 1.79l-1.78.9A2 2 0 005 15.24V17z" /></svg>;
    case "settings": return <svg {...c}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>;
  }
}

function LogoutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
