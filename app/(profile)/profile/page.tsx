"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Zap, Calendar, MapPin, QrCode, Share2, Star, ShieldCheck, Pin, Settings, LogOut, ChevronRight, Image as ImageIcon } from "lucide-react";
import { StatusBar } from "@/components/layout/StatusBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Avatar } from "@/components/ui/Avatar";
import { ShareProfileSheet } from "@/components/profile/ShareProfileSheet";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase";
import { getSparkConnectionsCount } from "@/services/chat-service";
import type { Profile } from "@/types";

const supabase = createClient();

function ProfileSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-32 w-full" style={{ background: "var(--color-gray-3)" }} />
      <div className="px-5 pt-14">
        <div className="h-5 w-36 rounded-full mb-2" style={{ background: "var(--color-gray-3)" }} />
        <div className="h-4 w-24 rounded-full" style={{ background: "var(--color-gray-3)" }} />
      </div>
    </div>
  );
}

function daysActive(createdAt: string | undefined): number {
  if (!createdAt) return 0;
  const created = new Date(createdAt).getTime();
  return Math.max(1, Math.floor((Date.now() - created) / (1000 * 60 * 60 * 24)));
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
      getSparkConnectionsCount(user.id).then(setSparkCount);
      setLoading(false);
    })();
  }, [router]);

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  return (
    <div className="h-full w-full flex flex-col" style={{ background: "var(--color-gray-2)" }}>
      <StatusBar />
      <div className="flex-1 overflow-y-auto">
        <div className="w-full max-w-4xl mx-auto bg-white min-h-full">
          {loading || !profile ? (
            <ProfileSkeleton />
          ) : (
            <>
              {/* Banner + avatar */}
              <div className="relative">
                <div className="h-32 w-full" style={{ background: "linear-gradient(120deg, var(--color-blue), var(--color-orange))" }} />
                <div className="absolute left-5 bottom-0 translate-y-1/2">
                  <div
                    className="rounded-full p-1 bg-white"
                    style={profile.is_premium ? { background: "linear-gradient(135deg, var(--color-orange), var(--color-blue))" } : undefined}
                  >
                    <div className="rounded-full ring-4 ring-white">
                      <Avatar name={profile.full_name ?? "?"} src={profile.avatar_url} size={88} />
                    </div>
                  </div>
                </div>
                <div className="absolute right-4 bottom-0 translate-y-1/2">
                  <button
                    onClick={() => router.push("/profile/edit")}
                    className="px-4 py-2 rounded-full text-sm font-semibold border bg-white"
                    style={{ borderColor: "var(--color-gray-3)" }}
                  >
                    Edit Profile
                  </button>
                </div>
              </div>

              {/* Identity block */}
              <div className="px-5 pt-14">
                <div className="flex items-center gap-1.5">
                  <h2 className="text-xl font-bold">{profile.full_name ?? "—"}</h2>
                  {profile.is_verified && <BadgeCheck size={18} fill="var(--color-blue)" color="white" />}
                </div>
                {profile.username && (
                  <p className="text-sm" style={{ color: "var(--color-gray-1)" }}>@{profile.username}</p>
                )}

                {profile.bio && (
                  <p className="text-sm mt-3" style={{ color: "var(--color-black)" }}>{profile.bio}</p>
                )}

                <div className="flex items-center gap-4 mt-3 text-sm" style={{ color: "var(--color-gray-1)" }}>
                  {profile.location && (
                    <span className="flex items-center gap-1">
                      <MapPin size={14} strokeWidth={1.8} /> {profile.location}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar size={14} strokeWidth={1.8} /> Joined {formatJoinDate(profile.created_at)}
                  </span>
                </div>

                <div className="flex items-center gap-4 mt-3">
                  <span className="flex items-center gap-1 text-sm">
                    <Zap size={15} fill="var(--color-blue)" color="var(--color-blue)" />
                    <span className="font-bold">{sparkCount.toLocaleString()}</span>
                    <span style={{ color: "var(--color-gray-1)" }}>Total Sparks</span>
                  </span>
                  <span className="flex items-center gap-1 text-sm">
                    <Calendar size={14} strokeWidth={1.8} color="var(--color-gray-1)" />
                    <span className="font-bold">{daysActive(profile.created_at).toLocaleString()}</span>
                    <span style={{ color: "var(--color-gray-1)" }}>Days Active</span>
                  </span>
                </div>

                <div className="flex gap-2 mt-4 pb-4">
                  <button
                    onClick={() => setShareOpen(true)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-sm font-medium border"
                    style={{ borderColor: "var(--color-gray-3)" }}
                  >
                    <QrCode size={16} color="var(--color-blue)" strokeWidth={1.8} /> QR Code
                  </button>
                  <button
                    onClick={() => setShareOpen(true)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-sm font-medium border"
                    style={{ borderColor: "var(--color-gray-3)" }}
                  >
                    <Share2 size={16} color="var(--color-blue)" strokeWidth={1.8} /> Share
                  </button>
                </div>
              </div>

              {/* Tab bar */}
              <div className="flex border-t border-b" style={{ borderColor: "var(--color-gray-2)" }}>
                <div className="flex-1 flex items-center justify-center gap-1.5 py-3 border-b-2" style={{ borderColor: "var(--color-blue)" }}>
                  <ImageIcon size={16} color="var(--color-blue)" strokeWidth={1.8} />
                  <span className="text-sm font-semibold" style={{ color: "var(--color-blue)" }}>Media</span>
                </div>
              </div>

              {/* Media tab content */}
              <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
                <ImageIcon size={36} color="var(--color-gray-3)" strokeWidth={1.5} />
                <p className="font-semibold mt-4 mb-1">No media yet</p>
                <p className="text-sm" style={{ color: "var(--color-gray-1)" }}>
                  Photos and files shared in your chats will appear here.
                </p>
              </div>

              {/* Account menu */}
              <div className="px-5 pb-8">
                <Row icon={Star} iconColor="var(--color-orange)" filled label="Sparks Premium" badge={profile.is_premium ? "Active" : undefined} onClick={() => {}} />
                <Row icon={ShieldCheck} iconColor="var(--color-green)" label="Security Center" onClick={() => router.push("/settings/security")} />
                <Row icon={Pin} iconColor="var(--color-blue)" label="Saved Messages" onClick={() => {}} />
                <Row icon={Settings} iconColor="var(--color-gray-1)" label="Settings" onClick={() => router.push("/settings")} />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 py-3.5 active:opacity-70 transition-opacity"
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,59,48,0.12)" }}>
                    <LogOut size={18} color="var(--color-red)" strokeWidth={1.8} />
                  </div>
                  <span className="text-sm font-medium" style={{ color: "var(--color-red)" }}>Log Out</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      <div className="md:hidden">
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
  filled?: boolean;
}

function Row({ icon: Icon, iconColor, label, badge, onClick, filled }: RowProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 py-3.5 border-b active:opacity-70 transition-opacity"
      style={{ borderColor: "var(--color-gray-2)" }}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${iconColor}20` }}>
        <Icon size={18} color={iconColor} fill={filled ? iconColor : "none"} strokeWidth={1.8} />
      </div>
      <span className="flex-1 text-sm font-medium text-left">{label}</span>
      {badge && (
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full mr-1" style={{ background: "rgba(52,199,89,0.15)", color: "var(--color-green)" }}>
          {badge}
        </span>
      )}
      <ChevronRight size={16} color="var(--color-gray-1)" strokeWidth={1.8} />
    </button>
  );
}
