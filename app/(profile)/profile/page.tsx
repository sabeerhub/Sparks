"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { StatusBar } from "@/components/layout/StatusBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Avatar } from "@/components/ui/Avatar";
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
          className="w-20 h-20 rounded-full animate-pulse mb-3"
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

export default function ProfilePage() {
  const router = useRouter();
  const { logout } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sparkCount, setSparkCount] = useState(0);
  const [loading, setLoading] = useState(true);

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
          {loading ? (
            <ProfileSkeleton />
          ) : (
            <>
              {/* Header card */}
              <div className="flex flex-col items-center py-8 px-5 bg-white">
                <Avatar
                  name={profile?.full_name ?? "?"}
                  src={profile?.avatar_url}
                  size={80}
                  online
                />

                <div className="flex items-center gap-1.5 mt-3">
                  <h2 className="text-xl font-bold text-center">
                    {profile?.full_name ?? "—"}
                  </h2>
                  {profile?.is_verified && <VerifiedBadge />}
                  {profile?.is_premium && <PremiumBadge />}
                </div>

                {profile?.username && (
                  <p className="text-sm mt-0.5" style={{ color: "var(--color-blue)" }}>
                    @{profile.username}
                  </p>
                )}
                {profile?.bio && (
                  <p
                    className="text-sm mt-2 text-center max-w-xs"
                    style={{ color: "var(--color-gray-1)" }}
                  >
                    {profile.bio}
                  </p>
                )}

                <button
                  onClick={() => {}}
                  className="mt-3 text-sm font-semibold"
                  style={{ color: "var(--color-gray-1)" }}
                >
                  <span style={{ color: "var(--color-black)" }}>{sparkCount}</span> Sparks
                </button>

                {/* Action buttons: call / video / shared media */}
                <div className="flex items-center gap-3 mt-5">
                  <ActionButton icon="phone" label="Audio" onClick={() => alert("Voice calls are coming in a future update.")} />
                  <ActionButton icon="video" label="Video" onClick={() => alert("Video calls are coming in a future update.")} />
                  <ActionButton icon="media" label="Media" onClick={() => router.push("/profile/media")} />
                </div>
              </div>

              {/* Menu rows */}
              <div className="px-4 pt-4 space-y-3 pb-6">
                <div className="rounded-2xl overflow-hidden bg-white">
                  <Row icon="edit" iconColor="var(--color-blue)" label="Edit Profile" onClick={() => router.push("/profile/edit")} />
                  <Row icon="star" iconColor="var(--color-orange)" label="Sparks Premium" badge={profile?.is_premium ? "Active" : undefined} onClick={() => {}} last />
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
    </ScreenContainer>
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

function PremiumBadge() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--color-orange)" aria-label="Premium">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

interface ActionButtonProps {
  icon: "phone" | "video" | "media";
  label: string;
  onClick: () => void;
}

function ActionButton({ icon, label, onClick }: ActionButtonProps) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 active:opacity-60 transition-opacity">
      <div
        className="w-11 h-11 rounded-full flex items-center justify-center"
        style={{ background: "var(--color-gray-2)" }}
      >
        <ActionIcon name={icon} />
      </div>
      <span className="text-xs font-medium" style={{ color: "var(--color-gray-1)" }}>{label}</span>
    </button>
  );
}

function ActionIcon({ name }: { name: ActionButtonProps["icon"] }) {
  const c = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "var(--color-blue)", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (name) {
    case "phone": return <svg {...c}><path d="M22 16.92v3a2 2 0 01-2.18 2A19.79 19.79 0 013.07 9.8 19.79 19.79 0 01.18 2 2 2 0 012 .18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z" /></svg>;
    case "video": return <svg {...c}><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg>;
    case "media": return <svg {...c}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>;
  }
}

interface RowProps {
  icon: "edit" | "star" | "shield" | "pin" | "settings";
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
    case "edit": return <svg {...c}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>;
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
