"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Zap, Calendar, MapPin, Pencil, QrCode, Share2, Star, ShieldCheck, Pin, Settings, LogOut, ChevronRight } from "lucide-react";
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
    <div className="h-full w-full bg-white">
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
                  {profile.is_verified && <BadgeCheck size={18} fill="var(--color-blue)" color="white" />}
                </div>

                {profile.username && (
                  <p className="text-sm mt-0.5" style={{ color: "var(--color-blue)" }}>
                    @{profile.username}
                  </p>
                )}

                <div className="mt-4 flex items-center gap-1.5">
                  <Zap size={18} fill="var(--color-blue)" color="var(--color-blue)" />
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
                      <MapPin size={12} strokeWidth={1.8} /> {profile.location}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar size={12} strokeWidth={1.8} /> Joined {formatJoinDate(profile.created_at)}
                  </span>
                </div>

                <button
                  onClick={() => router.push("/profile/edit")}
                  className="mt-5 w-full max-w-xs flex items-center justify-center gap-2 py-2.5 rounded-2xl text-sm font-semibold border"
                  style={{ borderColor: "var(--color-gray-2)" }}
                >
                  <Pencil size={15} strokeWidth={1.8} /> Edit Profile
                </button>
              </div>

              {/* Overview stats */}
              <div className="px-4 pt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-white p-4 flex flex-col items-center">
                    <Zap size={20} fill="var(--color-blue)" color="var(--color-blue)" />
                    <span className="text-xl font-bold mt-1.5">{sparkCount.toLocaleString()}</span>
                    <span className="text-xs mt-0.5" style={{ color: "var(--color-gray-1)" }}>Total Sparks</span>
                  </div>
                  <div className="rounded-2xl bg-white p-4 flex flex-col items-center">
                    <Calendar size={20} color="var(--color-blue)" strokeWidth={1.8} />
                    <span className="text-xl font-bold mt-1.5">{daysActive(profile.created_at).toLocaleString()}</span>
                    <span className="text-xs mt-0.5" style={{ color: "var(--color-gray-1)" }}>Days Active</span>
                  </div>
                </div>
              </div>

              {/* Quick actions */}
              <div className="px-4 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide mb-2 px-1" style={{ color: "var(--color-gray-1)" }}>
                  Quick Actions
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setShareOpen(true)} className="rounded-2xl bg-white p-4 flex items-center gap-2.5 active:opacity-70 transition-opacity">
                    <QrCode size={20} color="var(--color-blue)" strokeWidth={1.8} />
                    <span className="text-sm font-medium text-left">Spark QR Code</span>
                  </button>
                  <button onClick={() => setShareOpen(true)} className="rounded-2xl bg-white p-4 flex items-center gap-2.5 active:opacity-70 transition-opacity">
                    <Share2 size={20} color="var(--color-blue)" strokeWidth={1.8} />
                    <span className="text-sm font-medium text-left">Share Profile</span>
                  </button>
                </div>
              </div>

              {/* Menu rows */}
              <div className="px-4 pt-6 space-y-3 pb-6">
                <div className="rounded-2xl overflow-hidden bg-white">
                  <Row icon={Star} iconColor="var(--color-orange)" filled label="Sparks Premium" badge={profile.is_premium ? "Active" : undefined} onClick={() => {}} last />
                </div>
                <div className="rounded-2xl overflow-hidden bg-white">
                  <Row icon={ShieldCheck} iconColor="var(--color-green)" label="Security Center" onClick={() => router.push("/settings/security")} />
                  <Row icon={Pin} iconColor="var(--color-blue)" label="Saved Messages" onClick={() => {}} last />
                </div>
                <div className="rounded-2xl overflow-hidden bg-white">
                  <Row icon={Settings} iconColor="var(--color-gray-1)" label="Settings" onClick={() => router.push("/settings")} last />
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
                      <LogOut size={18} color="var(--color-red)" strokeWidth={1.8} />
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
    </div>
  );
}

interface RowProps {
  icon: import("lucide-react").LucideIcon;
  iconColor: string;
  label: string;
  badge?: string;
  onClick: () => void;
  last?: boolean;
  filled?: boolean;
}

function Row({ icon: Icon, iconColor, label, badge, onClick, last, filled }: RowProps) {
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
        <Icon size={18} color={iconColor} fill={filled ? iconColor : "none"} strokeWidth={1.8} />
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
      <ChevronRight size={16} color="var(--color-gray-1)" strokeWidth={1.8} />
    </button>
  );
}
